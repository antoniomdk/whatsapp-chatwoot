import { z } from 'zod'
import * as dotenv from 'dotenv'

const configSchema = z.object({
  PORT: z
    .string()
    .default('8080')
    .transform((x) => parseInt(x, 10))
    .refine((x) => x > 0, 'Port must be greater a positive number'),
  AUTH_TOKEN: z.string().min(1),
  CHATWOOT_API_ACCESS_TOKEN: z.string().min(1),
  CHATWOOT_API_URL: z.string().url(),
  CHATWOOT_ACCOUNT_ID: z
    .string()
    .min(1)
    .transform((x) => parseInt(x, 10)),
  CHATWOOT_INBOX_ID: z
    .string()
    .min(1)
    .transform((x) => parseInt(x, 10)),
  GROUP_CHAT_ATTRIBUTE_ID: z.string().min(1).default('participants'),
  IN_DOCKER: z
    .enum(['true', 'false'])
    .default('false')
    .transform((x) => x === 'true')
})

export type Config = z.infer<typeof configSchema>

export const loadConfig = (): Config => {
  dotenv.config()
  return configSchema.parse(process.env)
}
