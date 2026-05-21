import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class User extends Model {
  static table = 'users'

  @field('server_id') serverId!: string
  @field('name') name!: string
  @field('email') email!: string
  @field('role') role!: string
  @field('avatar_url') avatarUrl!: string | null
  @field('tenant_id') tenantId!: string

  @date('synced_at') syncedAt!: Date
  @readonly @date('created_at') createdAt!: Date
  @date('updated_at') updatedAt!: Date
}
