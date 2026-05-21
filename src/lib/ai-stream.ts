/**
 * AI streaming client for React Native (alloulqai).
 * بث رموز الذكاء الاصطناعي في تطبيق الجوال — أول رمز في < 500ms.
 *
 * React Native fetch() supports streaming since RN 0.73+ via TextDecoder.
 * We parse SSE (text/event-stream) line-by-line.
 */

import { API_BASE_URL } from '../config/env'

export interface StreamMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type OnToken = (token: string) => void
export type OnDone = () => void
export type OnError = (err: Error) => void

const STREAM_ENDPOINT = `${API_BASE_URL}/v1/agent/chat/stream`

/**
 * Stream AI response tokens in React Native.
 * Returns a cancel function.
 */
export function streamChat(
  messages: StreamMessage[],
  {
    onToken,
    onDone,
    onError,
    mode = 'fast',
    authToken,
    brand = 'alloulq',
  }: {
    onToken: OnToken
    onDone?: OnDone
    onError?: OnError
    mode?: 'fast' | 'deep' | 'creative'
    authToken?: string
    brand?: string
  }
): () => void {
  let cancelled = false
  const abortController = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(STREAM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ messages, mode, brand }),
        // @ts-ignore — React Native fetch supports signal
        signal: abortController.signal,
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      // React Native 0.73+ supports streaming via res.body.getReader()
      // Fallback: read full text if streaming unavailable
      if (res.body && typeof res.body.getReader === 'function') {
        const reader = res.body.getReader()
        // TextDecoder is available in Hermes / JSI environment
        const decoder = new TextDecoder('utf-8')
        let buffer = ''

        while (!cancelled) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            const raw = line.slice(5).trim()
            if (raw === '[DONE]') {
              if (!cancelled) onDone?.()
              return
            }
            try {
              const chunk = JSON.parse(raw)
              if (chunk.token && !cancelled) onToken(chunk.token)
            } catch { /* skip malformed line */ }
          }
        }
      } else {
        // Polyfill: full response (non-streaming fallback)
        const text = await res.text()
        for (const line of text.split('\n')) {
          if (!line.startsWith('data:')) continue
          const raw = line.slice(5).trim()
          if (raw === '[DONE]') break
          try {
            const chunk = JSON.parse(raw)
            if (chunk.token && !cancelled) onToken(chunk.token)
          } catch { /* skip */ }
        }
      }

      if (!cancelled) onDone?.()
    } catch (err: unknown) {
      if (cancelled) return
      onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  })()

  return () => {
    cancelled = true
    abortController.abort()
  }
}
