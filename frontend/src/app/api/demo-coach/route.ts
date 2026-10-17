import { spawn } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import { repoRoot } from "@/lib/jobs";

export const runtime = "nodejs";

const CLIPS = {
  short: "frontend/src/data/result.json",
  long: "frontend/src/data/result-long.json",
} as const;

const LANGS = new Set(["fr", "de", "es", "pt"]);
const pending = new Map<string, Promise<boolean>>();

function run(root: string, clip: keyof typeof CLIPS, lang: string): Promise<boolean> {
  const key = `${clip}:${lang}`;
  const current = pending.get(key);
  if (current) return current;
  const job = new Promise<boolean>((resolve) => {
    const child = spawn(
      path.join(root, "backend", ".venv", "bin", "python"),
      [
        path.join(root, "backend", "scripts", "coach_clip.py"),
        "--result",
        path.join(/*turbopackIgnore: true*/ root, CLIPS[clip]),
        "--lang",
        lang,
        "--audio-dir",
        path.join(root, "frontend", "public", "coach-lang", clip, lang),
        "--audio-prefix",
        `/coach-lang/${clip}/${lang}`,
        "--out",
        path.join(root, "data", "demo-coach", clip, `${lang}.json`),
      ],
      { cwd: root, stdio: ["ignore", "ignore", "inherit"] },
    );
    const timer = setTimeout(() => {
      child.kill();
      resolve(false);
    }, 120_000);
    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  }).finally(() => {
    pending.delete(key);
  });
  pending.set(key, job);
  return job;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clip = url.searchParams.get("clip");
  const lang = url.searchParams.get("lang");
  if ((clip !== "short" && clip !== "long") || !lang || !LANGS.has(lang)) {
    return Response.json({ coach: null }, { status: 400 });
  }
  const root = repoRoot();
  const ok = await run(root, clip, lang);
  if (!ok) return Response.json({ coach: null }, { status: 502 });
  try {
    const coach = JSON.parse(
      await readFile(path.join(root, "data", "demo-coach", clip, `${lang}.json`), "utf8"),
    );
    return Response.json({ coach });
  } catch {
    return Response.json({ coach: null }, { status: 502 });
  }
}
