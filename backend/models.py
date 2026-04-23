from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, Integer, String, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    name = Column(String(255), nullable=True)
    phone = Column(String(32), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    bio = Column(Text, nullable=True)
    i_code = Column(String(12), unique=True, index=True, nullable=True)
    cover_url = Column(String(512), nullable=True)
    location = Column(String(255), nullable=True)
    skills = Column(Text, nullable=True)
    username_changed = Column(Integer, default=0)
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    posts_count = Column(Integer, default=0)
    firebase_uid = Column(String(255), unique=True, index=True, nullable=True)
    verified = Column(Integer, default=0)
    expo_push_token = Column(String(512), nullable=True)
    presence_status = Column(String(16), default="offline")  # online, busy, offline, away
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Follows ─────────────────────────────────────────────────────────────────

class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    follower = relationship("User", foreign_keys=[follower_id])
    following = relationship("User", foreign_keys=[following_id])

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follow"),
    )


# ─── Companies ───────────────────────────────────────────────────────────────

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    company_type = Column(String(64), nullable=True)
    size = Column(String(32), nullable=True)
    logo_url = Column(String(512), nullable=True)
    founder_name = Column(String(255), nullable=True)
    founder_email = Column(String(255), nullable=True)
    i_code = Column(String(6), unique=True, index=True, nullable=False)
    industry = Column(String(128), nullable=True)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    verified = Column(Integer, default=0)
    knowledge_score = Column(Integer, default=70)
    handover_score = Column(Integer, default=70)
    documentation_rate = Column(Integer, default=70)
    stability_score = Column(Integer, default=70)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    subscriptions = relationship("Subscription", back_populates="company")
    departments = relationship("Department", back_populates="company")
    members = relationship("CompanyMember", back_populates="company")
    activity_logs = relationship("ActivityLog", back_populates="company")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    stripe_customer_id = Column(String(255), nullable=True, index=True)
    stripe_subscription_id = Column(String(255), nullable=True, index=True)
    plan_id = Column(String(64), nullable=False)
    status = Column(String(64), nullable=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    trial_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", back_populates="subscriptions")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="departments")
    members = relationship("CompanyMember", back_populates="department")


class CompanyMember(Base):
    __tablename__ = "company_members"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(32), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    i_code = Column(String(6), nullable=False)
    work_id = Column(String(24), unique=True, index=True, nullable=True)  # EMP-YYYY-NNNN-XXXX
    manager_id = Column(Integer, ForeignKey("company_members.id"), nullable=True)
    job_title = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="members")
    user = relationship("User")
    department = relationship("Department", back_populates="members")
    manager = relationship("CompanyMember", remote_side=[id])

    __table_args__ = (
        UniqueConstraint("company_id", "i_code", name="uq_company_member_icode"),
        UniqueConstraint("company_id", "user_id", name="uq_company_member_user"),
    )


class CompanyInvitation(Base):
    __tablename__ = "company_invitations"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invitee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(16), default="pending")  # pending, accepted, rejected
    role = Column(String(32), default="member")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company")
    inviter = relationship("User", foreign_keys=[inviter_id])
    invitee = relationship("User", foreign_keys=[invitee_id])


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(128), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="activity_logs")


class CompanyOnboarding(Base):
    """Tracks onboarding completion per company. Created once at company birth."""
    __tablename__ = "company_onboarding"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    # Each step stored as 0 (pending) or 1 (done)
    step_profile = Column(Integer, default=0)      # Set company name/logo
    step_team = Column(Integer, default=0)         # Create first department/team
    step_invite = Column(Integer, default=0)       # Invite first member
    step_project = Column(Integer, default=0)      # Create first project
    completed = Column(Integer, default=0)         # 1 when all steps done
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")


# ─── Feed / Posts ─────────────────────────────────────────────────────────────

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    image_url = Column(String(512), nullable=True)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    reposts_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    author = relationship("User")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("PostComment", back_populates="post", cascade="all, delete-orphan")
    reposts = relationship("PostRepost", back_populates="post", cascade="all, delete-orphan")
    saves = relationship("PostSave", back_populates="post", cascade="all, delete-orphan")


class PostLike(Base):
    __tablename__ = "post_likes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    post = relationship("Post", back_populates="likes")

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_like"),
    )


class PostComment(Base):
    __tablename__ = "post_comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    likes_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    post = relationship("Post", back_populates="comments")
    author = relationship("User")
    likes = relationship("CommentLike", back_populates="comment", cascade="all, delete-orphan")


class CommentLike(Base):
    """Per-user likes on a comment (X-style). Uniqueness enforced."""
    __tablename__ = "comment_likes"

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("post_comments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    comment = relationship("PostComment", back_populates="likes")

    __table_args__ = (
        UniqueConstraint("comment_id", "user_id", name="uq_comment_like"),
    )


class PostReaction(Base):
    """Rich emoji reactions on posts (beyond simple like).

    One row per (user, post) — switching emoji overwrites the old one.
    Supported emojis: 👍 ❤️ 🔥 😂 😮 👏 (enforced in the router, not here).
    """
    __tablename__ = "post_reactions"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    emoji = Column(String(8), nullable=False)  # small unicode, up to 4 bytes + joiner
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_reaction"),
    )


class PostRepost(Base):
    __tablename__ = "post_reposts"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    post = relationship("Post", back_populates="reposts")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_repost"),
    )


class PostSave(Base):
    __tablename__ = "post_saves"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    post = relationship("Post", back_populates="saves")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_save"),
    )


# ─── Communities ──────────────────────────────────────────────────────────────

class Community(Base):
    __tablename__ = "communities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    avatar_url = Column(String(512), nullable=True)
    cover_url = Column(String(512), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    members_count = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User")
    members = relationship("CommunityMember", back_populates="community", cascade="all, delete-orphan")


class CommunityMember(Base):
    __tablename__ = "community_members"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(16), default="member")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    community = relationship("Community", back_populates="members")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("community_id", "user_id", name="uq_community_member"),
    )


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    community = relationship("Community")
    post = relationship("Post")

    __table_args__ = (
        UniqueConstraint("community_id", "post_id", name="uq_community_post"),
    )


# ─── Handovers ────────────────────────────────────────────────────────────────

class HandoverRecord(Base):
    __tablename__ = "handovers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    from_person = Column(String(255), nullable=True)
    to_person = Column(String(255), nullable=True)
    department = Column(String(128), nullable=True)
    status = Column(String(32), default="pending")
    content = Column(Text, nullable=True)
    score = Column(Integer, default=0)
    tasks = Column(Integer, default=0)
    completed_tasks = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # AI confirm additions
    client_name = Column(String(255), nullable=True)
    next_owner_name = Column(String(255), nullable=True)
    next_owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    pending_actions_json = Column(Text, nullable=True)      # JSON list
    important_contacts_json = Column(Text, nullable=True)   # JSON list
    referenced_files_json = Column(Text, nullable=True)     # JSON list
    flagged_amount = Column(Float, nullable=True)
    currency = Column(String(8), nullable=True)
    deadline = Column(String(32), nullable=True)
    risk_level = Column(String(16), nullable=True)          # low, medium, high, critical
    summary = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    ai_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    ai_confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    owner = relationship("User", foreign_keys=[user_id])


class SalesLedger(Base):
    """Per-company sales / transaction ledger saved from AI extractions."""
    __tablename__ = "sales_ledger"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    transaction_type = Column(String(32), nullable=False)   # income, expense, invoice, payment
    counterparty_name = Column(String(255), nullable=True)
    item_name = Column(String(255), nullable=True)
    quantity = Column(Float, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(8), default="SAR")
    transaction_date = Column(String(32), nullable=True)    # YYYY-MM-DD
    payment_status = Column(String(32), default="pending")  # pending, paid, overdue, cancelled
    category = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    invoice_number = Column(String(128), nullable=True)
    ai_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    ai_confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")
    creator = relationship("User", foreign_keys=[created_by_user_id])


# ─── Memory / Knowledge ──────────────────────────────────────────────────────

class MemoryRecord(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    type = Column(String(32), default="task")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    project = Column(String(128), nullable=True)
    department = Column(String(128), nullable=True)
    tags = Column(String(512), nullable=True)
    importance = Column(String(16), default="medium")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User")


# ─── Deals / Pipeline ────────────────────────────────────────────────────────

class DealRecord(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    company = Column(String(255), nullable=False)
    value = Column(Integer, default=0)
    stage = Column(String(64), default="lead")
    probability = Column(Integer, default=0)
    contact = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User")


# ─── Stories ─────────────────────────────────────────────────────────────────

class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    media_url = Column(String(512), nullable=True)
    media_type = Column(String(16), default="image")
    caption = Column(String(500), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    author = relationship("User")
    views = relationship("StoryView", back_populates="story", cascade="all, delete-orphan")


class StoryView(Base):
    __tablename__ = "story_views"

    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    story = relationship("Story", back_populates="views")

    __table_args__ = (
        UniqueConstraint("story_id", "user_id", name="uq_story_view"),
    )


# ─── Projects ────────────────────────────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(32), default="planning")  # planning, in_progress, completed, archived
    due_date = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User")
    tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete-orphan")


class ProjectTask(Base):
    __tablename__ = "project_tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(32), default="todo")  # todo, in_progress, done
    priority = Column(String(16), default="medium")  # high, medium, low
    due_date = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # AI confirm additions
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    related_client = Column(String(255), nullable=True)
    tags = Column(Text, nullable=True)              # JSON array string
    notes = Column(Text, nullable=True)
    ai_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    ai_confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assignee_id])
    creator = relationship("User", foreign_keys=[created_by_user_id])


# ─── Meetings ────────────────────────────────────────────────────────────────

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    meeting_date = Column(String(32), nullable=False)   # YYYY-MM-DD
    meeting_time = Column(String(10), nullable=True)    # HH:MM
    duration_minutes = Column(Integer, default=30)
    location = Column(String(255), nullable=True)       # "Daily" / "Meet" / "Zoom" / custom
    status = Column(String(32), default="scheduled")    # scheduled, in_progress, done, cancelled
    notes = Column(Text, nullable=True)                 # post-meeting notes
    action_items = Column(Text, nullable=True)          # AI-generated or manual action items
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")
    organizer = relationship("User")
    project = relationship("Project")


class MeetingAttendee(Base):
    __tablename__ = "meeting_attendees"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(16), default="invited")      # invited, accepted, declined

    meeting = relationship("Meeting")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("meeting_id", "user_id", name="uq_meeting_attendee"),
    )


# ─── Notifications ───────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(32), nullable=False)  # follow, like, comment, handover, system
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    read = Column(Integer, default=0)
    reference_id = Column(String(64), nullable=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    recipient = relationship("User", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_id])


# ─── Agent Chat History ──────────────────────────────────────────────────────

class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    mode = Column(String(16), default="media")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Ads (Paid promotions) ──────────────────────────────────────────────────

class Ad(Base):
    __tablename__ = "ads"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ad_type = Column(String(16), nullable=False)  # story, post
    content = Column(Text, nullable=True)
    image_url = Column(String(512), nullable=True)
    media_type = Column(String(16), default="image")
    caption = Column(String(500), nullable=True)
    price_cents = Column(Integer, nullable=False)  # 900=$9 story, 1100=$11 post
    status = Column(String(16), default="active")  # active, expired, cancelled
    impressions = Column(Integer, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company")
    creator = relationship("User")


# ─── Channels / Team Chat ─────────────────────────────────────────────────────

class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    description = Column(String(512), nullable=True)
    type = Column(String(32), default="general")   # general, department, project, announcement
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company")
    messages = relationship("ChannelMessage", back_populates="channel", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("company_id", "name", name="uq_channel_company_name"),
    )


class ChannelMessage(Base):
    __tablename__ = "channel_messages"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    channel = relationship("Channel", back_populates="messages")
    author = relationship("User")


# ─── Block ───────────────────────────────────────────────────────────────────

class UserBlock(Base):
    __tablename__ = "user_blocks"

    id = Column(Integer, primary_key=True, index=True)
    blocker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    blocked_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    blocker = relationship("User", foreign_keys=[blocker_id])
    blocked = relationship("User", foreign_keys=[blocked_id])

    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_user_block"),
    )


# ─── Direct Messages ─────────────────────────────────────────────────────────

class DirectConversation(Base):
    __tablename__ = "direct_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user2_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    last_message_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    messages = relationship("DirectMessage", back_populates="conversation", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user1_id", "user2_id", name="uq_direct_conversation"),
    )


class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("direct_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("DirectConversation", back_populates="messages")
    sender = relationship("User")


# ─── CV / Jobs ───────────────────────────────────────────────────────────────

class UserCV(Base):
    __tablename__ = "user_cvs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    full_name = Column(String(128), nullable=True)
    title = Column(String(128), nullable=True)  # e.g. "مطور تطبيقات"
    summary = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(128), nullable=True)
    location = Column(String(128), nullable=True)
    years_experience = Column(Integer, nullable=True)
    skills = Column(Text, nullable=True)  # JSON array string
    education = Column(Text, nullable=True)  # JSON array string
    certifications = Column(Text, nullable=True)  # JSON array string
    languages = Column(Text, nullable=True)  # JSON array string
    linkedin_url = Column(String(256), nullable=True)
    portfolio_url = Column(String(256), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    user = relationship("User", foreign_keys=[user_id])


class JobPosting(Base):
    __tablename__ = "job_postings"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    posted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(128), nullable=False)
    industry = Column(String(128), nullable=True)
    job_type = Column(String(32), nullable=True)   # full_time, part_time, remote, contract
    location = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    salary_range = Column(String(64), nullable=True)
    required_skills = Column(Text, nullable=True)  # JSON
    min_experience = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    company = relationship("Company", foreign_keys=[company_id])
    poster = relationship("User", foreign_keys=[posted_by])


class JobApplication(Base):
    __tablename__ = "job_applications"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cover_letter = Column(Text, nullable=True)
    status = Column(String(32), default="pending")  # pending, reviewed, accepted, rejected
    created_at = Column(DateTime, server_default=func.now())
    __table_args__ = (UniqueConstraint("job_id", "user_id", name="uq_job_application"),)
    job = relationship("JobPosting", foreign_keys=[job_id])
    applicant = relationship("User", foreign_keys=[user_id])


# ─── Calls ───────────────────────────────────────────────────────────────────

class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True, index=True)
    caller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    call_type = Column(String(16), default="video")          # video, audio
    status = Column(String(16), default="ringing")           # ringing, accepted, rejected, missed, ended
    room_url = Column(String(512), nullable=True)
    room_name = Column(String(255), nullable=True)
    duration = Column(Integer, nullable=True)                 # seconds
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)

    caller = relationship("User", foreign_keys=[caller_id])
    receiver = relationship("User", foreign_keys=[receiver_id])


# ─── OTP Codes (phone verification) ──────────────────────────────────────────

class OtpCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(32), index=True, nullable=False)
    code = Column(String(6), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)


# ─── API Credentials (Platform Integrations) ──────────────────────────────────
#
# Securely store encrypted API keys for platform integrations (OpenAI, Slack, Gmail, etc).
# Keys are encrypted at rest and should only be decrypted when actually used.

# ─────────────────────────────────────────────────────────────
# شكرة — AI Accountant (metadata only; details live in Google Sheets)
# ─────────────────────────────────────────────────────────────

class AccountingSetup(Base):
    """Per-company accounting config."""
    __tablename__ = "accounting_setup"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, unique=True, index=True)

    # Google Sheets — company owns it, ALLOUL appends via service account
    google_sheet_id  = Column(String(256), nullable=True)
    google_sheet_url = Column(String(512), nullable=True)

    # Telegram Bot — company creates bot via @BotFather, pastes token here
    telegram_bot_token = Column(String(512), nullable=True)   # encrypted in prod
    telegram_active    = Column(Boolean, default=False)

    # WhatsApp Business Cloud API — company's own Meta credentials
    whatsapp_phone_number_id = Column(String(64),  nullable=True)
    whatsapp_access_token    = Column(Text,         nullable=True)   # encrypted in prod
    whatsapp_verify_token    = Column(String(128),  nullable=True)   # random secret
    whatsapp_active          = Column(Boolean, default=False)

    # Currency default
    currency  = Column(String(8), default="SAR")
    is_active = Column(Boolean,   default=True)

    # ── Privacy Settings (founder controls) ──────────────────────────────────
    # ما يشوفه الموظفون في داشبورد شكرة
    show_balances    = Column(Boolean, default=True)   # إخفاء/إظهار الأرصدة
    show_profits     = Column(Boolean, default=True)   # إخفاء/إظهار الأرباح
    show_amounts     = Column(Boolean, default=True)   # إخفاء/إظهار المبالغ
    show_vendors     = Column(Boolean, default=True)   # إخفاء/إظهار أسماء الجهات
    show_reports     = Column(Boolean, default=True)   # إخفاء/إظهار التقارير
    employees_can_add = Column(Boolean, default=True)  # هل الموظف يقدر يضيف معاملة

    # Capital tracking
    initial_capital = Column(Float, default=0.0)       # رأس المال الابتدائي

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AccountingRecord(Base):
    """
    Metadata-only ledger row.
    Sensitive invoice details (vendor name, description, line items) are in Google Sheets.
    ALLOUL stores: amount, date, category, type — enough for dashboards and reports.
    """
    __tablename__ = "accounting_records"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Core financials (safe to store — no PII)
    record_type = Column(String(16), nullable=False, index=True)   # income | expense
    amount = Column(Float, nullable=False)
    currency = Column(String(8), default="SAR")
    category = Column(String(64), nullable=True, index=True)        # rent, salary, sales, utilities…
    sub_category = Column(String(64), nullable=True)
    recorded_at = Column(DateTime(timezone=True), nullable=False, index=True)

    # Extended metadata
    vendor       = Column(String(255), nullable=True)               # vendor / customer name
    description  = Column(Text, nullable=True)                      # free-form note
    payment_status = Column(String(16), default="paid")             # paid | pending | partial

    # Source tracing (no sensitive content)
    source = Column(String(32), default="manual")                   # manual | whatsapp | n8n | api
    sheet_row_ref = Column(String(64), nullable=True)               # row ID in Google Sheets (pointer)
    external_ref = Column(String(128), nullable=True)               # invoice # or PO #

    # AI confidence from n8n OCR pipeline
    ai_confidence = Column(Float, nullable=True)                    # 0.0–1.0
    needs_review = Column(Boolean, default=False)                   # flagged for human review

    # Soft delete
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AccountingPermission(Base):
    """
    صلاحيات موظف معين في نظام شكرة.
    المؤسس يمنح / يسحب الصلاحيات لكل موظف بشكل مستقل.
    """
    __tablename__ = "accounting_permissions"

    id = Column(Integer, primary_key=True, index=True)
    company_id  = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"),     nullable=False, index=True)
    granted_by  = Column(Integer, ForeignKey("users.id"),     nullable=False)  # المؤسس

    # ── ما يقدر يشوفه الموظف ─────────────────────────────────────────────────
    can_view_dashboard = Column(Boolean, default=True)   # يشوف الداشبورد
    can_view_amounts   = Column(Boolean, default=False)  # يشوف المبالغ
    can_view_profits   = Column(Boolean, default=False)  # يشوف الأرباح
    can_view_reports   = Column(Boolean, default=False)  # يشوف التقارير
    can_view_vendors   = Column(Boolean, default=False)  # يشوف أسماء الجهات

    # ── ما يقدر يفعله الموظف ──────────────────────────────────────────────────
    can_add_records    = Column(Boolean, default=True)   # يضيف معاملة
    can_edit_records   = Column(Boolean, default=False)  # يعدل معاملة
    can_delete_records = Column(Boolean, default=False)  # يحذف معاملة
    can_use_bot        = Column(Boolean, default=True)   # يستخدم بوت Telegram/WhatsApp

    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("company_id", "user_id", name="uq_accounting_perm"),
    )


class APICredential(Base):
    __tablename__ = "api_credentials"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    platform_id = Column(String(64), nullable=False, index=True)        # e.g., "openai", "slack", "gmail"
    api_key = Column(String(512), nullable=True)                        # Encrypted
    api_secret = Column(String(512), nullable=True)                     # Encrypted
    custom_params = Column(Text, nullable=True)                         # JSON dict for platform-specific config
    is_active = Column(Boolean, default=True, index=True)
    last_tested_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Unique constraint: one credential per company per platform
    __table_args__ = (
        UniqueConstraint('company_id', 'platform_id', name='uq_company_platform'),
    )

    company = relationship("Company", foreign_keys=[company_id])
