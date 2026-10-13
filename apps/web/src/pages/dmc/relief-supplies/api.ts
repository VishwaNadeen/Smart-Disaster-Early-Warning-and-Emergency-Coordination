import type { Shelter } from './types'

// REVIEW [Config]: hard-coded URL breaks outside local dev - use import.meta.env.VITE_API_URL and make this the app-wide API client.
const API_URL = 'http://localhost:3000/api'

export async function apiRequest<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    const message = Array.isArray(result?.message)
      ? result.message.join(', ')
      : result?.message || `Request failed (${response.status}).`
    throw new Error(message)
  }

  return result as T
}

export function asArray<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]

  if (result && typeof result === 'object') {
    const data = result as Record<string, unknown>

    for (const key of ['data', 'items', 'supplies', 'shelters', 'distributions']) {
      const value = data[key]
      if (Array.isArray(value)) return value as T[]

      if (value && typeof value === 'object') {
        const nested = value as Record<string, unknown>
        for (const nestedKey of ['items', 'shelters', 'data']) {
          if (Array.isArray(nested[nestedKey])) {
            return nested[nestedKey] as T[]
          }
        }
      }
    }
  }

  return []
}

export function getId(value: string | { _id?: string; id?: string }) {
  return typeof value === 'string' ? value : value._id ?? value.id ?? ''
}

export function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function getShelterName(shelterId: Shelter | string, shelters: Shelter[]) {
  if (typeof shelterId === 'object') return shelterId.name

  return (
    shelters.find((shelter) => getId(shelter._id ?? shelter.id ?? '') === shelterId)
      ?.name ?? 'Shelter'
  )
}
