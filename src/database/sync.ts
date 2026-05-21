/**
 * WatermelonDB sync — pull from server, push local changes.
 * المزامنة في الخلفية — البيانات تُحفَظ محلياً أولاً.
 *
 * Protocol: Turbo Sync (WatermelonDB built-in)
 * Endpoint: GET /api/v1/sync/pull?last_pulled_at=<ts>&tenant_id=<id>
 *           POST /api/v1/sync/push
 */

import { synchronize } from '@nozbe/watermelondb/sync'
import { database } from './index'
import { getApiBaseUrl } from '../config/env'

const API = getApiBaseUrl()

export interface SyncOptions {
  authToken: string
  tenantId: string
}

export async function syncDatabase(opts: SyncOptions): Promise<void> {
  await synchronize({
    database,

    pullChanges: async ({ lastPulledAt }) => {
      const url = new URL(`${API}/api/v1/sync/pull`)
      url.searchParams.set('tenant_id', opts.tenantId)
      if (lastPulledAt) {
        url.searchParams.set('last_pulled_at', String(lastPulledAt))
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${opts.authToken}` },
      })
      if (!res.ok) throw new Error(`Sync pull failed: HTTP ${res.status}`)

      const { changes, timestamp } = await res.json()
      return { changes, timestamp }
    },

    pushChanges: async ({ changes, lastPulledAt }) => {
      const res = await fetch(`${API}/api/v1/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.authToken}`,
        },
        body: JSON.stringify({ changes, last_pulled_at: lastPulledAt }),
      })
      if (!res.ok) throw new Error(`Sync push failed: HTTP ${res.status}`)
    },

    migrationsEnabledAtVersion: 1,
  })
}
