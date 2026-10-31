import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Horrorscope 👻 | What digital curse haunts your zodiac today?",
  description:
    "A sarcastic, AI-powered cosmic dread and digital curse generator. Summon a spooky horoscope cursed by an ancient ghost trapped inside a web server.",
  keywords: [
    "horrorscope",
    "horoscope",
    "hacktoberfest",
    "ghost in the machine",
    "AI curse generator",
    "zodiac",
  ],
  openGraph: {
    title: "Horrorscope 👻",
    description:
      "Summon a spooky, sarcastic digital curse for your zodiac sign.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-ectoplasm/30 selection:text-emerald-50">
        {children}
      </body>
    </html>
  );
}
