/**
 * WatermelonDB schema — offline-first data layer for alloulqai.
 * البيانات تُحمَّل محلياً أولاً — يعمل بدون إنترنت.
 *
 * Install: npx expo install @nozbe/watermelondb
 *          npx expo install @nozbe/with-observables
 * Add to babel.config.js:
 *   plugins: ['@nozbe/watermelondb/babel/plugin']
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string', isIndexed: true },
        { name: 'role', type: 'string' },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'synced_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'teams',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'synced_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'priority', type: 'string' },
        { name: 'assignee_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'is_dirty', type: 'boolean' }, // pending sync
        { name: 'synced_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'meetings',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'room_name', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'starts_at', type: 'number' },
        { name: 'ends_at', type: 'number', isOptional: true },
        { name: 'tenant_id', type: 'string', isIndexed: true },
        { name: 'livekit_token', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Write-while-offline queue
    tableSchema({
      name: 'offline_queue',
      columns: [
        { name: 'operation', type: 'string' }, // 'create' | 'update' | 'delete'
        { name: 'collection', type: 'string' }, // table name
        { name: 'record_id', type: 'string' },
        { name: 'payload', type: 'string' }, // JSON
        { name: 'attempts', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
})
