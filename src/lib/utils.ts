import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortenAddress(address: string, chars = 4) {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function generateEndpoint(endpoint: string) {
  const now = new Date()
  const midnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  )
  const timestamp = Math.floor(midnight.getTime() / 1000)
  const key = `${endpoint}-${timestamp}`
  const hash = Buffer.from(key)
    .toString('base64')
    .replace(/[/+=]/g, '')
    .slice(0, 32)

  return `${endpoint}/${hash}`
}
