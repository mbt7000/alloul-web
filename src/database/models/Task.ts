import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class Task extends Model {
  static table = 'tasks'

  @field('server_id') serverId!: string
  @field('title') title!: string
  @field('description') description!: string | null
  @field('status') status!: string
  @field('priority') priority!: string
  @field('assignee_id') assigneeId!: string | null
  @field('tenant_id') tenantId!: string
  @field('is_dirty') isDirty!: boolean

  @date('due_date') dueDate!: Date | null
  @date('synced_at') syncedAt!: Date
  @readonly @date('created_at') createdAt!: Date
  @date('updated_at') updatedAt!: Date
}
