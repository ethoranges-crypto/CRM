"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type Step = "phone" | "code" | "password" | "done"

export function AuthForm() {
  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [phoneCodeHash, setPhoneCodeHash] = useState("")
  const [sessionString, setSessionString] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSendCode() {
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/telegram/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send code")
      setPhoneCodeHash(data.phoneCodeHash)
      setSessionString(data.sessionString)
      setStep("code")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code")
    } finally {
      setLoading(false)
    }
  }

  async function handleSignIn() {
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/telegram/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, phoneCodeHash, sessionString, password: password || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error?.includes("SESSION_PASSWORD_NEEDED")) {
          setStep("password")
          return
        }
        throw new Error(data.error || "Sign in failed")
      }
      setSessionString(data.session)
      setStep("done")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed")
    } finally {
      setLoading(false)
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-green-600">Authenticated successfully!</p>
        <p className="text-xs text-muted-foreground">
          Add this to your Vercel environment variables as TG_SESSION, then redeploy:
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
            placeholder="+447599456221"
          />
          <Button onClick={handleSendCode} className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Code"}
          </Button>
        </>
      )}

      {step === "code" && (
        <>
          <p className="text-sm text-muted-foreground">
            Enter the code Telegram sent to your phone.
          </p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="12345"
          />
          <Button onClick={handleSignIn} className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
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
          <Button onClick={handleSignIn} className="w-full" disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </Button>
        </>
      )}
    </div>
  )
}
