import winston from 'winston'
import expressWinston from 'express-winston'
import { WinstonTransport as AxiomTransport } from '@axiomhq/axiom-node'

const transports: any[] = [
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.json())
  })
]

if (process.env.AXIOM_DATASET && process.env.AXIOM_ORG && process.env.AXIOM_TOKEN) {
  transports.push(
    new AxiomTransport({
      token: process.env.AXIOM_TOKEN,
      orgId: process.env.AXIOM_ORG,
      dataset: process.env.AXIOM_DATASET
    })
  )
}

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'whatsapp-service' },
  transports
})

export const loggingMiddleware = expressWinston.logger({
  transports: transports,
  format: winston.format.json(),
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false,
  ignoreRoute: (req, res) => false
})
