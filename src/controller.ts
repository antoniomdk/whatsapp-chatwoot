import { Express } from 'express'
import { ChatwootAPI } from './chatwootAPI'
import { Contact, GroupChat, GroupParticipant, MessageContent, MessageMedia } from 'whatsapp-web.js'
import { Config } from './config'
import WhatsApp from './whatsapp'
import { ChatWootMessage } from './types'

export default class ExpressRoutes {
  public static configure(express: Express, whatsApp: WhatsApp, chatwootAPI: ChatwootAPI, config: Config) {
    express.get('/', async (req, res) => {
      res.status(200).json({
        status: 'OK',
        req: req.ip
      })
    })

    express.post('/chatwootMessage', async (req, res) => {
      try {
        const token = req.query.token
        const chatwootMessage = req.body as ChatWootMessage

        //validate we have a chatwootAPI and whatsapp web client configured for this inbox
        if (chatwootMessage.inbox.id !== config.CHATWOOT_INBOX_ID) {
          res.status(400).json({
            result: 'API Client not found for this inbox. Verify Chatwoot Whatsapp Web service configuration.'
          })
          return
        }

        //quick authentication with chatwoot api key
        if (token != config.AUTH_TOKEN) {
          res.status(401).json({
            result: 'Unauthorized access. Please provide a valid token.'
          })
          return
        }

        const whatsappWebClientState = await whatsApp.client.getState()
        //post to whatsapp only if we are connected to the client and message is not private
        if (
          whatsappWebClientState === 'CONNECTED' &&
          chatwootMessage.message_type == 'outgoing' &&
          !chatwootMessage.private
        ) {
          const chatwootContact = await chatwootAPI.getChatwootContactById(
            chatwootMessage.conversation.contact_inbox.contact_id
          )
          const messages = await chatwootAPI.getChatwootConversationMessages(chatwootMessage.conversation.id)
          const messageData = messages.find((message: any) => {
            return message.id === chatwootMessage.id
          })

          const to = `${chatwootContact.identifier}`
          let formattedMessage: string | undefined = chatwootMessage.content
          let messageContent: MessageContent | undefined

          const chatwootMentions: RegExpMatchArray | null =
            formattedMessage == null ? null : formattedMessage.match(/@("[^@"']+"|'[^@"']+'|[^@\s"']+)/g)
          const options: any = {}

          if (formattedMessage != null && chatwootMentions != null) {
            const whatsappMentions: Array<Contact> = []
            const groupChat: GroupChat = (await whatsApp.client.getChatById(to)) as GroupChat
            const groupParticipants: Array<GroupParticipant> = groupChat.participants
            for (const mention of chatwootMentions) {
              for (const participant of groupParticipants) {
                const mentionIdentifier = mention
                  .substring(1)
                  .replaceAll('+', '')
                  .replaceAll('"', '')
                  .replaceAll("'", '')
                  .toLowerCase()
                const participantIdentifier = `${participant.id.user}@${participant.id.server}`
                const contact: Contact = await whatsApp.client.getContactById(participantIdentifier)
                if (
                  (contact.name != null && contact.name.toLowerCase().includes(mentionIdentifier)) ||
                  (contact.pushname != null && contact.pushname.toLowerCase().includes(mentionIdentifier)) ||
                  contact.number.includes(mentionIdentifier)
                ) {
                  whatsappMentions.push(contact)
                  formattedMessage = formattedMessage.replace(mention, `@${participant.id.user}`)
                  break //we continue with next mention since we found our contact and there's no need to keep searching
                }
              }
            }
            options.mentions = whatsappMentions
          }

          if (messageData.attachments != null && messageData.attachments.length > 0) {
            const media = await MessageMedia.fromUrl(messageData.attachments[0].data_url)
            if (formattedMessage != null) {
              options.caption = formattedMessage
            }

            messageContent = media
          } else {
            messageContent = formattedMessage
          }

          if (messageContent != null) {
            whatsApp.client.sendMessage(to, messageContent, options)
          }
        }

        res.status(200).json({ result: 'message_sent_succesfully' })
      } catch {
        res.status(400).json({ result: 'exception_error' })
      }
    })
  }
}
