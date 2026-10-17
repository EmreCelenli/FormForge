import { readFile } from "fs/promises";
import path from "path";
import { jobDirectory } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const dir = jobDirectory(id);
  if (!dir) return new Response(null, { status: 404 });
  try {
    const body = await readFile(path.join(dir, "video.mp4"));
    return new Response(body, { headers: { "Content-Type": "video/mp4" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
