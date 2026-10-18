import shortDe from "@/data/demo-coach/short/de.json";
import shortEs from "@/data/demo-coach/short/es.json";
import shortFr from "@/data/demo-coach/short/fr.json";
import shortPt from "@/data/demo-coach/short/pt.json";
import longDe from "@/data/demo-coach/long/de.json";
import longEs from "@/data/demo-coach/long/es.json";
import longFr from "@/data/demo-coach/long/fr.json";
import longPt from "@/data/demo-coach/long/pt.json";

export const runtime = "nodejs";

const COACHES = {
  short: { de: shortDe, es: shortEs, fr: shortFr, pt: shortPt },
  long: { de: longDe, es: longEs, fr: longFr, pt: longPt },
} as const;

type ClipId = keyof typeof COACHES;
type DemoLang = keyof (typeof COACHES)["short"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clip = url.searchParams.get("clip");
  const lang = url.searchParams.get("lang");
  if ((clip !== "short" && clip !== "long") || !lang || !["de", "es", "fr", "pt"].includes(lang)) {
    return Response.json({ coach: null }, { status: 400 });
  }
  const coach = COACHES[clip as ClipId][lang as DemoLang];
  return Response.json({ coach });
}
