import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class Meeting extends Model {
  static table = 'meetings'

  @field('server_id') serverId!: string
  @field('title') title!: string
  @field('room_name') roomName!: string
  @field('status') status!: string
  @field('tenant_id') tenantId!: string
  @field('livekit_token') livekitToken!: string | null

  @date('starts_at') startsAt!: Date
  @date('ends_at') endsAt!: Date | null
  @date('synced_at') syncedAt!: Date
  @readonly @date('created_at') createdAt!: Date
  @date('updated_at') updatedAt!: Date
}
