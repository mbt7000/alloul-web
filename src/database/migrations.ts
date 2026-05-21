import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations'

// Migrations start at version 2 — version 1 is the initial schema
export const migrations = schemaMigrations({
  migrations: [
    // Example v1→v2:
    // {
    //   toVersion: 2,
    //   steps: [
    //     addColumns({ table: 'tasks', columns: [{ name: 'tags', type: 'string', isOptional: true }] })
    //   ]
    // }
  ],
})
