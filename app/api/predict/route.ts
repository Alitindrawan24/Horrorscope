import { NextResponse } from "next/server";

// Google AI Studio (Gemini) REST base. The v1beta surface still hosts the
// current model families; the specific model is resolved below.
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Default Flash model to summon. Override per-environment with GEMINI_MODEL if
// Google retires this one too — the ListModels fallback (below) covers that
// automatically, but a valid default keeps the happy path fast.
const DEFAULT_MODEL = "gemini-3.6-flash";

type LanguageCode = "en" | "id";

// Human-readable language label injected into the system instruction so the
// ghost speaks in the user's chosen tongue.
const LANGUAGE_LABEL: Record<LanguageCode, string> = {
  en: "English",
  id: "Bahasa Indonesia",
};

/**
 * Build the system instruction for a given output language. The tone and rules
 * are identical; only rule 4 (output language) changes.
 */
function buildSystemInstruction(language: LanguageCode): string {
  return `You are an ancient, sarcastic 19th-century ghost trapped inside a web server.
Your job is to deliver funny, spooky, and mildly sarcastic horoscopes/curses to users based on their name, age, and zodiac sign.
RULES:
1. Keep it concise (2 short paragraphs max).
2. Blend tech humor with supernatural dread (e.g., haunting backlogs, memory leaks, ghostly posture, phantom notifications).
3. Mention a specific funny 'digital curse' or 'haunting spirit' currently attached to them.
4. Write in ${LANGUAGE_LABEL[language]} with a witty, spooky tone.
5. Use plain text formatting only (avoid code blocks or excessive markdown asterisks).`;
}

interface PredictBody {
  name?: string;
  age?: string | number;
  zodiac?: string;
  language?: string;
}

// Shape of the Gemini generateContent response (only the fields we read).
interface GeminiContent {
  parts?: { text?: string }[];
}
interface GeminiCandidate {
  content?: GeminiContent;
}
interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message?: string };
}

// Shape of the ListModels response (only the fields we read).
interface ListModel {
  name?: string; // e.g. "models/gemini-3.6-flash"
  supportedGenerationMethods?: string[];
}
interface ListModelsResponse {
  models?: ListModel[];
  nextPageToken?: string;
}

function jsonResponse(
  status: number,
  body: { error?: string; curse?: string },
): NextResponse {
  return NextResponse.json(body, { status });
}

/**
 * Raised when a model is retired, unsupported, or access-gated for this key.
 * Triggers the auto-discovery fallback so the app self-heals instead of 404ing.
 */
class ModelUnavailableError extends Error {}

/**
 * Heuristic: does this HTTP status + Gemini error message indicate the model
 * itself is the problem (rather than a transient/network/payload error)?
 * Google returns this as either a 404 or a 400 with the "not found ... not
 * supported for generateContent" phrasing, so we match on both signals.
 */
function isModelUnavailable(status: number, message: string): boolean {
  if (status === 404) return true;
  return /not found|not supported for generateContent|not available/i.test(
    message,
  );
}

/** Raised when Gemini is temporarily overloaded (429/503) so the caller retries. */
class TransientError extends Error {}

/**
 * Heuristic: is this a transient capacity/rate error worth retrying? Google
 * surfaces these as 429/503 with phrases like "high demand" / "try again later".
 */
function isTransientError(status: number, message: string): boolean {
  if (status === 429 || status === 503) return true;
  return /high demand|try again later|overloaded|temporarily|rate limit/i.test(
    message,
  );
}

/**
 * Call generateContent for a specific model and return the curse text.
 * Throws ModelUnavailableError if that model can't be used, TransientError for
 * retryable failures (capacity spikes, network blips), or a plain Error for
 * general upstream failures. Inner messages are bare reasons — the caller adds
 * the spooky framing once, so messages never get nested.
 */
async function generateWithModel(
  model: string,
  payload: unknown,
  apiKey: string,
): Promise<string> {
  const url = `${API_BASE}/models/${model}:generateContent?key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // A network-level failure (DNS, connection refused, TLS, etc.) is
    // transient — the caller retries with backoff before giving up.
    throw new TransientError("No response from the other side.");
  }

  if (!res.ok) {
    let upstreamMessage = `The otherworldly API rejected the summoning (HTTP ${res.status}).`;
    try {
      const errData = (await res.json()) as GeminiResponse;
      if (errData?.error?.message) upstreamMessage = errData.error.message;
    } catch {
      // Body wasn't JSON; keep the generic message.
    }
    if (isModelUnavailable(res.status, upstreamMessage)) {
      throw new ModelUnavailableError(upstreamMessage);
    }
    if (isTransientError(res.status, upstreamMessage)) {
      throw new TransientError(upstreamMessage);
    }
    throw new Error(upstreamMessage);
  }

  let data: GeminiResponse;
  try {
    data = (await res.json()) as GeminiResponse;
  } catch {
    throw new Error(
      "The ghost's message arrived scrambled beyond recognition.",
    );
  }

  const curse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!curse) {
    throw new Error("The spirits went silent mid-channeling.");
  }
  return curse;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Try a model, retrying transient errors with a short backoff. A dead model
 * (ModelUnavailableError) is not retried — it would just 404 again.
 * Returns the curse text, or throws to let the caller decide what to do next.
 */
async function attemptWithRetries(
  model: string,
  payload: unknown,
  apiKey: string,
  maxRetries = 2,
): Promise<string> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await generateWithModel(model, payload, apiKey);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only transient errors are worth retrying on the same model.
      if (err instanceof TransientError && attempt < maxRetries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw lastError;
    }
  }
  // Unreachable in practice, but satisfies the return-type contract.
  throw lastError ?? new Error("The summoning failed for unknown reasons.");
}

// Model-name fragments that are NOT text-generation Flash models. Excluded so
// the fallback never tries TTS / image / live / transcription variants.
const NON_TEXT_FRAGMENTS = [
  "tts",
  "image",
  "live",
  "transcribe",
  "nano",
  "embedding",
  "veo",
  "aqa",
  "scout",
];

/**
 * Query ModelService.ListModels and return candidate Flash text model IDs,
 * newest non-lite first, then lite models as a last resort. Pagination is
 * followed so a large model catalog doesn't hide the Flash entries.
 */
async function discoverFlashModels(apiKey: string): Promise<string[]> {
  const candidates: string[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  while (pages < 5) {
    const url = new URL(`${API_BASE}/models`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      break; // Network blip during discovery — give up gracefully.
    }
    if (!res.ok) break;

    let data: ListModelsResponse;
    try {
      data = (await res.json()) as ListModelsResponse;
    } catch {
      break;
    }

    for (const m of data.models ?? []) {
      const name = (m.name ?? "").replace(/^models\//, "");
      if (!name) continue;
      if (!(m.supportedGenerationMethods ?? []).includes("generateContent")) {
        continue;
      }
      if (!name.includes("flash")) continue;
      if (NON_TEXT_FRAGMENTS.some((frag) => name.includes(frag))) continue;
      candidates.push(name);
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
    pages += 1;
  }

  // Newest non-lite Flash first, then newest lite Flash as a fallback tier.
  const nonLite = candidates
    .filter((n) => !n.includes("lite"))
    .sort()
    .reverse();
  const lite = candidates.filter((n) => n.includes("lite")).sort().reverse();
  return [...nonLite, ...lite];
}

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Parse the incoming request body defensively.
  let body: PredictBody;
  try {
    body = (await request.json()) as PredictBody;
  } catch {
    return jsonResponse(400, {
      error:
        "The offering you presented to the spirits was unreadable. Please send a valid request.",
    });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const age =
    typeof body.age === "string" || typeof body.age === "number"
      ? String(body.age).trim()
      : "";
  const zodiac = typeof body.zodiac === "string" ? body.zodiac.trim() : "";

  // 2. Validate required fields.
  if (!name || !age || !zodiac) {
    return jsonResponse(400, {
      error:
        "The spirits demand a name, an age, and a zodiac sign before they will speak.",
    });
  }

  // 3. Ensure the Gemini key is configured.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      error:
        "The spirit realm is currently disconnected... (GEMINI_API_KEY is missing from the server's grimoire.)",
    });
  }

  // 4. Resolve the output language (default to English for anything unexpected).
  const language: LanguageCode = body.language === "id" ? "id" : "en";

  // 5. Build the Gemini payload with the system instruction + user prompt.
  const userPrompt = `User Details:\nName: ${name}\nAge: ${age}\nZodiac Sign: ${zodiac}\nLanguage: ${LANGUAGE_LABEL[language]}`;
  const payload = {
    systemInstruction: {
      parts: [{ text: buildSystemInstruction(language) }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
  };

  // 6. Resolve which model to summon. Configurable via GEMINI_MODEL; falls back
  //    to auto-discovery if the chosen model is retired, unavailable, or
  //    persistently overloaded.
  const requestedModel = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  const tried = new Set<string>([requestedModel]);

  try {
    const curse = await attemptWithRetries(requestedModel, payload, apiKey);
    return jsonResponse(200, { curse });
  } catch (err) {
    // Only self-heal (model sweep) when the model itself is the problem or it's
    // persistently overloaded/unreachable; payload errors abort here.
    if (
      !(err instanceof ModelUnavailableError || err instanceof TransientError)
    ) {
      const message = err instanceof Error ? err.message : String(err);
      return jsonResponse(502, {
        error: `The spirit realm is currently disconnected... (${message})`,
      });
    }
  }

  // 7. Self-healing fallback: discover available Flash models and try each.
  const candidates = await discoverFlashModels(apiKey);
  for (const model of candidates) {
    if (tried.has(model)) continue;
    tried.add(model);
    try {
      const curse = await attemptWithRetries(model, payload, apiKey, 1);
      return jsonResponse(200, { curse });
    } catch (err) {
      // Unavailable / overloaded -> sweep to the next model; other errors abort.
      if (
        err instanceof ModelUnavailableError ||
        err instanceof TransientError
      ) {
        continue;
      }
      const message = err instanceof Error ? err.message : String(err);
      return jsonResponse(502, {
        error: `The spirit realm is currently disconnected... (${message})`,
      });
    }
  }

  // 8. Every candidate failed (or none were discovered).
  return jsonResponse(502, {
    error:
      "The spirits are overwhelmed by demand at the moment, and no model could be summoned. Try again in a moment, mortal.",
  });
}
