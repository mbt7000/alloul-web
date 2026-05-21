/**
 * WatermelonDB database instance.
 * Uses Expo SQLite adapter — works on iOS, Android, and Web.
 */

import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/expo-sqlite'
import { schema } from './schema'
import { migrations } from './migrations'

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true, // 10× faster via JSI bridge (requires JSI-enabled Expo build)
  onSetUpError: (error) => {
    console.error('[WatermelonDB] Setup error:', error)
  },
})

export const database = new Database({
  adapter,
  modelClasses: [], // populated in models/index.ts — circular import avoidance
})

export { database as db }
