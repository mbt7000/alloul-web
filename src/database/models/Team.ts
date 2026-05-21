import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class Team extends Model {
  static table = 'teams'

  @field('server_id') serverId!: string
  @field('name') name!: string
  @field('description') description!: string | null
  @field('tenant_id') tenantId!: string

  @date('synced_at') syncedAt!: Date
  @readonly @date('created_at') createdAt!: Date
  @date('updated_at') updatedAt!: Date
}
