"""
AI Service Abstraction — Unified interface for all AI providers.

This module provides a single interface for Claude, DeepSeek, Ollama, and others.
It handles provider selection, fallback chains, and error management.
"""
from __future__ import annotations

import asyncio
from typing import Optional, Literal
from enum import Enum

from config import settings
from services.platform_registry import get_registry, PlatformStatus


class ProviderTier(Enum):
    """Provider selection tier."""
    TIER_1 = "tier_1"     # Preferred (Claude for general, Ollama for private)
    TIER_2 = "tier_2"     # Fallback
    TIER_3 = "tier_3"     # Last resort


class AIServiceProvider:
    """
    Unified AI service interface.

    Handles:
      - Provider selection based on availability and context
      - Fallback chain management
      - Streaming and non-streaming completions
      - Error handling and retries
    """

    def __init__(self):
        self.registry = get_registry()

    def get_preferred_provider(
        self,
        private: bool = False,
    ) -> Optional[str]:
        """
        Get the preferred AI provider based on context.

        Args:
            private: If True, prioritize local/private providers (Ollama → Claude → DeepSeek)
                     If False, use cloud providers (Claude → DeepSeek → Ollama)

        Returns:
            Provider ID or None if no provider is available.
        """
        platforms = self.registry.get_configured_platforms(category="ai")

        if not platforms:
            return None

        # Sort by priority for the given context
        if private:
            # Private data: Ollama > Claude > DeepSeek
            priority_order = ["ollama", "claude", "deepseek"]
        else:
            # Public data: Claude > DeepSeek > Ollama
            priority_order = ["claude", "deepseek", "ollama"]

        # Find first available provider in priority order
        for provider_id in priority_order:
            provider = self.registry.get_platform(provider_id)
            if provider and provider.credentials.is_configured():
                # Quick health check
                if provider.health_check():
                    return provider_id

        return None

    def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        *,
        private: bool = False,
        provider: Optional[str] = None,
    ) -> str:
        """
        Synchronous single-shot completion with automatic fallback.

        Args:
            system_prompt: System message
            user_prompt: User message
            model: Specific model (e.g., "claude-haiku-4-5")
            max_tokens: Max output tokens
            temperature: Sampling temperature
            private: Use private-first fallback chain
            provider: Force a specific provider (or None for auto-selection)

        Returns:
            Generated text

        Raises:
            Exception: If no provider is available
        """
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(
                self.complete_async(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    model=model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    private=private,
                    provider=provider,
                )
            )
        finally:
            loop.close()

    async def complete_async(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        *,
        private: bool = False,
        provider: Optional[str] = None,
    ) -> str:
        """
        Asynchronous single-shot completion with automatic fallback.

        Same as complete() but async-friendly.
        """
        if not provider:
            provider = self.get_preferred_provider(private=private)

        if not provider:
            raise Exception(
                "No AI provider available. "
                "Set ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, or run Ollama locally."
            )

        # Try the selected provider, then fallback chain
        providers_to_try = [provider]
        all_providers = self.registry.get_configured_platforms(category="ai")
        all_provider_ids = [p.id for p in all_providers]

        for other_id in all_provider_ids:
            if other_id not in providers_to_try:
                providers_to_try.append(other_id)

        for provider_id in providers_to_try:
            try:
                result = await self._call_provider(
                    provider_id=provider_id,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    model=model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                return result
            except Exception as e:
                # Log and continue to next provider
                import logging
                logger = logging.getLogger("alloul.ai.service")
                logger.warning(f"Provider {provider_id} failed: {e}")
                continue

        raise Exception(f"All AI providers failed. Tried: {providers_to_try}")

    async def stream_complete(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.3,
        *,
        private: bool = False,
        provider: Optional[str] = None,
    ):
        """
        Streaming completion (async generator).

        Yields text chunks as they arrive.
        """
        if not provider:
            provider = self.get_preferred_provider(private=private)

        if not provider:
            raise Exception("No AI provider available.")

        async for chunk in self._stream_provider(
            provider_id=provider,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        ):
            yield chunk

    async def _call_provider(
        self,
        provider_id: str,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str],
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Internal: call a specific provider and return full text."""
        if provider_id == "claude":
            return await self._call_claude(
                system_prompt, user_prompt, model, max_tokens, temperature
            )
        elif provider_id == "deepseek":
            return await self._call_deepseek(
                system_prompt, user_prompt, model, max_tokens, temperature
            )
        elif provider_id == "ollama":
            return await self._call_ollama(
                system_prompt, user_prompt, model, max_tokens, temperature
            )
        else:
            raise ValueError(f"Unknown provider: {provider_id}")

    async def _stream_provider(
        self,
        provider_id: str,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str],
        max_tokens: int,
        temperature: float,
    ):
        """Internal: stream from a specific provider."""
        if provider_id == "claude":
            async for chunk in self._stream_claude(
                system_prompt, user_prompt, model, max_tokens, temperature
            ):
                yield chunk
        elif provider_id == "deepseek":
            async for chunk in self._stream_deepseek(
                system_prompt, user_prompt, model, max_tokens, temperature
            ):
                yield chunk
        elif provider_id == "ollama":
            async for chunk in self._stream_ollama(
                system_prompt, user_prompt, model, max_tokens, temperature
            ):
                yield chunk
        else:
            raise ValueError(f"Unknown provider: {provider_id}")

    # ──── Claude Implementation ────────────────────────────────────────────

    async def _call_claude(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str],
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Call Claude API (non-streaming)."""
        try:
            import anthropic
        except ImportError:
            raise ImportError("anthropic package required. Install with: pip install anthropic")

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model=model or "claude-haiku-4-5-20251001",
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return msg.content[0].text if msg.content else ""

    async def _stream_claude(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str],
        max_tokens: int,
        temperature: float,
    ):
        """Stream from Claude API."""
        try:
            import anthropic
        except ImportError:
            raise ImportError("anthropic package required. Install with: pip install anthropic")

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        with client.messages.stream(
            model=model or "claude-haiku-4-5-20251001",
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    # ──── DeepSeek Implementation (OpenAI-compatible) ──────────────────────

    async def _call_deepseek(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str],
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Call DeepSeek API (via OpenAI compatibility layer)."""
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("openai package required. Install with: pip install openai")

        client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
        )
        resp = client.chat.completions.create(
            model=model or settings.DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return resp.choices[0].message.content or ""

    async def _stream_deepseek(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str],
        max_tokens: int,
        temperature: float,
    ):
        """Stream from DeepSeek API."""
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("openai package required. Install with: pip install openai")

        client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
        )
        resp = client.chat.completions.create(
            model=model or settings.DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )
        for chunk in resp:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta

    # ──── Ollama Implementation ────────────────────────────────────────────

    async def _call_ollama(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str],
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Call Ollama (local LLM)."""
        try:
            from services.ollama_client import ollama_client
        except ImportError:
            raise ImportError("ollama_client module not found")

        result = await ollama_client.chat(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt,
            model=model or settings.OLLAMA_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return result.get("content", "")

    async def _stream_ollama(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str],
        max_tokens: int,
        temperature: float,
    ):
        """Stream from Ollama."""
        try:
            from services.ollama_client import ollama_client
        except ImportError:
            raise ImportError("ollama_client module not found")

        async for chunk in ollama_client.stream_chat(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt,
            model=model or settings.OLLAMA_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
        ):
            # ollama_client.stream_chat yields plain strings
            if isinstance(chunk, str):
                if chunk:
                    yield chunk
            elif isinstance(chunk, dict) and chunk.get("content"):
                yield chunk["content"]


# Global singleton
_ai_service: Optional[AIServiceProvider] = None


def get_ai_service() -> AIServiceProvider:
    """Get or create the global AI service."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIServiceProvider()
    return _ai_service


# Convenience functions
def get_preferred_provider(private: bool = False) -> Optional[str]:
    """Get preferred AI provider (auto-selected)."""
    return get_ai_service().get_preferred_provider(private=private)


def complete(
    system_prompt: str,
    user_prompt: str,
    **kwargs,
) -> str:
    """Sync completion."""
    return get_ai_service().complete(system_prompt, user_prompt, **kwargs)


async def complete_async(
    system_prompt: str,
    user_prompt: str,
    **kwargs,
) -> str:
    """Async completion."""
    return await get_ai_service().complete_async(system_prompt, user_prompt, **kwargs)


async def stream_complete(
    system_prompt: str,
    user_prompt: str,
    **kwargs,
):
    """Async streaming completion."""
    async for chunk in get_ai_service().stream_complete(system_prompt, user_prompt, **kwargs):
        yield chunk
