"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { sendTelegramCode, signInTelegram } from "../actions"

type Step = "phone" | "code" | "password" | "done"

export function AuthForm() {
  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [phoneCodeHash, setPhoneCodeHash] = useState("")
  const [sessionString, setSessionString] = useState("")
  const [error, setError] = useState("")

  async function handleSendCode() {
    setError("")
    try {
      const result = await sendTelegramCode(phone)
      setPhoneCodeHash(result.phoneCodeHash)
      setStep("code")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code")
    }
  }

  async function handleSignIn() {
    setError("")
    try {
      const result = await signInTelegram(
        phone,
        code,
        phoneCodeHash,
        password || undefined
      )
      setSessionString(result.session)
      setStep("done")
    } catch (err: unknown) {
      const error = err as { message?: string }
      if (error.message?.includes("SESSION_PASSWORD_NEEDED")) {
        setStep("password")
      } else {
        setError(error.message || "Sign in failed")
      }
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-green-600">Authenticated successfully.</p>
        <p className="text-xs text-muted-foreground">
          Add this to your Vercel environment variables as TG_SESSION, then
          redeploy:
        </p>
        <code className="block break-all rounded bg-muted p-2 text-xs">
          {sessionString}
        </code>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {step === "phone" && (
        <>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234567890"
          />
          <Button onClick={handleSendCode} className="w-full">
            Send Code
          </Button>
        </>
      )}

      {step === "code" && (
        <>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code from Telegram"
          />
          <Button onClick={handleSignIn} className="w-full">
            Verify
          </Button>
        </>
      )}

      {step === "password" && (
        <>
          <p className="text-sm">Two-factor authentication required.</p>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="2FA Password"
          />
          <Button onClick={handleSignIn} className="w-full">
            Submit
          </Button>
        </>
      )}
    </div>
  )
}
