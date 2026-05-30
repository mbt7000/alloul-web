from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, HandoverRecord

router = APIRouter(prefix="/handover", tags=["handover"])


class HandoverCreate(BaseModel):
    title: str
    from_person: Optional[str] = None
    to_person: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = "pending"
    content: Optional[str] = None


class HandoverResponse(BaseModel):
    id: int
    user_id: int
    title: str
    from_person: Optional[str] = None
    to_person: Optional[str] = None
    department: Optional[str] = None
    status: str
    content: Optional[str] = None
    score: int
    tasks: int
    completed_tasks: int
    pending_actions: list[str] = []
    risk_level: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


def _to_response(h: HandoverRecord) -> HandoverResponse:
    import json as _json
    pending: list[str] = []
    if h.pending_actions_json:
        try:
            pending = _json.loads(h.pending_actions_json) or []
        except Exception:
            pending = []
    return HandoverResponse(
        id=h.id,
        user_id=h.user_id,
        title=h.title,
        from_person=h.from_person,
        to_person=h.to_person,
        department=h.department,
        status=h.status or "pending",
        content=h.content,
        score=h.score or 0,
        tasks=h.tasks or 0,
        completed_tasks=h.completed_tasks or 0,
        pending_actions=pending,
        risk_level=h.risk_level,
        created_at=h.created_at.isoformat() if h.created_at else None,
    )


@router.get("/", response_model=list[HandoverResponse])
def list_handovers(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    items = db.query(HandoverRecord).filter(
        HandoverRecord.user_id == current_user.id
    ).order_by(HandoverRecord.created_at.desc()).all()
    return [_to_response(h) for h in items]


@router.post("/", response_model=HandoverResponse, status_code=status.HTTP_201_CREATED)
def create_handover(
    body: HandoverCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    h = HandoverRecord(
        user_id=current_user.id,
        title=body.title,
        from_person=body.from_person,
        to_person=body.to_person,
        department=body.department,
        status=body.status or "pending",
        content=body.content,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return _to_response(h)


@router.get("/{handover_id}", response_model=HandoverResponse)
def get_handover(
    handover_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    h = db.query(HandoverRecord).filter(
        HandoverRecord.id == handover_id, HandoverRecord.user_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Handover not found")
    return _to_response(h)


class HandoverUpdate(BaseModel):
    title: Optional[str] = None
    from_person: Optional[str] = None
    to_person: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    content: Optional[str] = None
    tasks: Optional[int] = None
    completed_tasks: Optional[int] = None


@router.patch("/{handover_id}/status")
def update_handover_status(
    handover_id: int,
    status_val: str = Query(..., alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    h = db.query(HandoverRecord).filter(
        HandoverRecord.id == handover_id, HandoverRecord.user_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Handover not found")
    h.status = status_val
    if status_val == "completed":
        h.completed_tasks = h.tasks or 0
    db.commit()
    return {"message": "Status updated"}


@router.patch("/{handover_id}", response_model=HandoverResponse)
def update_handover(
    handover_id: int,
    body: HandoverUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    h = db.query(HandoverRecord).filter(
        HandoverRecord.id == handover_id, HandoverRecord.user_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Handover not found")
    for field in ["title", "from_person", "to_person", "department", "status", "content", "tasks", "completed_tasks"]:
        val = getattr(body, field, None)
        if val is not None:
            setattr(h, field, val)
    db.commit()
    db.refresh(h)
    return _to_response(h)


@router.post("/{handover_id}/ai-analyze", status_code=status.HTTP_200_OK)
def ai_analyze_handover(
    handover_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Use AI to analyze a handover and generate structured insights + suggested content."""
    h = db.query(HandoverRecord).filter(
        HandoverRecord.id == handover_id, HandoverRecord.user_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Handover not found")

    import os
    try:
        import anthropic as _anthropic
    except ImportError:
        return {"analysis": "مكتبة anthropic غير متاحة على الخادم.", "structured": {}}

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {
            "analysis": "⚠️ ANTHROPIC_API_KEY غير مُعدّ. بمجرد إعداده ستحصل على تحليل ذكي كامل.",
            "structured": {},
        }

    client = _anthropic.Anthropic(api_key=api_key)
    prompt = (
        "أنت خبير في إدارة المعرفة المؤسسية. حلّل هذه التسليمة الوظيفية وأعد:\n"
        "1. ملخصاً موجزاً (3 جمل)\n"
        "2. نقاط القوة في التسليمة\n"
        "3. الثغرات والمعلومات الناقصة\n"
        "4. توصيات للمستلم (3-5 نقاط)\n"
        "5. درجة الاكتمال من 100\n\n"
        f"عنوان التسليمة: {h.title}\n"
        f"من: {h.from_person or 'غير محدد'}\n"
        f"إلى: {h.to_person or 'غير محدد'}\n"
        f"القسم: {h.department or 'غير محدد'}\n"
        f"المحتوى: {h.content or 'لا يوجد محتوى بعد'}\n"
        f"المهام: {h.tasks or 0} (مكتمل: {h.completed_tasks or 0})\n\n"
        "أجب بالعربية بتنسيق منظم."
    )

    try:
        msg = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        analysis = msg.content[0].text if msg.content else "لم يتم توليد تحليل."
    except Exception as e:
        analysis = f"خطأ في التحليل: {str(e)}"

    # Auto-update score based on AI judgment
    try:
        if "درجة الاكتمال" in analysis:
            import re
            match = re.search(r"درجة الاكتمال[^\d]*(\d+)", analysis)
            if match:
                score = min(100, int(match.group(1)))
                h.score = score
                db.commit()
    except Exception:
        pass

    return {"analysis": analysis, "handover_id": handover_id}


@router.delete("/{handover_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_handover(
    handover_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    h = db.query(HandoverRecord).filter(
        HandoverRecord.id == handover_id, HandoverRecord.user_id == current_user.id
    ).first()
    if not h:
        raise HTTPException(status_code=404, detail="Handover not found")
    db.delete(h)
    db.commit()
