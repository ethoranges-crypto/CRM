import { TelegramClient, sessions } from "telegram"

// Import StringSession via the main "telegram" export — NOT "telegram/sessions"
// This ensures TelegramClient and StringSession come from the same module
// instance, so the instanceof check inside TelegramClient passes correctly.
const { StringSession } = sessions

export function getTelegramClient(): TelegramClient {
  const apiId = parseInt(process.env.TG_API_ID || "0")
  const apiHash = process.env.TG_API_HASH || ""
  const sessionStr = process.env.TG_SESSION || ""

  return new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
    connectionRetries: 3,
  })
}
