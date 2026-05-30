"""Daily.co REST API integration."""
from __future__ import annotations

import os
from typing import Any, Optional

import httpx


def _api_key() -> str:
    return os.environ.get("DAILYCO_API_KEY", "")


def _domain() -> str:
    return os.environ.get("DAILYCO_DOMAIN", "")


DAILY_BASE = "https://api.daily.co/v1"


async def create_room(
    meeting_id: int,
    exp_minutes: int = 60,
    max_participants: int = 25,
) -> dict[str, Any]:
    """Create a Daily.co room and return its URL."""
    api_key = _api_key()
    if not api_key:
        # Graceful degradation — return a placeholder URL in dev
        return {"url": f"https://meet.example.com/room-{meeting_id}", "name": f"alloulq-meeting-{meeting_id}"}

    import time
    exp = int(time.time()) + exp_minutes * 60
    room_name = f"alloulq-{meeting_id}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{DAILY_BASE}/rooms",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "name": room_name,
                "privacy": "private",
                "properties": {
                    "exp": exp,
                    "max_participants": max_participants,
                    "enable_recording": "cloud",
                    "enable_transcription": "deepgram",
                },
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return {"url": data["url"], "name": room_name}


async def delete_room(room_name: str) -> None:
    api_key = _api_key()
    if not api_key:
        return
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.delete(
            f"{DAILY_BASE}/rooms/{room_name}",
            headers={"Authorization": f"Bearer {api_key}"},
        )


async def get_room(room_name: str) -> dict[str, Any]:
    api_key = _api_key()
    if not api_key:
        return {}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{DAILY_BASE}/rooms/{room_name}",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp.raise_for_status()
        return resp.json()
