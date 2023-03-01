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


## Scanning the QR Code

The server exposes a `/qrcode` endpoint that returns the QR image or the text "session already initialized" if the service has already logged in.
The endpoint is protected, so you need to call it like this: <your host>/qrcode?token=<auth token>. The auth token is any secret you want and you be added to as an env var (check .env.example).


> Inspired by this repo: https://github.com/ignusmx/chatwoot-whatsapp-web

## TODO

- Add support for contact attachments
- Add fault tolerance:
    - Check for unprocessed outgoing messages
    - Proxy webhook requests to a queue with dead-letter.
