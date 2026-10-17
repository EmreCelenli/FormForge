import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { repoRoot } from "@/lib/jobs";

export const runtime = "nodejs";

const MAX_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const video = form.get("video");
  if (!(video instanceof File)) {
    return Response.json({ error: "Choose a video file." }, { status: 400 });
  }
  const allowed = video.type.startsWith("video/") || /\.(mp4|mov)$/i.test(video.name);
  if (!allowed) {
    return Response.json({ error: "Choose a video file." }, { status: 400 });
  }
  if (video.size <= 0 || video.size > MAX_BYTES) {
    return Response.json({ error: "That video is larger than 100 MB." }, { status: 413 });
  }

  const id = randomUUID();
  const root = repoRoot();
  const dir = path.join(root, "data", "jobs", id);
  const extension = video.name.toLowerCase().endsWith(".mov") ? ".mov" : ".mp4";
  const source = path.join(dir, `source${extension}`);
  await mkdir(dir, { recursive: true });
  await writeFile(source, Buffer.from(await video.arrayBuffer()));
  await writeFile(
    path.join(dir, "state.json"),
    JSON.stringify({ job_id: id, status: "queued", progress: 0 }),
  );

  const requested = String(form.get("lang") ?? "en");
  const lang = ["en", "fr", "de", "es", "pt"].includes(requested) ? requested : "en";
  const child = spawn(
    path.join(root, "backend", ".venv", "bin", "python"),
    [
      path.join(root, "backend", "scripts", "analyze_video.py"),
      "--video",
      source,
      "--job-dir",
      dir,
      "--lang",
      lang,
    ],
    {
      cwd: root,
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
      env: { ...process.env, MPLCONFIGDIR: "/tmp/mpl" },
    },
  );
  child.on("error", () => {
    void writeFile(
      path.join(dir, "state.json"),
      JSON.stringify({
        job_id: id,
        status: "failed",
        progress: 1,
        error_message: "The analysis program could not start.",
      }),
    );
  });
  child.unref();
  return Response.json({ job_id: id });
}
