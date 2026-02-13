import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"

let client: TelegramClient | null = null

export function getTelegramClient(): TelegramClient {
  if (client) return client

  const apiId = parseInt(process.env.TG_API_ID || "0")
  const apiHash = process.env.TG_API_HASH || ""
  const sessionStr = process.env.TG_SESSION || ""

  client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
    connectionRetries: 5,
  })

  return client
}

export function clearClient() {
  client = null
}
