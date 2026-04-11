import type { PixProvider } from './types.ts'
import { NovaeraProvider } from './novaera.ts'

// ── Provider Registry ──
// To add a new provider:
//   1. Create a file (e.g. bestfy.ts) implementing PixProvider
//   2. Import it here
//   3. Add to providerMap

const providerMap: Record<string, () => PixProvider> = {
  novaera: () => new NovaeraProvider(),
  // bestfy: () => new BestfyProvider(),  // Ready for Bestfy integration
}

let _cachedProviders: Record<string, PixProvider> = {}

function getProvider(name: string): PixProvider | null {
  if (!_cachedProviders[name]) {
    const factory = providerMap[name]
    if (!factory) return null
    _cachedProviders[name] = factory()
  }
  return _cachedProviders[name]
}

/** Reset cache — useful if env vars change at runtime */
export function resetProviderCache() {
  _cachedProviders = {}
}

/**
 * Create a PIX using a specific provider name (resolved from DB).
 * Falls back to the old priority-based approach if no name given.
 */
export async function createPixWithProvider(
  providerName: string,
  params: import('./types.ts').PixCreateParams
): Promise<import('./types.ts').PixCreateResult> {
  const provider = getProvider(providerName)
  if (!provider) {
    throw new Error(`Provider "${providerName}" is not registered. Available: ${Object.keys(providerMap).join(', ')}`)
  }
  if (!provider.isAvailable()) {
    throw new Error(`Provider "${providerName}" is registered but not available (missing credentials?)`)
  }
  console.log(`[provider-registry] using ${provider.name}`)
  return provider.createPix(params)
}

/**
 * Try to create a PIX using available providers in priority order (legacy fallback).
 */
export async function createPixWithFallback(
  params: import('./types.ts').PixCreateParams
): Promise<import('./types.ts').PixCreateResult> {
  const names = Object.keys(providerMap)
  const available = names.map(n => getProvider(n)!).filter(p => p.isAvailable())

  if (available.length === 0) {
    throw new Error('No payment providers are configured. Check environment variables.')
  }

  const errors: string[] = []

  for (const provider of available) {
    try {
      console.log(`[provider-registry] trying ${provider.name}...`)
      const result = await provider.createPix(params)
      console.log(`[provider-registry] ${provider.name} succeeded`)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[provider-registry] ${provider.name} failed: ${msg}`)
      errors.push(`${provider.name}: ${msg}`)
    }
  }

  throw new Error(`All payment providers failed: ${errors.join(' | ')}`)
}

/** Get list of available provider names (for health endpoint) */
export function getAvailableProviderNames(): string[] {
  return Object.keys(providerMap).filter(n => {
    const p = getProvider(n)
    return p?.isAvailable()
  })
}

/** Get all registered provider names */
export function getRegisteredProviderNames(): string[] {
  return Object.keys(providerMap)
}
