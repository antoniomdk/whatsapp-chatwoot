import { Client, Contact, GroupChat, GroupNotification, LocalAuth, MessageMedia } from 'whatsapp-web.js'
import qrcode from 'qrcode'
import { ChatwootAPI } from './chatwootAPI'
import { Config } from './config'

export default class WhatsApp {
  private clientRef: Client
  private _clientId: string
  private chatwootAPI: ChatwootAPI
  private _qrcode: string | null = null
  private config: Config

  public get client(): Client {
    return this.clientRef
  }

  public get clientId(): string {
    return this._clientId
  }

  public get qrcode(): string | null {
    return this._qrcode
  }

  constructor(clientId: string, config: Config, chatwootAPI: ChatwootAPI) {
    this._clientId = clientId
    this.config = config
    this.chatwootAPI = chatwootAPI
    this.chatwootAPI.whatsAppService = this

    const puppeteer = this.config.IN_DOCKER
      ? {
          headless: true,
          args: ['--no-sandbox'],
          executablePath: 'google-chrome-stable'
        }
      : {
          args: ['--no-sandbox']
        }

    this.clientRef = new Client({
      authStrategy: new LocalAuth({ clientId: this._clientId }),
      puppeteer: {
        // handleSIGINT: false,
        ...puppeteer
      }
    })

    this.clientRef.on('qr', (qr) => {
      console.log(
        'WhatsApp needs to connect, use the following to QR to authorize it.' +
          `(Account: ${this.config.CHATWOOT_ACCOUNT_ID}, Inbox: ${this.config.CHATWOOT_INBOX_ID})`
      )

      qrcode.toString(qr, { type: 'terminal', small: true }, (err, buffer) => {
        if (!err) {
          console.log(buffer)
        } else {
          console.error(err)
        }
      })

      this._qrcode = qr
    })

    this.clientRef.on('ready', () => {
      console.log(
        'WhatsApp client is ready' +
          `(Account: ${this.config.CHATWOOT_ACCOUNT_ID}, Inbox: ${this.config.CHATWOOT_INBOX_ID})`
      )
    })

    this.clientRef.on('message', async (message) => {
      if (message.broadcast) {
        return false
      }

      let attachment = null
      if (message.hasMedia) {
        attachment = await message.downloadMedia()
      }

      let messagePrefix: string | undefined
      let authorContact: Contact
      //if author != null it means the message was sent to a group chat
      //so we need to prefix the author's name
      if (message.author != null) {
        authorContact = await this.clientRef.getContactById(message.author)
        messagePrefix = `${authorContact.name ?? authorContact.pushname ?? authorContact.number}: `
      }

      this.chatwootAPI.broadcastMessageToChatwoot(message, 'incoming', attachment, messagePrefix)
    })

    this.clientRef.on('message_create', async (message) => {
      if (message.fromMe) {
        let attachment: MessageMedia | undefined

        const rawData = <{ self: string }>message.rawData
        //broadcast WA message to chatwoot only if it was created
        //from a real device/wa web and not from chatwoot app
        //to avoid endless loop
        if (rawData.self === 'in') {
          if (message.hasMedia) {
            attachment = await message.downloadMedia()
          }

          this.chatwootAPI.broadcastMessageToChatwoot(message, 'outgoing', attachment, '')
        }
      }
    })

    this.clientRef.on('group_join', async (groupNotification: GroupNotification) => {
      const groupChat: GroupChat = (await groupNotification.getChat()) as GroupChat
      this.chatwootAPI.updateChatwootConversationGroupParticipants(groupChat)
    })

    this.clientRef.on('group_leave', async (groupNotification: GroupNotification) => {
      const groupChat: GroupChat = (await groupNotification.getChat()) as GroupChat
      this.chatwootAPI.updateChatwootConversationGroupParticipants(groupChat)
    })
  }

  public initialize() {
    this.clientRef.initialize().catch((e) => {
      console.log(
        'Error: Unable to initialize WhatsApp.' +
          `(Account: ${this.config.CHATWOOT_ACCOUNT_ID}, Inbox: ${this.config.CHATWOOT_INBOX_ID})`
      )
    })
  }
}
