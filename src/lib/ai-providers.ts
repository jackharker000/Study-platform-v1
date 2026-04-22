/**
 * Multi-provider AI layer.
 * Primary: OpenRouter (25 keys, routes to any model).
 * Text fallback: Groq (6 keys, fastest free-tier).
 * Vision fallback: Gemini direct API (14 keys, native multimodal).
 *
 * Rule: every callAI() call has at least one automatic fallback.
 */

function collectKeys(base: string, n: number): string[] {
  const keys: string[] = []
  const first = process.env[base]
  if (first) keys.push(first)
  for (let i = 2; i <= n; i++) {
    const k = process.env[`${base}_${i}`]
    if (k) keys.push(k)
  }
  return keys
}

const pools = {
  openrouter: collectKeys('OPENROUTER_API_KEY', 25),
  groq:       collectKeys('GROQ_API_KEY', 6),
  gemini:     collectKeys('GEMINI_API_KEY', 14),
}

const cursors: Record<string, number> = { openrouter: 0, groq: 0, gemini: 0 }

function nextKey(provider: keyof typeof pools): string | null {
  const keys = pools[provider]
  if (!keys.length) return null
  const key = keys[cursors[provider] % keys.length]
  cursors[provider]++
  return key
}

export type ModelSpec = { via: keyof typeof pools; model: string }

export const TEXT_MODELS = {
  fast: {
    primary:  { via: 'openrouter', model: 'google/gemini-2.0-flash-001' },
    fallback: { via: 'groq',       model: 'llama-3.1-8b-instant' },
  },
  medium: {
    primary:  { via: 'openrouter', model: 'deepseek/deepseek-chat-v3-0324' },
    fallback: { via: 'groq',       model: 'llama-3.3-70b-versatile' },
  },
  large: {
    primary:  { via: 'openrouter', model: 'anthropic/claude-sonnet-4-6' },
    fallback: { via: 'groq',       model: 'llama-3.3-70b-versatile' },
  },
} as const

export const VISION_MODELS = {
  fast: {
    primary:  { via: 'openrouter', model: 'google/gemini-2.0-flash-001' },
    fallback: { via: 'gemini',     model: 'gemini-2.0-flash' },
  },
  strong: {
    primary:  { via: 'openrouter', model: 'anthropic/claude-sonnet-4-6' },
    fallback: { via: 'gemini',     model: 'gemini-2.0-flash' },
  },
} as const

export function selectTextModel(msMarks: number | null, isMcq: boolean) {
  if (isMcq || (msMarks ?? 0) <= 3) return TEXT_MODELS.fast
  if ((msMarks ?? 0) <= 6) return TEXT_MODELS.medium
  return TEXT_MODELS.large
}

export function selectVisionModel(msMarks: number | null) {
  return (msMarks ?? 0) >= 6 ? VISION_MODELS.strong : VISION_MODELS.fast
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string | object[] }
type AIResponse = { choices: { message: { content: string } }[] }

async function callSpec(spec: ModelSpec, messages: ChatMessage[], opts: object): Promise<AIResponse> {
  const key = nextKey(spec.via)
  if (!key) throw new Error(`No API keys configured for provider: ${spec.via}`)

  const url = spec.via === 'gemini'
    ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions'

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: spec.model, messages, ...opts }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${spec.via}/${spec.model} HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

export async function callAI(
  tier: { primary: ModelSpec; fallback: ModelSpec },
  messages: ChatMessage[],
  opts: object = {}
): Promise<AIResponse> {
  try {
    return await callSpec(tier.primary as ModelSpec, messages, opts)
  } catch (primaryErr) {
    console.warn(`[ai-providers] primary (${(tier.primary as ModelSpec).via}/${(tier.primary as ModelSpec).model}) failed:`, primaryErr)
    try {
      return await callSpec(tier.fallback as ModelSpec, messages, opts)
    } catch (fallbackErr) {
      console.error(`[ai-providers] fallback (${(tier.fallback as ModelSpec).via}/${(tier.fallback as ModelSpec).model}) also failed:`, fallbackErr)
      throw fallbackErr
    }
  }
}

export function extractText(response: AIResponse): string {
  return response.choices?.[0]?.message?.content ?? ''
}
