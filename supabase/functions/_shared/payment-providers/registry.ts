import type { PixProvider } from './types.ts'
import { NovaeraProvider } from './novaera.ts'

// ── Provider Registry ──
// To add a new provider:
//   1. Create a file (e.g. hydra.ts) implementing PixProvider
//   2. Import it here
//   3. Add to pixProviders array in priority order
//
// The registry tries providers in order.
// If one fails or is unavailable, it falls through to the next.

function buildPixProviders(): PixProvider[] {
  const providers: PixProvider[] = []

  // Priority order — first available wins
  // Uncomment / add new providers as needed:
  // providers.push(new HydraProvider())

  providers.push(new NovaeraProvider())

  return providers
}

let _cachedProviders: PixProvider[] | null = null

function getPixProviders(): PixProvider[] {
  if (!_cachedProviders) {
    _cachedProviders = buildPixProviders()
  }
  return _cachedProviders
}

/** Reset cache — useful if env vars change at runtime */
export function resetProviderCache() {
  _cachedProviders = null
}

/**
 * Try to create a PIX using available providers in priority order.
 * Returns the result from the first provider that succeeds.
 * Throws if ALL providers fail.
 */
export async function createPixWithFallback(
  params: import('./types.ts').PixCreateParams
): Promise<import('./types.ts').PixCreateResult> {
  const providers = getPixProviders()
  const available = providers.filter(p => p.isAvailable())

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
  return getPixProviders().filter(p => p.isAvailable()).map(p => p.name)
}
