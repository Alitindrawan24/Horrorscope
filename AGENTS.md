Act as an expert Next.js 14 and React developer. Build a single-page spooky web application called "Horrorscope" for the Hacktoberfest "Ghost in the Machine" challenge — a sarcastic, AI-powered cosmic dread and digital curse generator.

TECH STACK:
- Next.js 14 (App Router)
- Tailwind CSS (Spooky dark aesthetic with glowing borders and atmospheric accents)
- TypeScript
- Lucide React (for icons)
- Google AI Studio API (Gemini 1.5 Flash via native REST fetch)

CORE REQUIREMENTS & ARCHITECTURE:

1. UI/UX (`app/page.tsx`):
   - Dark, atmospheric theme (e.g., slate-950 background, glowing emerald green, purple, or crimson red accents).
   - Header: Title "Horrorscope 👻" with subtitle "What digital curse haunts your zodiac today?".
   - Input Form:
     * Name (Text input, e.g., "John")
     * Age (Number input, e.g., "25")
     * Zodiac Sign (Select dropdown: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces)
   - Primary Submit Button: "Summon My Curse" (Loading state: "Channeling Spirits...").
   - Result Display Section:
     * Appears smoothly with an animation when the response arrives.
     * Styled like an eerie ancient scroll or glowing terminal box.
     * Displays the spooky/sarcastic reading cleanly.
     * Includes a "Copy Curse" button to easily copy the output to the clipboard.

2. Backend API Route (`app/api/predict/route.ts`):
   - Create a POST route accepting `{ name, age, zodiac }`.
   - Use standard `fetch` to call Google AI Studio API endpoint:
     `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
   - Structure the JSON payload with `systemInstruction` and `contents`:
     SYSTEM INSTRUCTION:
     "You are an ancient, sarcastic 19th-century ghost trapped inside a web server. 
     Your job is to deliver funny, spooky, and mildly sarcastic horoscopes/curses to users based on their name, age, and zodiac sign.
     RULES:
     1. Keep it concise (2 short paragraphs max).
     2. Blend tech humor with supernatural dread (e.g., haunting backlogs, memory leaks, ghostly posture, phantom notifications).
     3. Mention a specific funny 'digital curse' or 'haunting spirit' currently attached to them.
     4. Write in English with a witty, spooky tone.
     5. Use plain text formatting only (avoid code blocks or excessive markdown asterisks)."
   - USER PROMPT CONTENT:
     "User Details:\nName: {name}\nAge: {age}\nZodiac Sign: {zodiac}"

3. Error Handling & Polish:
   - Handle missing inputs (400 validation) and missing `GEMINI_API_KEY` or API fetch failures (500/502 handling) with friendly spooky error messages ("The spirit realm is currently disconnected...").
   - Ensure clean typing and state management.

Please provide the complete, production-ready code for `app/page.tsx` and `app/api/predict/route.ts`.