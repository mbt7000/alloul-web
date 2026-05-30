"""
Work Summary Agent — Multi-tenant AI work summarization
- Stores all work in English (universal storage language)
- Responds in the same language as the question
- Strict company isolation: no data leaks between companies
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger("alloul.work_agent")

SYSTEM_PROMPT = """You are an official Work Summary Agent for a multi-company platform.

## STORAGE RULE (Critical — never break this):
- ALL work data must be stored and processed in English ONLY
- Translate any non-English work submission to English before storing
- The database language is always English

## LANGUAGE RULE:
- Detect the language of the employee's MESSAGE or QUESTION
- Always respond in that exact same language
- Arabic question → Arabic answer (but underlying data is English)
- English question → English answer
- Never switch language unless explicitly asked

## ISOLATION RULE (Security — never break this):
- You only see data for ONE company at a time
- Never reference or compare with other companies
- Never reveal that other companies exist

## YOUR TASKS:

### Receiving new work:
Return a JSON object (no markdown, raw JSON only):
{
  "employee_name": "extracted name in English",
  "task_en": "task description translated to English",
  "status": "in_progress | completed | pending",
  "priority": "high | medium | low",
  "original_language": "ar | en | fr | ...",
  "ai_summary_en": "concise English summary 1-2 sentences",
  "confirmation": "confirmation message in the SAME language as the input"
}

### Answering questions about work:
- Pull from provided English context
- Answer in the SAME language as the question
- Be specific: who did what, when, current status
- Use emojis for clarity: ✅ completed, 🔄 in progress, ⏳ pending

### Generating handover report:
Format in English (it will be translated per employee later):
📋 Work Handover — [Company] — [DateTime]

✅ COMPLETED:
• [Task] — [Employee] — [Time]

🔄 IN PROGRESS:
• [Task] — [Employee] — [Priority]

⏳ PENDING:
• [Task] — [Employee] — [Priority]

📊 Summary: X completed, Y in progress, Z pending
Last update: [Employee] at [Time]
"""


class WorkSummaryAgent:

    def __init__(self):
        from services.claude_client import claude_client
        self._claude = claude_client

    async def receive_work(
        self,
        db: Session,
        company_id: int,
        user_id: int,
        employee_name: str,
        work_text: str,
    ) -> dict:
        """Accept new work submission, translate to English, store, confirm in original language."""
        from models import WorkLog

        result = await self._claude.chat(
            messages=[{
                "role": "user",
                "content": (
                    f"New work submission received.\n"
                    f"Employee: {employee_name}\n"
                    f"Work submitted: {work_text}\n\n"
                    f"Process this as a new work entry. Return raw JSON only."
                ),
            }],
            system_prompt=SYSTEM_PROMPT,
            max_tokens=1024,
            temperature=0.2,
        )

        try:
            data = json.loads(result["content"])
        except json.JSONDecodeError:
            import re
            match = re.search(r'\{.*\}', result["content"], re.DOTALL)
            data = json.loads(match.group()) if match else {}

        log = WorkLog(
            company_id=company_id,
            user_id=user_id,
            employee_name=data.get("employee_name", employee_name),
            task_en=data.get("task_en", work_text),
            status=data.get("status", "in_progress"),
            priority=data.get("priority", "medium"),
            original_language=data.get("original_language", "ar"),
            original_text=work_text,
            ai_summary_en=data.get("ai_summary_en", ""),
        )
        db.add(log)
        db.commit()
        db.refresh(log)

        logger.info("WorkLog created: company=%d, employee=%s, id=%d", company_id, employee_name, log.id)

        return {
            "log_id": log.id,
            "confirmation": data.get("confirmation", "✅ Work received and saved."),
            "summary_en": log.ai_summary_en,
            "status": log.status,
            "priority": log.priority,
        }

    async def answer_question(
        self,
        db: Session,
        company_id: int,
        question: str,
        limit: int = 50,
    ) -> str:
        """Answer a work-related question using company data only."""
        from models import WorkLog

        logs = (
            db.query(WorkLog)
            .filter(WorkLog.company_id == company_id)
            .order_by(WorkLog.created_at.desc())
            .limit(limit)
            .all()
        )

        context_items = []
        for log in logs:
            context_items.append(
                f"- [{log.status.upper()}] {log.task_en} "
                f"| Employee: {log.employee_name} "
                f"| Priority: {log.priority} "
                f"| Date: {log.created_at.strftime('%Y-%m-%d %H:%M') if log.created_at else 'N/A'}"
            )
        context = "\n".join(context_items) if context_items else "No work logs found."

        result = await self._claude.chat(
            messages=[{
                "role": "user",
                "content": (
                    f"Question from employee: {question}\n\n"
                    f"Company work data (English):\n{context}\n\n"
                    f"Answer the question in the SAME language as the question above."
                ),
            }],
            system_prompt=SYSTEM_PROMPT,
            max_tokens=1024,
            temperature=0.3,
        )

        return result["content"]

    async def generate_handover(
        self,
        db: Session,
        company_id: int,
        company_name: str,
        response_language: str = "en",
        trigger: str = "scheduled",
    ) -> str:
        """Generate a full handover report for a company."""
        from models import WorkLog, HandoverLog

        logs = (
            db.query(WorkLog)
            .filter(WorkLog.company_id == company_id)
            .order_by(WorkLog.created_at.desc())
            .limit(100)
            .all()
        )

        if not logs:
            no_data = {
                "ar": "📋 لا توجد أعمال مسجلة حتى الآن.",
                "en": "📋 No work logs found yet.",
                "fr": "📋 Aucun travail enregistré pour l'instant.",
            }
            return no_data.get(response_language, no_data["en"])

        context_items = []
        for log in logs:
            context_items.append(
                f"[{log.status.upper()}] {log.task_en} "
                f"| {log.employee_name} | {log.priority} priority "
                f"| {log.created_at.strftime('%Y-%m-%d %H:%M') if log.created_at else ''}"
            )
        context = "\n".join(context_items)

        lang_instruction = {
            "ar": "Translate the entire handover report to Arabic.",
            "en": "Write the handover report in English.",
            "fr": "Translate the entire handover report to French.",
        }.get(response_language, "Write in English.")

        result = await self._claude.chat(
            messages=[{
                "role": "user",
                "content": (
                    f"Generate a complete handover report.\n"
                    f"Company: {company_name}\n"
                    f"DateTime: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
                    f"Trigger: {trigger}\n\n"
                    f"Work data:\n{context}\n\n"
                    f"{lang_instruction}"
                ),
            }],
            system_prompt=SYSTEM_PROMPT,
            max_tokens=2048,
            temperature=0.3,
        )

        handover_text = result["content"]

        handover_log = HandoverLog(
            company_id=company_id,
            content_en=handover_text,
            trigger=trigger,
        )
        db.add(handover_log)
        db.commit()

        return handover_text

    async def get_shift_summary(
        self,
        db: Session,
        company_id: int,
        response_language: str = "ar",
    ) -> str:
        """Quick shift-change summary — open tasks only."""
        from models import WorkLog

        open_logs = (
            db.query(WorkLog)
            .filter(
                WorkLog.company_id == company_id,
                WorkLog.status.in_(["in_progress", "pending"]),
            )
            .order_by(WorkLog.priority.desc(), WorkLog.created_at.desc())
            .limit(30)
            .all()
        )

        if not open_logs:
            msgs = {
                "ar": "✅ لا توجد مهام مفتوحة — الشفت نظيف.",
                "en": "✅ No open tasks — clean shift handover.",
            }
            return msgs.get(response_language, msgs["en"])

        context = "\n".join([
            f"[{l.status.upper()}] {l.task_en} | {l.employee_name} | {l.priority}"
            for l in open_logs
        ])

        lang_instruction = (
            "Respond in Arabic." if response_language == "ar" else "Respond in English."
        )

        result = await self._claude.chat(
            messages=[{
                "role": "user",
                "content": (
                    f"Generate a quick shift-change summary.\n"
                    f"Open tasks only:\n{context}\n\n"
                    f"List tasks by priority. Keep it brief and clear. {lang_instruction}"
                ),
            }],
            system_prompt=SYSTEM_PROMPT,
            max_tokens=1024,
            temperature=0.2,
        )

        return result["content"]


work_agent = WorkSummaryAgent()
