# WhatsApp Web for Chatwoot

## Features
- Custom API channel for Chatwoot
- Uses WhatsApp web, so it works for both regular and business accounts.
- Supports incoming audio/images/gifs/stickers
- Supports outgoing audio/images

## Setup for development

1. Clone this repo
2. Install dependencies `yarn install`
3. Build server `yarn build`
4. Create .env file (check .env.example)
5. Run server `yarn start`


## Deployment

Use the provided dockerfile to deploy in Dokku/Heroku, DigitalOcean, etc.


> Inspired by this repo: https://github.com/ignusmx/chatwoot-whatsapp-web