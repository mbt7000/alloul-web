/**
 * Write-while-offline queue — stores mutations locally when offline.
 * الكتابة بدون إنترنت: تُخزَّن العمليات وتُعاد عند الاتصال.
 *
 * Uses WatermelonDB `offline_queue` table.
 * Each operation is idempotent — replayed safely on reconnect.
 */

import { database } from '../database'
import NetInfo from '@react-native-community/netinfo'
import { getApiBaseUrl } from '../config/env'

const API = getApiBaseUrl()

export type QueueOperation = 'create' | 'update' | 'delete'

export interface QueuedWrite {
  operation: QueueOperation
  collection: string
  recordId: string
  payload: Record<string, unknown>
}

/**
 * Enqueue a write. Will execute immediately if online, queue if offline.
 */
export async function enqueueWrite(
  write: QueuedWrite,
  authToken: string
): Promise<void> {
  const state = await NetInfo.fetch()

  if (state.isConnected) {
    try {
      await _executeWrite(write, authToken)
      return
    } catch {
      // Fall through to queue
    }
  }

  // Store in local queue
  await database.write(async () => {
    await database.get('offline_queue').create((record: any) => {
      record.operation = write.operation
      record.collection = write.collection
      record.recordId = write.recordId
      record.payload = JSON.stringify(write.payload)
      record.attempts = 0
      record.createdAt = new Date()
    })
  })
}

/**
 * Flush all queued writes. Call on reconnect.
 * Returns { succeeded, failed } counts.
 */
export async function flushQueue(
  authToken: string
): Promise<{ succeeded: number; failed: number }> {
  const queue = await database.get('offline_queue').query().fetch()
  let succeeded = 0
  let failed = 0

  for (const item of queue as any[]) {
    try {
      const write: QueuedWrite = {
        operation: item.operation,
        collection: item.collection,
        recordId: item.recordId,
        payload: JSON.parse(item.payload),
      }
      await _executeWrite(write, authToken)
      await database.write(async () => {
        await item.destroyPermanently()
      })
      succeeded++
    } catch (err) {
      const attempts = item.attempts + 1
      if (attempts >= 5) {
        // Give up after 5 attempts
        await database.write(async () => {
          await item.update((r: any) => {
            r.attempts = attempts
            r.lastError = String(err)
          })
        })
      } else {
        await database.write(async () => {
          await item.update((r: any) => {
            r.attempts = attempts
            r.lastError = String(err)
          })
        })
      }
      failed++
    }
  }

  return { succeeded, failed }
}

async function _executeWrite(
  write: QueuedWrite,
  authToken: string
): Promise<void> {
  const { operation, collection, recordId, payload } = write
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  }

  if (operation === 'create') {
    await fetch(`${API}/api/v1/${collection}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  } else if (operation === 'update') {
    await fetch(`${API}/api/v1/${collection}/${recordId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    })
  } else if (operation === 'delete') {
    await fetch(`${API}/api/v1/${collection}/${recordId}`, {
      method: 'DELETE',
      headers,
    })
  }
}
