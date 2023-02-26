import axios, { AxiosInstance } from 'axios'
import { Message, Chat, GroupChat, Contact } from 'whatsapp-web.js'
import FormData from 'form-data'
import MimeTypes from 'mime-types'
import WhatsApp from './whatsapp'
import { Config } from './config'

export class ChatwootAPI {
  private config: Config
  public whatsAppService: WhatsApp | undefined
  private axiosInstance: AxiosInstance

  constructor(config: Config, whatsappService?: WhatsApp) {
    this.config = config
    this.whatsAppService = whatsappService
    this.axiosInstance = axios.create({
      baseURL: `${this.config.CHATWOOT_API_URL}/accounts/${this.config.CHATWOOT_ACCOUNT_ID}`,
      headers: {
        api_access_token: this.config.CHATWOOT_API_ACCESS_TOKEN
      }
    })
  }

  async broadcastMessageToChatwoot(message: Message, type: string, attachment: any, messagePrefix: string | undefined) {
    const { CHATWOOT_INBOX_ID: chatwootInboxId } = this.config

    let chatwootConversation: any = null
    let contactNumber = ''
    let contactName = ''

    const messageChat: Chat = await message.getChat()
    const contactIdentifier = `${messageChat.id.user}@${messageChat.id.server}`
    const sourceId = 'WhatsappWeb.js:' + contactIdentifier

    //we use the chat name as the chatwoot contact name
    //when chat is private, the name of the chat represents the contact's name
    //when chat is group, the name of the chat represents the group name
    contactName = messageChat.name

    //if chat is group chat, whe use the name@groupId as the query to search for the contact
    //otherwhise we search by phone number
    if (!messageChat.isGroup) {
      contactNumber = `+${messageChat.id.user}`
    }

    let chatwootContact = await this.findChatwootContactByIdentifier(contactIdentifier)

    if (chatwootContact == null) {
      chatwootContact = await this.findChatwootContactByPhone(contactNumber)

      if (chatwootContact == null) {
        const result = <{ contact: object }>(
          await this.makeChatwootContact(chatwootInboxId, contactName, contactNumber, contactIdentifier)
        )
        chatwootContact = result.contact
      } else {
        //small improvement to update identifier on contacts who don't have WA identifier
        const updatedData = { identifier: contactIdentifier }
        await this.updateChatwootContact(chatwootContact.id, updatedData)
      }
    } else {
      chatwootConversation = await this.getChatwootContactConversationByInboxId(chatwootContact.id, chatwootInboxId)
    }

    if (chatwootConversation == null) {
      chatwootConversation = await this.makeChatwootConversation(sourceId, chatwootInboxId, chatwootContact.id)

      //we set the group members if conversation is a group chat
      if (messageChat.isGroup) {
        this.updateChatwootConversationGroupParticipants(messageChat as GroupChat)
      }
    }

    //if message to post on chatwoot is outgoing
    //it means it was created from other WA cliente (web or device)
    //therefore we mark it as private so we can filter it
    //when receiving it from the webhook (in later steps) to avoid duplicated messages
    let isPrivate = false
    if (type == 'outgoing') {
      isPrivate = true
    }

    await this.postChatwootMessage(
      chatwootConversation.id as string,
      message.body,
      type,
      isPrivate,
      messagePrefix,
      attachment
    )
  }

  async findChatwootContactByIdentifier(identifier: string) {
    const contacts = await this.searchChatwootContacts(identifier)
    if (contacts.length > 0) {
      for (const contact of contacts) {
        //in order to retrieve a chatwoot contact by identifier,
        //we search contacts with query, however this can get false positives
        //since query searches for the value in several fields, not just identifier
        //so we add extra validation to ensure the retrieved contact's identifier
        //actually matches searched one
        if (contact.identifier == identifier) {
          return contact
        }
      }
    }
    return null
  }

  async findChatwootContactByPhone(phone: string) {
    const contacts = await this.searchChatwootContacts(phone)
    if (contacts.length > 0) {
      for (const contact of contacts) {
        //in order to retrieve a chatwoot contact by phone,
        //we search contacts with query, however this can get false positives
        //since query searches for the value in several fields, not just phone number
        //so we add extra validation to ensure the retrieved contact's phone number
        //actually matches searched one
        if (contact.phone_number == phone) {
          return contact
        }
      }
    }
    return null
  }

  async searchChatwootContacts(query: string) {
    const {
      data: { payload }
    } = await this.axiosInstance.get(`/contacts/search?q=${query}`)

    return payload
  }

  async getChatwootContactById(id: string | number) {
    const {
      data: { payload }
    } = await this.axiosInstance.get(`/contacts/${id}`)

    return payload
  }

  async makeChatwootContact(
    inboxId: string | number,
    name: string,
    phoneNumber: string,
    identifier: string | undefined
  ) {
    const contactPayload = {
      inbox_id: inboxId,
      name: name,
      phone_number: phoneNumber,
      identifier: identifier
    }

    const {
      data: { payload }
    } = <{ data: Record<string, unknown> }>await this.axiosInstance.post('/contacts', contactPayload)
    return payload
  }

  async updateChatwootContact(contactId: string | number, updatedData: any) {
    const {
      data: { payload }
    } = <{ data: Record<string, unknown> }>await this.axiosInstance.put(`/contacts/${contactId}`, updatedData)

    return payload
  }

  async makeChatwootConversation(sourceId: string | number, inboxId: string | number, contactId: string | number) {
    const conversationPayload = {
      source_id: sourceId,
      inbox_id: inboxId,
      contact_id: contactId
    }
    const { data } = <{ data: Record<string, unknown> }>(
      await this.axiosInstance.post('/conversations', conversationPayload)
    )
    return data
  }

  async updateChatwootConversationGroupParticipants(whatsappGroupChat: GroupChat) {
    if (!this.whatsAppService) {
      return
    }

    const contactIdentifier = `${whatsappGroupChat.id.user}@${whatsappGroupChat.id.server}`

    const participantLabels: Array<string> = []
    for (const participant of whatsappGroupChat.participants) {
      const participantIdentifier = `${participant.id.user}@${participant.id.server}`
      const participantContact: Contact = await this.whatsAppService.client.getContactById(participantIdentifier)
      const participantName: string =
        participantContact.name ?? participantContact.pushname ?? '+' + participantContact.number
      const participantLabel = `[${participantName} - +${participantContact.number}]`
      participantLabels.push(participantLabel)
    }
    const conversationCustomAttributes = {
      custom_attributes: {
        [this.config.GROUP_CHAT_ATTRIBUTE_ID]: participantLabels.join(',')
      }
    }

    const chatwootContact = await this.findChatwootContactByIdentifier(contactIdentifier)
    const chatwootConversation = await this.getChatwootContactConversationByInboxId(
      chatwootContact.id,
      this.config.CHATWOOT_INBOX_ID
    )
    this.updateChatwootConversationCustomAttributes(chatwootConversation.id, conversationCustomAttributes)
  }

  async updateChatwootConversationCustomAttributes(conversationId: string | number, customAttributes: any) {
    const { data } = <{ data: Record<string, unknown> }>(
      await this.axiosInstance.post(`/conversations/${conversationId}/custom_attributes`, customAttributes)
    )
    return data
  }

  async postChatwootMessage(
    conversationId: string | number,
    message: string,
    type: string,
    isPrivate = false,
    messagePrefix?: string,
    attachment?: any
  ) {
    const bodyFormData: FormData = new FormData()

    if (messagePrefix != null) {
      message = messagePrefix + message
    }

    bodyFormData.append('content', message)
    bodyFormData.append('message_type', type)
    bodyFormData.append('private', isPrivate.toString())

    if (attachment != null) {
      const buffer = Buffer.from(attachment.data, 'base64')
      const extension = MimeTypes.extension(attachment.mimetype)
      const attachmentFilename = attachment.filename ?? 'attachment.' + extension
      bodyFormData.append('attachments[]', buffer, attachmentFilename)
    }

    const { data } = <{ data: Record<string, unknown> }>await this.axiosInstance.postForm(
      `/conversations/${conversationId}/messages`,
      bodyFormData,
      {
        headers: {
          ...bodyFormData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    )

    return data
  }

  async getChatwootContactConversations(contactId: string | number) {
    const {
      data: { payload }
    } = await this.axiosInstance.get(`/contacts/${contactId}/conversations`)

    return payload
  }

  async getChatwootContactConversationByInboxId(contactId: string | number, inboxId: string | number) {
    const chatwootConversations = await this.getChatwootContactConversations(contactId)
    const chatwootConversation = chatwootConversations.find((conversation: any) => {
      return conversation.inbox_id == inboxId
    })
    return chatwootConversation
  }

  async getChatwootConversationMessages(conversationId: string | number) {
    const {
      data: { payload }
    } = await this.axiosInstance.get(`/conversations/${conversationId}/messages`)
    return payload
  }
}
