import { z } from 'zod'

export const messageSchema = z.object({
  account: z.object({ id: z.number(), name: z.string() }),
  additional_attributes: z.object({}),
  content_attributes: z.object({}),
  content_type: z.string(),
  content: z.string(),
  conversation: z.object({
    additional_attributes: z.object({}),
    can_reply: z.boolean(),
    channel: z.string(),
    contact_inbox: z.object({
      id: z.number(),
      contact_id: z.number(),
      inbox_id: z.number(),
      source_id: z.string(),
      created_at: z.string(),
      updated_at: z.string(),
      hmac_verified: z.boolean(),
      pubsub_token: z.string()
    }),
    id: z.number(),
    inbox_id: z.number(),
    messages: z.array(
      z.object({
        id: z.number(),
        content: z.string(),
        account_id: z.number(),
        inbox_id: z.number(),
        conversation_id: z.number(),
        message_type: z.number(),
        created_at: z.number(),
        updated_at: z.string(),
        private: z.boolean(),
        status: z.string(),
        source_id: z.null(),
        content_type: z.string(),
        content_attributes: z.object({}),
        sender_type: z.string(),
        sender_id: z.number(),
        external_source_ids: z.object({}),
        additional_attributes: z.object({}),
        label_list: z.null(),
        conversation: z.object({
          assignee_id: z.number(),
          unread_count: z.number()
        }),
        sender: z.object({
          id: z.number(),
          name: z.string(),
          available_name: z.string(),
          avatar_url: z.string(),
          type: z.string(),
          availability_status: z.null(),
          thumbnail: z.string()
        })
      })
    ),
    labels: z.array(z.unknown()),
    meta: z.object({
      sender: z.object({
        additional_attributes: z.object({}),
        custom_attributes: z.object({
          id: z.string(),
          isMe: z.boolean(),
          msgs: z.null(),
          name: z.string(),
          type: z.string(),
          isPSA: z.boolean(),
          isSmb: z.boolean(),
          isUser: z.boolean(),
          pushname: z.string(),
          shortName: z.string(),
          'wa:number': z.string(),
          isBusiness: z.boolean(),
          isMyContact: z.boolean(),
          isWAContact: z.boolean(),
          isEnterprise: z.boolean(),
          formattedName: z.string(),
          profilePicThumbObj: z.object({
            id: z.string(),
            img: z.string(),
            tag: z.string(),
            eurl: z.string(),
            imgFull: z.string()
          }),
          isContactSyncCompleted: z.number()
        }),
        email: z.null(),
        id: z.number(),
        identifier: z.string(),
        name: z.string(),
        phone_number: z.string(),
        thumbnail: z.string(),
        type: z.string()
      }),
      assignee: z.object({
        id: z.number(),
        name: z.string(),
        available_name: z.string(),
        avatar_url: z.string(),
        type: z.string(),
        availability_status: z.null(),
        thumbnail: z.string()
      }),
      team: z.null(),
      hmac_verified: z.boolean()
    }),
    status: z.string(),
    custom_attributes: z.object({}),
    snoozed_until: z.null(),
    unread_count: z.number(),
    first_reply_created_at: z.string(),
    agent_last_seen_at: z.number(),
    contact_last_seen_at: z.number(),
    timestamp: z.number(),
    created_at: z.number()
  }),
  created_at: z.string(),
  id: z.number(),
  inbox: z.object({ id: z.number(), name: z.string() }),
  message_type: z.string(),
  private: z.boolean(),
  sender: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    type: z.string()
  }),
  source_id: z.null(),
  event: z.string()
})

export type ChatWootMessage = z.infer<typeof messageSchema>
