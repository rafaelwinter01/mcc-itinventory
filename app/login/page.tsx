"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Lock, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

const credentialsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

type CredentialsValues = z.infer<typeof credentialsSchema>

export default function LoginPage() {
  const router = useRouter()
  const [credentialsLoading, setCredentialsLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [step, setStep] = useState<"credentials" | "verify">("credentials")
  const [pendingUsername, setPendingUsername] = useState("")
  const [verificationCode, setVerificationCode] = useState("")

  const credentialsForm = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  async function onSubmitCredentials(values: CredentialsValues) {
    setCredentialsLoading(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (response.ok && data.pending2FA) {
        setPendingUsername(values.username)
        setStep("verify")
        setVerificationCode("")
        toast.success("Validation code sent to your email")
      } else {
        toast.error(data.error || "Invalid username or password")
      }
    } catch (error) {
      console.error("Login error:", error)
      toast.error("An error occurred during login")
    } finally {
      setCredentialsLoading(false)
    }
  }

  async function onSubmitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedCode = verificationCode.replace(/\D/g, "").slice(0, 6)
    if (!/^\d{6}$/.test(normalizedCode)) {
      toast.error("Code must be 6 digits")
      return
    }

    setVerifyLoading(true)
    try {
      const response = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: pendingUsername,
          code: normalizedCode,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Login successful")
        router.push("/")
        router.refresh()
        return
      }

      toast.error(data.error || "Invalid validation code")

      if (typeof data.error === "string" && data.error.includes("Start login again")) {
        setStep("credentials")
        setPendingUsername("")
        credentialsForm.reset({ username: "", password: "" })
        setVerificationCode("")
      }
    } catch (error) {
      console.error("Validation error:", error)
      toast.error("An error occurred while validating your code")
    } finally {
      setVerifyLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              {step === "credentials" ? (
                <Lock className="w-6 h-6 text-primary" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-primary" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {step === "credentials" ? "Login" : "Two-factor verification"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === "credentials"
              ? "Enter your credentials to access your account"
              : "Enter the 6-digit code sent to your email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <Form {...credentialsForm}>
              <form onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)} className="space-y-4">
                <FormField
                  control={credentialsForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={credentialsForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={credentialsLoading}>
                  {credentialsLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <form onSubmit={onSubmitCode} className="space-y-4">
                <div className="grid gap-2 justify-items-center">
                  <Label htmlFor="verification-code">Validation code</Label>
                  <InputOTP
                    id="verification-code"
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    containerClassName="justify-center"
                    value={verificationCode}
                    onChange={(value) => {
                      const nextValue = typeof value === "string" ? value : ""
                      const digitsOnly = nextValue.replace(/\D/g, "").slice(0, 6)
                      setVerificationCode(digitsOnly)
                    }}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className="w-full" disabled={verifyLoading}>
                  {verifyLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    "Validate code"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={verifyLoading}
                  onClick={() => {
                    setStep("credentials")
                    setPendingUsername("")
                    setVerificationCode("")
                  }}
                >
                  Back to login
                </Button>
              </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col">
          <p className="text-xs text-center text-muted-foreground mt-2">
            Inventory Management System - MCC BC
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
