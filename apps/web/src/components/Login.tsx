
import { useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'

// Information returned by the backend after successful authentication.
export interface AuthUser {
  id: string
  fullName: string
  email: string
  phone?: string
  district?: string
  address?: string
  role: string
  isActive: boolean
  createdAt?: string
}

// Expected response from POST /auth/login.
interface LoginResponse {
  success: boolean
  message?: string
  data?: {
    user: AuthUser
    token: string
  }
}

interface LoginProps {
  onLogin: (token: string, user: AuthUser) => void
}

// Roles allowed to access the three dashboards.
const AUTHORIZED_ROLES = [
  'ADMIN',
  'SYSTEM_ADMIN',
  'DUTY_OFFICER',
  'DISTRICT_OFFICER',
  'SHELTER_STAFF',
]

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setIsLoading(true)

    try {
      // Call the existing NestJS login endpoint.
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const result = (await response.json()) as LoginResponse

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || 'Login failed. Please try again.')
      }

      const { user, token } = result.data

      // Only permit roles that have dashboards in this application.
      if (!AUTHORIZED_ROLES.includes(user.role)) {
        setError(
          'Your account does not have access to these dashboards. Please contact an administrator.',
        )
        return
      }

      if (!user.isActive) {
        setError('Your account is inactive. Please contact an administrator.')
        return
      }

      // Let App.tsx choose the correct dashboard for this role.
      onLogin(token, user)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to the server. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <ShieldCheck size={34} />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Disaster Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to your management portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-800"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <LoaderCircle size={19} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Access is restricted to authorized disaster management personnel.
        </p>
      </section>
    </main>
  )
}
