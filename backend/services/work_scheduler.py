"""
Work Summary Scheduler — sends handover every 12 hours to all companies.
Runs at 06:00 and 18:00 server time.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime

logger = logging.getLogger("alloul.work_scheduler")


async def run_scheduled_handovers():
    """Send handover reports to all companies."""
    from database import SessionLocal
    from models import Company
    from services.work_summary_agent import work_agent

    db = SessionLocal()
    try:
        companies = db.query(Company).all()
        logger.info("Scheduled handover: processing %d companies", len(companies))

        for company in companies:
            try:
                report = await work_agent.generate_handover(
                    db=db,
                    company_id=company.id,
                    company_name=company.name,
                    response_language="en",
                    trigger="scheduled",
                )
                logger.info("Handover generated for company %d (%s)", company.id, company.name)
            except Exception as e:
                logger.error("Handover failed for company %d: %s", company.id, e)

    finally:
        db.close()


async def start_handover_scheduler():
    """Background loop — triggers every 12 hours."""
    logger.info("Work handover scheduler started (every 12 hours)")

    while True:
        now = datetime.now()
        # Run at 06:00 and 18:00
        next_run_hour = 6 if now.hour < 6 else (18 if now.hour < 18 else 30)

        if next_run_hour == 30:
            # Past 18:00 → wait until 06:00 next day
            from datetime import timedelta
            tomorrow_6am = (now + timedelta(days=1)).replace(
                hour=6, minute=0, second=0, microsecond=0
            )
            wait_seconds = (tomorrow_6am - now).total_seconds()
        else:
            target = now.replace(hour=next_run_hour, minute=0, second=0, microsecond=0)
            wait_seconds = (target - now).total_seconds()

        logger.info(
            "Next handover in %.0f minutes (at %02d:00)",
            wait_seconds / 60,
            next_run_hour if next_run_hour != 30 else 6,
        )

        await asyncio.sleep(wait_seconds)
        await run_scheduled_handovers()
