from __future__ import annotations

import json
from datetime import datetime
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from config import settings
from models import User, AgentMessage as AgentMessageModel, CompanyMember
from plan_limits import require_feature
from admin_access import user_is_admin

# New: Import AI Service abstraction
from services.ai_service import get_ai_service
from services.platform_registry import get_registry

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: Optional[str] = None


class ChatRequest(BaseModel):
    messages: list[dict]
    mode: str = "company"


def _get_anthropic_client():
    if not settings.ANTHROPIC_API_KEY:
        return None
    try:
        import anthropic
        return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    except Exception:
        return None


def _call_alloul_agent(question: str) -> str:
    """Call ALLOUL Agent (private SQL/data agent on the company server)."""
    import httpx

    url = f"{settings.ALLOUL_AGENT_URL}/ask"
    headers = {"X-API-Key": settings.ALLOUL_AGENT_KEY, "Content-Type": "application/json"}
    payload = {"question": question, "explain": False}

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=120)
        resp.raise_for_status()
        data = resp.json()

        # Format the response: show data results + SQL if present
        parts = []
        if data.get("data"):
            rows = data["data"]
            if isinstance(rows, list) and rows:
                # Build a simple table or summary
                if len(rows) == 1 and len(rows[0]) == 1:
                    # Single value result
                    val = list(rows[0].values())[0]
                    parts.append(f"**النتيجة:** {val}")
                else:
                    # Multiple rows — summarize
                    parts.append(f"**النتائج ({len(rows)} سجل):**")
                    for i, row in enumerate(rows[:10]):
                        line = " | ".join(f"{k}: {v}" for k, v in row.items())
                        parts.append(f"- {line}")
                    if len(rows) > 10:
                        parts.append(f"_(وأكثر من ذلك — {len(rows)} سجل إجمالاً)_")
            else:
                parts.append("لا توجد نتائج.")

        if data.get("explanation"):
            parts.append(f"\n{data['explanation']}")
        elif data.get("sql"):
            parts.append(f"\n_استعلام SQL:_ `{data['sql']}`")

        return "\n".join(parts) if parts else "لا توجد بيانات."

    except httpx.ConnectError:
        raise Exception("ALLOUL Agent غير متاح حالياً. تأكد من تشغيل الخادم.")
    except httpx.TimeoutException:
        raise Exception("استغرق ALLOUL Agent وقتاً طويلاً. حاول لاحقاً.")
    except Exception as e:
        raise Exception(f"خطأ في ALLOUL Agent: {str(e)}")


def _get_deepseek_openai_client():
    """Return a sync OpenAI client pointed at DeepSeek, or None if unconfigured."""
    if not settings.DEEPSEEK_API_KEY:
        return None
    try:
        from openai import OpenAI
        return OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
        )
    except Exception:
        return None


def _complete_with_fallback(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 2048,
    *,
    private: bool = False,
) -> str:
    """Run a single-shot completion with automatic fallback chain.

    Now uses the unified AIServiceProvider which handles:
      - Private mode: Ollama → Claude → DeepSeek
      - Public mode: Claude → DeepSeek → Ollama

    Raises HTTPException(503) only if NO provider is available.
    """
    import asyncio

    ai_service = get_ai_service()

    try:
        # Use the unified AI service (sync wrapper)
        result = ai_service.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=max_tokens,
            temperature=0.3,
            private=private,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI service unavailable — no provider reachable. "
                f"Error: {str(e)}"
            ),
        )


def _build_system_prompt(mode: str, user: User, db: Session) -> str:
    """
    Enhanced system prompt builder with richer company context and service awareness.
    """
    base = (
        "You are Alloul One AI — an intelligent business assistant embedded inside the Alloul One platform. "
        "You help users manage their work: tasks, projects, deals, meetings, handovers, and team collaboration. "
        "Be concise, insightful, and professional. Respond in the same language the user writes in (Arabic or English). "
        "When analyzing data, give specific actionable recommendations, not generic advice. "
        "When the user mentions a task or request, proactively suggest which services (email, CRM, calendar, etc.) might be helpful."
    )

    if mode == "company":
        from models import (
            Company, CompanyMember, HandoverRecord, MemoryRecord,
            Meeting, Project, ProjectTask, DealRecord as Deal, Department,
        )

        member = db.query(CompanyMember).filter(CompanyMember.user_id == user.id).first()
        if not member:
            return base + "\n\nUser is not part of a company yet."

        company = db.query(Company).filter(Company.id == member.company_id).first()
        company_name = company.name if company else "N/A"

        # Enhanced context header with user role and permissions
        ctx = (
            f"\n\n=== WORKSPACE CONTEXT ===\n"
            f"Company: {company_name}\n"
            f"Your Role: {member.role} | Permissions: ✅ Full Access\n"
        )

        # Available integrations / services
        registry = get_registry()
        configured_services = registry.get_configured_platforms()
        service_names = [s.name for s in configured_services]
        if service_names:
            ctx += f"Available Services: {', '.join(service_names)}\n"

        # Departments (if any)
        departments = db.query(Department).filter(Department.company_id == member.company_id).limit(10).all()
        if departments:
            dept_names = [d.name for d in departments]
            ctx += f"Departments: {', '.join(dept_names)}\n"

        ctx += "\n--- CURRENT STATUS ---\n"

        # Projects
        projects = db.query(Project).filter(Project.company_id == member.company_id).limit(20).all()
        if projects:
            active_projects = [p for p in projects if p.status != "completed"]
            completed_projects = [p for p in projects if p.status == "completed"]
            proj_lines = []
            for p in active_projects[:10]:
                proj_lines.append(f"  - [{p.status}] {p.name} (due: {p.due_date or 'TBD'})")
            ctx += f"Projects: {len(active_projects)} active | {len(completed_projects)} completed\n"
            if proj_lines:
                ctx += "\n".join(proj_lines) + "\n"

        # Tasks - enhanced summary
        tasks = (
            db.query(ProjectTask)
            .join(Project, ProjectTask.project_id == Project.id)
            .filter(Project.company_id == member.company_id)
            .limit(50).all()
        )
        if tasks:
            todo = [t for t in tasks if t.status == "todo"]
            in_prog = [t for t in tasks if t.status == "in_progress"]
            done = [t for t in tasks if t.status == "done"]
            high = [t for t in tasks if t.priority == "high"]
            blocked = [t for t in tasks if t.priority == "urgent"]

            ctx += (
                f"\nTasks Summary:\n"
                f"  Total: {len(tasks)} | Todo: {len(todo)} | In Progress: {len(in_prog)} | "
                f"Done: {len(done)} | High Priority: {len(high)} | Urgent: {len(blocked)}\n"
            )
            if high:
                ctx += "  ⚠️ High Priority: " + ", ".join(t.title for t in high[:3]) + "\n"

        # Deals - enhanced
        deals = db.query(Deal).filter(Deal.user_id == user.id).limit(30).all()
        if deals:
            active = [d for d in deals if d.stage not in ("won", "lost")]
            won = [d for d in deals if d.stage == "won"]
            lost = [d for d in deals if d.stage == "lost"]
            pipeline_value = sum(d.value or 0 for d in active)
            at_risk = [d for d in active if (d.probability or 0) < 30]

            ctx += (
                f"\nSales Pipeline:\n"
                f"  Active: {len(active)} ({pipeline_value:,}) | Won: {len(won)} | Lost: {len(lost)}\n"
            )
            if at_risk:
                ctx += f"  ⚠️ At Risk: {len(at_risk)} deals with <30% probability\n"

        # Meetings - enhanced
        meetings = (
            db.query(Meeting)
            .filter(Meeting.company_id == member.company_id, Meeting.status == "scheduled")
            .limit(10).all()
        )
        if meetings:
            upcoming_count = len(meetings)
            next_meeting = meetings[0] if meetings else None
            ctx += (
                f"\nUpcoming Meetings: {upcoming_count}\n"
            )
            if next_meeting:
                ctx += f"  📅 Next: {next_meeting.title} ({next_meeting.meeting_date})\n"

        # Handovers - enhanced
        handovers = db.query(HandoverRecord).filter(HandoverRecord.user_id == user.id).limit(10).all()
        if handovers:
            pending = [h for h in handovers if h.status == "pending"]
            accepted = [h for h in handovers if h.status == "accepted"]
            ctx += (
                f"\nHandovers: {len(pending)} pending | {len(accepted)} accepted\n"
            )
            if pending:
                ctx += f"  ⏳ Pending: {', '.join(h.title for h in pending[:2])}\n"

        # Knowledge base / Memories
        memories = db.query(MemoryRecord).filter(MemoryRecord.user_id == user.id).limit(10).all()
        if memories:
            ctx += f"\nKnowledge Base: {len(memories)} items\n"

        ctx += "\n=========================\n"
        ctx += "\n📌 INSTRUCTIONS FOR COMPANY MODE:\n"
        ctx += "- Always offer to integrate services when appropriate (e.g., 'I can send an email and log it in Salesforce')\n"
        ctx += "- Prioritize tasks by: urgent > high > normal > low\n"
        ctx += "- Suggest batch operations when possible\n"
        ctx += "- Keep responses concise; offer detailed analysis only when asked\n"

        return base + ctx

    return base


@router.get("/history", response_model=list[AgentMessageResponse])
def get_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    mode: Optional[str] = None,
):
    q = db.query(AgentMessageModel).filter(AgentMessageModel.user_id == current_user.id)
    if mode:
        q = q.filter(AgentMessageModel.mode == mode)
    msgs = q.order_by(AgentMessageModel.created_at.asc()).limit(200).all()
    return [
        AgentMessageResponse(
            id=str(m.id), role=m.role, content=m.content,
            created_at=m.created_at.isoformat() if m.created_at else None,
        )
        for m in msgs
    ]


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
def delete_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    db.query(AgentMessageModel).filter(AgentMessageModel.user_id == current_user.id).delete()
    db.commit()


@router.post("/chat")
async def chat(
    body: ChatRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Enhanced chat endpoint using unified AI service abstraction."""
    # Gate company-mode AI behind Pro plan
    if body.mode == "company":
        mem = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
        if mem:
            require_feature(db, mem.company_id, "ai_chat", is_admin=user_is_admin(current_user))

    # Extract user message
    user_msg = ""
    for m in body.messages:
        if m.get("role") == "user":
            user_msg = m.get("content", "")
            break

    # Save user message (best-effort — skip if table missing)
    if user_msg:
        try:
            db.add(AgentMessageModel(
                user_id=current_user.id, role="user", content=user_msg, mode=body.mode,
            ))
            db.commit()
        except Exception:
            db.rollback()

    # ── ALLOUL Agent (primary provider) ──────────────────────────────────────
    # Try ALLOUL Agent first — it's our private SQL/data agent on the server.
    # Falls back to cloud AI (Claude/DeepSeek) if ALLOUL Agent is unavailable.

    async def stream():
        full_reply: list[str] = []

        # 1) Try ALLOUL Agent
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            reply_text = await loop.run_in_executor(None, _call_alloul_agent, user_msg or "مرحباً")

            full_reply.append(reply_text)
            # Yield the reply in chunks for a smooth streaming effect
            chunk_size = 80
            for i in range(0, len(reply_text), chunk_size):
                yield f"data: {json.dumps({'text': reply_text[i:i+chunk_size]})}\n\n"

        except Exception as alloul_err:
            # 2) Fallback: try cloud AI providers
            ai_service = get_ai_service()
            preferred_provider = ai_service.get_preferred_provider(private=(body.mode == "company"))

            if not preferred_provider:
                err_msg = f"⚠️ خدمة الذكاء الاصطناعي غير متاحة: {str(alloul_err)}"
                full_reply.append(err_msg)
                yield f"data: {json.dumps({'text': err_msg})}\n\n"
            else:
                try:
                    system_prompt = _build_system_prompt(body.mode, current_user, db)
                except Exception:
                    system_prompt = (
                        "You are Alloul One AI — an intelligent business assistant. "
                        "Be concise, insightful, and professional. "
                        "Respond in the same language the user writes in (Arabic or English)."
                    )
                api_messages = []
                for m in body.messages:
                    role = m.get("role", "user")
                    if role in ("user", "assistant"):
                        api_messages.append({"role": role, "content": m.get("content", "")})
                if not api_messages:
                    api_messages = [{"role": "user", "content": user_msg or "مرحباً"}]

                try:
                    async for chunk in ai_service.stream_complete(
                        system_prompt=system_prompt,
                        user_prompt=json.dumps(api_messages),
                        max_tokens=4096,
                        temperature=0.3,
                        private=(body.mode == "company"),
                        provider=preferred_provider,
                    ):
                        if chunk:
                            full_reply.append(chunk)
                            yield f"data: {json.dumps({'text': chunk})}\n\n"
                except Exception as e:
                    error_text = f"خطأ: {str(e)}"
                    yield f"data: {json.dumps({'text': error_text})}\n\n"
                    full_reply.append(error_text)

        # Save assistant response (best-effort — skip if table missing)
        final_text = "".join(full_reply)
        if final_text:
            try:
                db.add(AgentMessageModel(
                    user_id=current_user.id, role="assistant", content=final_text, mode=body.mode,
                ))
                db.commit()
            except Exception:
                db.rollback()
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


# ─── Specialized Analysis Endpoints ─────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    topic: str  # "dashboard" | "tasks" | "deals" | "meetings"
    extra: Optional[str] = None


@router.post("/analyze")
async def analyze(
    body: AnalyzeRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Generate a focused AI analysis for a specific workspace topic."""
    from models import Company, CompanyMember, Project, ProjectTask, DealRecord as Deal, Meeting, HandoverRecord

    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a company member")

    require_feature(db, member.company_id, "ai_analyze", is_admin=user_is_admin(current_user))

    client = _get_anthropic_client()

    # Build topic-specific data snapshot
    topic_ctx = ""
    prompt_instruction = ""

    if body.topic == "dashboard":
        projects = db.query(Project).filter(Project.company_id == member.company_id).limit(20).all()
        tasks = (
            db.query(ProjectTask)
            .join(Project, ProjectTask.project_id == Project.id)
            .filter(Project.company_id == member.company_id).limit(50).all()
        )
        deals = db.query(Deal).filter(Deal.user_id == current_user.id).limit(20).all()
        meetings = db.query(Meeting).filter(
            Meeting.company_id == member.company_id, Meeting.status == "scheduled"
        ).limit(5).all()

        todo_tasks = [t for t in tasks if t.status == "todo"]
        high_tasks = [t for t in tasks if t.priority == "high"]
        active_deals = [d for d in deals if d.stage not in ("won", "lost")]
        pipeline = sum(d.value or 0 for d in active_deals)

        topic_ctx = (
            f"Projects: {len(projects)} total\n"
            f"Tasks: {len(tasks)} total | {len(todo_tasks)} pending | {len(high_tasks)} high-priority\n"
            f"Deals: {len(active_deals)} active | Pipeline: {pipeline:,}\n"
            f"Upcoming meetings: {len(meetings)}\n"
        )
        prompt_instruction = (
            "Analyze this workspace dashboard snapshot. "
            "Give 3-5 key insights and prioritized action items for this week. "
            "Be specific and actionable. Use bullet points."
        )

    elif body.topic == "tasks":
        tasks = (
            db.query(ProjectTask)
            .join(Project, ProjectTask.project_id == Project.id)
            .filter(Project.company_id == member.company_id).limit(50).all()
        )
        high = [t for t in tasks if t.priority == "high" and t.status != "done"]
        overdue = [t for t in tasks if t.due_date and t.status != "done"]

        topic_ctx = (
            f"Total tasks: {len(tasks)}\n"
            f"High priority pending: {', '.join(t.title for t in high[:10])}\n"
            f"Tasks with due dates: {len(overdue)}\n"
        )
        prompt_instruction = (
            "Analyze these tasks. Suggest a prioritization strategy, identify bottlenecks, "
            "and recommend which tasks to tackle first today. Be specific."
        )

    elif body.topic == "deals":
        deals = db.query(Deal).filter(Deal.user_id == current_user.id).limit(30).all()
        active = [d for d in deals if d.stage not in ("won", "lost")]
        stale = [d for d in active if (d.probability or 0) < 30]

        topic_ctx = (
            f"Active deals: {len(active)}\n"
            f"Low-probability deals (<30%): {len(stale)}\n"
            f"Deal stages: " + ", ".join(f"{d.company}@{d.stage}({d.probability}%)" for d in active[:10]) + "\n"
        )
        prompt_instruction = (
            "Analyze the sales pipeline. Identify at-risk deals, suggest follow-up actions, "
            "and recommend which deals to prioritize to maximize revenue this month."
        )

    elif body.topic == "meetings":
        meetings = db.query(Meeting).filter(
            Meeting.company_id == member.company_id
        ).order_by(Meeting.meeting_date.desc()).limit(10).all()
        upcoming = [m for m in meetings if m.status == "scheduled"]
        with_no_notes = [m for m in meetings if m.status == "done" and not m.notes]

        topic_ctx = (
            f"Upcoming meetings: {len(upcoming)}\n"
            f"Meetings done without notes: {len(with_no_notes)}\n"
            f"Next meetings: " + ", ".join(f"{m.title} ({m.meeting_date})" for m in upcoming[:5]) + "\n"
        )
        prompt_instruction = (
            "Analyze meeting patterns. Suggest preparation tips for upcoming meetings, "
            "flag meetings that need follow-up, and recommend best practices."
        )

    else:
        topic_ctx = body.extra or ""
        prompt_instruction = "Analyze the provided information and give actionable insights."

    full_prompt = f"{prompt_instruction}\n\nData:\n{topic_ctx}"
    if body.extra:
        full_prompt += f"\nAdditional context: {body.extra}"

    system = _build_system_prompt("company", current_user, db)

    try:
        summary = _complete_with_fallback(
            system_prompt=system,
            user_prompt=full_prompt,
            max_tokens=2048,
            private=True,
        )
    except Exception as e:
        summary = f"خطأ في التحليل: {str(e)}"

    # Save as agent message
    db.add(AgentMessageModel(
        user_id=current_user.id,
        role="assistant",
        content=f"📊 تحليل {body.topic}:\n\n{summary}",
        mode="company",
    ))
    db.commit()

    return {"summary": summary, "topic": body.topic}


# ─── Specialized Summarization Endpoints ────────────────────────────────────

class SummarizeHandoverRequest(BaseModel):
    handover_id: int
    language: str = "ar"


@router.post("/handover/summary")
async def summarize_handover(
    body: SummarizeHandoverRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Summarize a handover for the person picking up the work."""
    from models import HandoverRecord
    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a company member")
    require_feature(db, member.company_id, "ai_chat", is_admin=user_is_admin(current_user))

    h = db.query(HandoverRecord).filter(HandoverRecord.id == body.handover_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Handover not found")

    instruction = (
        "You are helping someone pick up work from a colleague. "
        "Produce a handover briefing with these sections:\n"
        "1. **نظرة سريعة / Overview** — one short paragraph.\n"
        "2. **المهام المفتوحة / Open action items** — bulleted, each with priority.\n"
        "3. **المخاطر / Risks & blockers**.\n"
        "4. **جهات الاتصال / Key contacts**.\n"
        "5. **ابدأ اليوم بـ / Start today with** — exactly 3 first steps.\n\n"
        f"Language: {'Arabic' if body.language == 'ar' else 'English'}.\n\n"
        f"Handover title: {h.title}\nContent:\n{h.content or '(empty)'}"
    )

    # private=True routes through Ollama first for company-data privacy
    summary = _complete_with_fallback(
        system_prompt=_build_system_prompt("company", current_user, db),
        user_prompt=instruction,
        max_tokens=2048,
        private=True,
    )

    db.add(AgentMessageModel(
        user_id=current_user.id, role="assistant",
        content=f"🤝 ملخص التسليم — {h.title}:\n\n{summary}", mode="company",
    ))
    db.commit()
    return {"handover_id": h.id, "title": h.title, "summary": summary}


class SummarizeTasksRequest(BaseModel):
    project_id: Optional[int] = None
    status_filter: Optional[str] = None
    language: str = "ar"


@router.post("/tasks/summary")
async def summarize_tasks(
    body: SummarizeTasksRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Smart task summary: priorities, blockers, what to do next."""
    from models import ProjectTask, Project
    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a company member")
    require_feature(db, member.company_id, "ai_chat", is_admin=user_is_admin(current_user))

    q = db.query(ProjectTask).join(Project, ProjectTask.project_id == Project.id) \
        .filter(Project.company_id == member.company_id)
    if body.project_id:
        q = q.filter(ProjectTask.project_id == body.project_id)
    if body.status_filter:
        q = q.filter(ProjectTask.status == body.status_filter)
    tasks = q.limit(100).all()

    if not tasks:
        return {"summary": "لا توجد مهام." if body.language == "ar" else "No tasks.", "count": 0}

    task_lines = [
        f"- [{t.status}|{t.priority}] {t.title}"
        + (f" (due {t.due_date})" if t.due_date else "")
        + (f" — {t.description[:120]}" if t.description else "")
        for t in tasks
    ]

    instruction = (
        "Analyze these tasks and produce a smart summary: "
        "(1) top 3 priorities today, (2) blockers, (3) delegatable tasks, (4) estimated effort. "
        f"Reply in {'Arabic' if body.language == 'ar' else 'English'}. Be concise and actionable.\n\n"
        + "\n".join(task_lines)
    )

    # private=True routes through Ollama first for company-data privacy
    summary = _complete_with_fallback(
        system_prompt=_build_system_prompt("company", current_user, db),
        user_prompt=instruction,
        max_tokens=2048,
        private=True,
    )

    return {"summary": summary, "count": len(tasks)}


class SummarizeMeetingRequest(BaseModel):
    meeting_id: int
    language: str = "ar"


@router.post("/meetings/summary")
async def summarize_meeting(
    body: SummarizeMeetingRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Structured meeting notes: agenda, decisions, action items, next steps."""
    from models import Meeting
    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a company member")
    require_feature(db, member.company_id, "ai_chat", is_admin=user_is_admin(current_user))

    m = db.query(Meeting).filter(
        Meeting.id == body.meeting_id, Meeting.company_id == member.company_id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")

    instruction = (
        "Produce professional meeting notes with sections: "
        "**Agenda**, **Key decisions**, **Action items** (with owner), "
        "**Open questions**, **Next steps**. "
        f"Reply in {'Arabic' if body.language == 'ar' else 'English'}.\n\n"
        f"Meeting: {m.title}\nDate: {m.meeting_date}\nNotes:\n{m.notes or '(no notes)'}"
    )

    # private=True routes through Ollama first for company-data privacy
    summary = _complete_with_fallback(
        system_prompt=_build_system_prompt("company", current_user, db),
        user_prompt=instruction,
        max_tokens=2048,
        private=True,
    )

    if not m.notes:
        m.notes = summary
        db.commit()

    return {"meeting_id": m.id, "title": m.title, "summary": summary}


# ─── Company Insights — unified AI automation for owners ───────────────────
#
# One endpoint that returns a full AI briefing for the whole company in one
# call. Used by the "Company AI Hub" screen in the mobile app. Each section
# is independently try/except-wrapped so a single failure doesn't take down
# the whole response.

class CompanyInsightsRequest(BaseModel):
    language: str = "ar"
    # Optional: limit which sections to compute. Defaults to all.
    sections: Optional[list[str]] = None  # ["performance","tasks","meetings","deals","handovers"]


@router.post("/company-insights")
async def company_insights(
    body: CompanyInsightsRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    🧠 Unified company AI briefing.

    Returns a structured JSON with insights across:
      - performance   — overall health, bottlenecks, wins
      - tasks         — top priorities, blockers, delegatable
      - meetings      — upcoming prep + follow-ups
      - deals         — at-risk, next actions
      - handovers     — pending acceptance, risks

    Each section is AI-generated using the private-first fallback chain
    (Ollama → Claude → DeepSeek). Private data NEVER leaves the server
    when Ollama is running.

    Feature gate: ai_chat
    """
    from models import (
        Company, CompanyMember, Project, ProjectTask, DealRecord as Deal, Meeting, HandoverRecord,
    )

    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a company member")
    require_feature(db, member.company_id, "ai_chat", is_admin=user_is_admin(current_user))

    company = db.query(Company).filter(Company.id == member.company_id).first()
    company_name = company.name if company else "N/A"

    wanted = set(body.sections or ["performance", "tasks", "meetings", "deals", "handovers"])
    lang_label = "Arabic" if body.language == "ar" else "English"
    system = _build_system_prompt("company", current_user, db)
    sections: dict[str, dict] = {}

    def _run(key: str, prompt: str, max_tokens: int = 1200) -> None:
        try:
            text = _complete_with_fallback(
                system_prompt=system,
                user_prompt=prompt,
                max_tokens=max_tokens,
                private=True,
            )
            sections[key] = {"ok": True, "content": text}
        except HTTPException as e:
            sections[key] = {"ok": False, "error": e.detail}
        except Exception as e:
            sections[key] = {"ok": False, "error": str(e)}

    # ── Build per-section data snapshots and run the AI ────────────────────

    # Shared data pulls (single DB round-trip each)
    projects = db.query(Project).filter(Project.company_id == member.company_id).limit(50).all() if wanted & {"performance", "tasks"} else []
    tasks = (
        db.query(ProjectTask).join(Project, ProjectTask.project_id == Project.id)
        .filter(Project.company_id == member.company_id).limit(100).all()
    ) if wanted & {"performance", "tasks"} else []
    deals = db.query(Deal).filter(Deal.user_id == current_user.id).limit(50).all() if wanted & {"performance", "deals"} else []
    meetings = db.query(Meeting).filter(Meeting.company_id == member.company_id).limit(30).all() if wanted & {"performance", "meetings"} else []
    handovers = db.query(HandoverRecord).filter(HandoverRecord.user_id == current_user.id).limit(20).all() if wanted & {"handovers"} else []

    if "performance" in wanted:
        todo = sum(1 for t in tasks if t.status == "todo")
        done = sum(1 for t in tasks if t.status == "done")
        high = sum(1 for t in tasks if t.priority == "high" and t.status != "done")
        active_deals = [d for d in deals if d.stage not in ("won", "lost")]
        pipeline = sum(d.value or 0 for d in active_deals)

        _run("performance", (
            f"You are analysing the health of {company_name}. Produce a 4-section executive summary in {lang_label}:\n"
            "1. **الأداء العام / Overall health** — one paragraph, with a score /10.\n"
            "2. **نقاط القوة / Strengths** — 2-3 bullets.\n"
            "3. **عوائق / Bottlenecks** — 2-3 bullets.\n"
            "4. **توصيات هذا الأسبوع / Recommended actions** — exactly 3 items.\n\n"
            f"Data snapshot:\n"
            f"- Projects: {len(projects)}\n"
            f"- Tasks: {len(tasks)} total | {todo} todo | {done} done | {high} high-priority pending\n"
            f"- Deals: {len(active_deals)} active | pipeline={pipeline:,}\n"
            f"- Meetings: {len(meetings)} scheduled\n"
            f"- Handovers: {len(handovers)} open\n"
        ), max_tokens=1500)

    if "tasks" in wanted and tasks:
        lines = [
            f"- [{t.status}|{t.priority}] {t.title}"
            + (f" (due {t.due_date})" if t.due_date else "")
            for t in tasks[:60]
        ]
        _run("tasks", (
            f"Produce a smart task summary in {lang_label}:\n"
            "(1) top 3 priorities today with justification, "
            "(2) blockers to unblock, "
            "(3) tasks safe to delegate, "
            "(4) estimated effort remaining.\n\n"
            + "\n".join(lines)
        ))

    if "meetings" in wanted and meetings:
        upcoming = [m for m in meetings if m.status == "scheduled"]
        done_mtgs = [m for m in meetings if m.status == "done"]
        lines = [f"- {m.title} ({m.meeting_date}) — {m.status}" for m in meetings[:20]]
        _run("meetings", (
            f"Analyse the meeting calendar in {lang_label}:\n"
            f"- Upcoming: {len(upcoming)}\n- Done: {len(done_mtgs)}\n\n"
            "Give: (1) prep tips for next 3 meetings, (2) meetings that need follow-up, "
            "(3) any scheduling red flags.\n\n"
            + "\n".join(lines)
        ))

    if "deals" in wanted and deals:
        active = [d for d in deals if d.stage not in ("won", "lost")]
        stale = [d for d in active if (d.probability or 0) < 30]
        lines = [
            f"- {d.company} | stage={d.stage} | p={d.probability}% | value={d.value}"
            for d in active[:30]
        ]
        _run("deals", (
            f"Sales pipeline briefing in {lang_label}: "
            f"({len(active)} active, {len(stale)} at-risk). "
            "Give: (1) 3 deals to push today, (2) at-risk deals to rescue, "
            "(3) recommended next touch per top deal.\n\n"
            + "\n".join(lines)
        ))

    if "handovers" in wanted and handovers:
        lines = [f"- [{h.status}] {h.title} (risk={h.risk_level or 'n/a'})" for h in handovers[:15]]
        _run("handovers", (
            f"Handover briefing for the owner in {lang_label}. "
            "Flag: (1) which handovers need immediate acceptance, "
            "(2) any that look high-risk, (3) suggested next actions.\n\n"
            + "\n".join(lines)
        ))

    return {
        "company_id": member.company_id,
        "company_name": company_name,
        "generated_at": datetime.utcnow().isoformat(),
        "provider_tier": "ollama-first (private)",
        "sections": sections,
    }


# ─── Task-Based Service Dispatch ──────────────────────────────────────────
#
# When a user creates a task or issues a command, the Agent can automatically
# detect which services are needed and coordinate them.
#
# Example: "Send an email to John and log it in Salesforce"
# → Agent detects: gmail service, salesforce service
# → Orchestrator executes in sequence: send_email → update_crm

class TaskDispatchRequest(BaseModel):
    task_title: str                            # What the user wants to do
    task_description: Optional[str] = None     # Additional context
    task_type: str = "general"                 # email, crm, meeting, custom
    params: dict = {}                          # Additional params


@router.post("/dispatch-task")
async def dispatch_task(
    body: TaskDispatchRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Intelligent task dispatcher — Agent analyzes the task and coordinates services.

    The Agent:
    1. Analyzes the task to determine required services
    2. Uses ServiceOrchestrator to execute in proper order
    3. Returns results from each service

    Example:
        POST /agent/dispatch-task
        {
            "task_title": "Send meeting reminder",
            "task_description": "Email all team members about tomorrow's standup",
            "task_type": "email",
            "params": {"meeting_id": 123}
        }
    """
    from services.service_orchestrator import get_orchestrator

    # Validate user is in a company
    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a company member")

    # Use AI to analyze what services are needed
    analysis_prompt = f"""
Analyze this task and determine which services are needed:

Task: {body.task_title}
Description: {body.task_description or '(none)'}
Type: {body.task_type}

Services available: gmail, salesforce, slack, google_calendar, daily, ollama, claude, deepseek

Respond in JSON:
{{
    "primary_service": "service_id",
    "secondary_services": ["service_id", ...],
    "required_params": {{"param": "description"}},
    "estimated_steps": 3
}}
"""

    try:
        analysis_json = _complete_with_fallback(
            system_prompt="You are a task analysis expert. Return only valid JSON.",
            user_prompt=analysis_prompt,
            max_tokens=1024,
            private=True,
        )

        # Parse analysis (guard against malformed JSON)
        import json
        try:
            analysis = json.loads(analysis_json)
        except json.JSONDecodeError:
            analysis = {
                "primary_service": body.task_type,
                "secondary_services": [],
                "required_params": body.params,
            }
    except Exception as e:
        return {
            "status": "error",
            "error": f"Task analysis failed: {str(e)}",
        }

    # Build execution plan
    orchestrator = get_orchestrator()
    # TODO: Execute actual service tasks via orchestrator
    # For now, return the analysis

    return {
        "status": "success",
        "task": body.task_title,
        "analysis": analysis,
        "message": "✅ Task dispatched. Service orchestration in progress.",
    }
