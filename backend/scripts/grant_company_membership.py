#!/usr/bin/env python3
"""
One-off: attach a user to a company as admin (for QA / company section testing).

Usage (from backend dir, venv active):
  python scripts/grant_company_membership.py --email you@example.com
  python scripts/grant_company_membership.py --email you@example.com --company-id 1

Requires: user row exists; company row exists (create via app/API first if needed).
"""
from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

# Load .env before importing app config
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from sqlalchemy import func
from sqlalchemy.orm import Session

from database import SessionLocal
from models import User, Company, CompanyMember


def _rand_icode(db: Session, company_id: int) -> str:
    for _ in range(80):
        code = "".join(str(random.randint(0, 9)) for _ in range(6))
        exists = (
            db.query(CompanyMember)
            .filter(CompanyMember.company_id == company_id, CompanyMember.i_code == code)
            .first()
        )
        if not exists:
            return code
    raise RuntimeError("Could not allocate unique member i_code")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--email", required=True, help="User email (must exist in users)")
    p.add_argument("--company-id", type=int, default=None, help="Company id; default = smallest id")
    p.add_argument("--role", default="admin", help="Member role (default admin)")
    args = p.parse_args()

    db = SessionLocal()
    try:
        email = args.email.strip().lower()
        user = db.query(User).filter(func.lower(User.email) == email).first()
        if not user:
            print(f"ERROR: no user with email {args.email!r}", file=sys.stderr)
            sys.exit(1)

        if args.company_id is not None:
            company = db.query(Company).filter(Company.id == args.company_id).first()
        else:
            company = db.query(Company).order_by(Company.id.asc()).first()

        if not company:
            print("ERROR: no company found. Create one (e.g. POST /companies) or pass --company-id", file=sys.stderr)
            sys.exit(1)

        existing = (
            db.query(CompanyMember)
            .filter(CompanyMember.user_id == user.id, CompanyMember.company_id == company.id)
            .first()
        )
        if existing:
            print(f"OK: user {email} already member of company id={company.id} ({company.name!r}) role={existing.role}")
            return

        code = _rand_icode(db, company.id)
        mem = CompanyMember(
            company_id=company.id,
            user_id=user.id,
            role=args.role,
            i_code=code,
        )
        db.add(mem)
        db.commit()
        print(f"OK: added user {email} (id={user.id}) to company id={company.id} ({company.name!r}) as {args.role} i_code={code}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
