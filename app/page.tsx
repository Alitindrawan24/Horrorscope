"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Ghost,
  Sparkles,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  User,
  CalendarClock,
  Stars,
  Languages,
  Volume2,
  Square,
} from "lucide-react";

const ZODIAC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

// Unicode astrological glyph for each sign — rendered as the sign's logo.
const ZODIAC_SYMBOL: Record<ZodiacSign, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

type LanguageCode = "en" | "id";

const LANGUAGE_OPTIONS: { value: LanguageCode; label: string }[] = [
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
];

interface PredictResponse {
  curse?: string;
  error?: string;
}

export default function HorrorscopePage() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [zodiac, setZodiac] = useState<ZodiacSign | "">("");
  const [language, setLanguage] = useState<LanguageCode>("en");

  const [curse, setCurse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Text-to-speech state. Support is detected on mount (not during SSR) so the
  // disabled state never causes a hydration mismatch.
  const [speaking, setSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  useEffect(() => {
    setTtsSupported(
      typeof window !== "undefined" && "speechSynthesis" in window,
    );
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  // Stop playback whenever a new curse arrives or the language changes, so we
  // never read stale text or speak in the wrong tongue.
  useEffect(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, [curse, language]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Client-side guard so the spooky error messaging is consistent.
    if (!name.trim() || !age.trim() || !zodiac) {
      setError("The spirits demand a name, an age, and a zodiac sign...");
      setCurse("");
      return;
    }

    setLoading(true);
    setError("");
    setCurse("");
    setCopied(false);

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          age: age.trim(),
          zodiac,
          language,
        }),
      });

      const data: PredictResponse = await res.json();

      if (!res.ok || !data.curse) {
        setError(data.error ?? "The spirit realm is currently disconnected...");
        return;
      }

      setCurse(data.curse);
    } catch {
      setError(
        "A phantom fog severed the connection to the spirit realm. Try again, mortal.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!curse) return;
    try {
      await navigator.clipboard.writeText(curse);
      setCopied(true);
      // Reset the confirmation after a short beat so the button feels alive.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable in non-secure contexts; fail quietly.
      setCopied(false);
    }
  }

  function handleListen() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const synth = window.speechSynthesis;

    // Toggle off if already speaking.
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(curse);
    utterance.lang = language === "id" ? "id-ID" : "en-US";
    utterance.rate = 0.92; // slightly slower for a creepier cadence
    utterance.pitch = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    // Best-effort: pick a voice that matches the chosen language.
    const want = language === "id" ? "id" : "en";
    const match = synth
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith(want));
    if (match) utterance.voice = match;

    synth.cancel(); // clear any queued utterances first
    synth.speak(utterance);
    setSpeaking(true);
  }

  return (
    <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center px-4 py-12 sm:py-16">
      {/* Header */}
      <header className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 text-ectoplasm animate-flicker">
          <Ghost className="h-8 w-8" />
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="font-spooky text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">
          Horrorscope <span className="inline-block animate-flicker">👻</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-400 sm:text-base">
          What digital curse haunts your zodiac today?
        </p>
      </header>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-glow backdrop-blur-sm sm:p-8"
        noValidate
      >
        <div className="space-y-5">
          {/* Output Language */}
          <div>
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Languages className="h-4 w-4 text-ectoplasm" />
              Output Language
            </span>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map((opt) => {
                const active = language === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLanguage(opt.value)}
                    aria-pressed={active}
                    className={
                      "rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-ectoplasm/40 " +
                      (active
                        ? "border-ectoplasm bg-ectoplasm/15 text-ectoplasm"
                        : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-ectoplasm/50 hover:text-slate-200")
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
            >
              <User className="h-4 w-4 text-ectoplasm" />
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="off"
              placeholder="e.g. John"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder-slate-600 transition focus:border-ectoplasm focus:outline-none focus:ring-2 focus:ring-ectoplasm/40"
            />
          </div>

          {/* Age */}
          <div>
            <label
              htmlFor="age"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
            >
              <CalendarClock className="h-4 w-4 text-ectoplasm" />
              Age
            </label>
            <input
              id="age"
              name="age"
              type="number"
              min={0}
              max={150}
              inputMode="numeric"
              placeholder="e.g. 25"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder-slate-600 transition focus:border-ectoplasm focus:outline-none focus:ring-2 focus:ring-ectoplasm/40"
            />
          </div>

          {/* Zodiac */}
          <fieldset className="min-w-0 border-0 p-0">
            <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Stars className="h-4 w-4 text-ectoplasm" />
              Zodiac Sign
            </legend>
            <div className="grid grid-cols-6 gap-2">
              {ZODIAC_SIGNS.map((sign) => {
                const active = zodiac === sign;
                return (
                  <label
                    key={sign}
                    title={sign}
                    className={
                      "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 transition focus-within:ring-2 focus-within:ring-ectoplasm/40 " +
                      (active
                        ? "border-ectoplasm bg-ectoplasm/15 text-ectoplasm"
                        : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-ectoplasm/50 hover:text-slate-200")
                    }
                  >
                    <input
                      type="radio"
                      name="zodiac"
                      value={sign}
                      checked={active}
                      onChange={() => setZodiac(sign)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={
                        "text-xl leading-none sm:text-2xl " +
                        (active
                          ? "drop-shadow-[0_0_6px_rgba(16,185,129,0.7)]"
                          : "")
                      }
                    >
                      {ZODIAC_SYMBOL[sign]}
                    </span>
                    <span className="truncate text-[11px] font-medium sm:text-xs">
                      {sign}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-ectoplasm px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-ectoplasm/60 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Channeling Spirits...
            </>
          ) : (
            <>
              <Ghost className="h-5 w-5" />
              Summon My Curse
            </>
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mt-8 flex w-full items-start gap-3 rounded-xl border border-blood/40 bg-blood/10 px-5 py-4 text-sm text-red-200 animate-fade-in-up"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blood" />
          <p>{error}</p>
        </div>
      )}

      {/* Result */}
      {curse && !error && (
        <section
          aria-live="polite"
          className="relative mt-8 w-full animate-fade-in-up"
        >
          {/* Terminal / scroll box */}
          <div className="relative overflow-hidden rounded-2xl border border-ectoplasm/40 bg-slate-950/80 shadow-glow">
            {/* Terminal title bar */}
            <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-blood/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-ectoplasm/80" />
              <span className="ml-3 font-mono text-xs tracking-widest text-slate-500">
                CURSE_TRANSMISSION.txt
              </span>
            </div>

            {/* Curse body */}
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-emerald-100/90 sm:text-base">
                {curse}
              </pre>

              {/* Action buttons */}
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleListen}
                  disabled={!ttsSupported}
                  title={
                    ttsSupported
                      ? "Listen to the curse"
                      : "Your browser does not support speech playback"
                  }
                  className={
                    "inline-flex items-center gap-2 rounded-lg border border-ectoplasm/40 bg-slate-900/60 px-4 py-2 text-sm font-medium text-ectoplasm transition hover:bg-ectoplasm/10 focus:outline-none focus:ring-2 focus:ring-ectoplasm/50 disabled:cursor-not-allowed disabled:opacity-40" +
                    (speaking ? " animate-pulse" : "")
                  }
                >
                  {speaking ? (
                    <>
                      <Square className="h-4 w-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4" />
                      Listen
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-lg border border-ectoplasm/40 bg-slate-900/60 px-4 py-2 text-sm font-medium text-ectoplasm transition hover:bg-ectoplasm/10 focus:outline-none focus:ring-2 focus:ring-ectoplasm/50"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Curse Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Curse
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto pt-12 text-center text-xs text-slate-600">
        <p>
          Crafted for Hacktoberfest &ldquo;Ghost in the Machine&rdquo; · Powered
          by a ghost in the server
        </p>
      </footer>
    </main>
  );
}
