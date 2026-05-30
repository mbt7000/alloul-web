"""Async httpx client pre-configured for the legacy ALLOUL&Q backend."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

import httpx


def _backend_url() -> str:
    return os.environ.get("BACKEND_URL", "http://localhost:8000").rstrip("/")


def _service_token() -> str:
    return os.environ.get("BACKEND_SERVICE_TOKEN", "")


@asynccontextmanager
async def backend_client(user_token: str | None = None) -> AsyncGenerator[httpx.AsyncClient, None]:
    """Yield an AsyncClient authorized for the legacy backend.

    Prefer user_token (user JWT) when available so the backend applies
    its own per-user authorization.  Fall back to the service token for
    internal calls.
    """
    token = user_token or _service_token()
    headers: dict[str, str] = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(
        base_url=_backend_url(),
        headers=headers,
        timeout=15.0,
    ) as client:
        yield client


async def get(path: str, user_token: str | None = None, **params: Any) -> dict[str, Any]:
    async with backend_client(user_token) as client:
        r = await client.get(path, params=params)
        r.raise_for_status()
        return r.json()


async def post(path: str, user_token: str | None = None, body: dict[str, Any] | None = None) -> dict[str, Any]:
    async with backend_client(user_token) as client:
        r = await client.post(path, json=body or {})
        r.raise_for_status()
        return r.json()


async def patch(path: str, user_token: str | None = None, body: dict[str, Any] | None = None) -> dict[str, Any]:
    async with backend_client(user_token) as client:
        r = await client.patch(path, json=body or {})
        r.raise_for_status()
        return r.json()


async def delete(path: str, user_token: str | None = None) -> dict[str, Any]:
    async with backend_client(user_token) as client:
        r = await client.delete(path)
        r.raise_for_status()
        return r.json()
