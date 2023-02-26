import express from 'express'
import { ChatwootAPI } from './chatwootAPI'
import { loadConfig } from './config'
import WhatsApp from './whatsapp'

const config = loadConfig()
const expressApp = express()

expressApp.use(
  express.json(),
  express.urlencoded({
    extended: true
  })
)

// init api server
expressApp.listen(config.PORT, () => {
  console.log('Server started on port', config.PORT)
  const chatwootApi = new ChatwootAPI(config)
  const whatsapp = new WhatsApp(`inbox_${config.CHATWOOT_INBOX_ID}`, config, chatwootApi)
  whatsapp.client.on('ready', () => {
    console.log('WhatsApp Web client succesfully initialized.')
  })
  whatsapp.initialize()
})
