import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"

// Create a fresh client per call — serverless functions don't share memory
// reliably across requests, and a stale singleton causes instanceof failures
export function getTelegramClient(): TelegramClient {
  const apiId = parseInt(process.env.TG_API_ID || "0")
  const apiHash = process.env.TG_API_HASH || ""
  const sessionStr = process.env.TG_SESSION || ""

  return new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
    connectionRetries: 3,
  })
}
