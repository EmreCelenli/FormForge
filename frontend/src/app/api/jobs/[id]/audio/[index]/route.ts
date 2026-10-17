import { readFile } from "fs/promises";
import path from "path";
import { jobDirectory } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; index: string }> },
) {
  const { id, index } = await context.params;
  if (!/^[0-2]$/.test(index)) return new Response(null, { status: 404 });
  const dir = jobDirectory(id);
  if (!dir) return new Response(null, { status: 404 });
  try {
    const body = await readFile(path.join(dir, "audio", `step-${index}.wav`));
    return new Response(body, { headers: { "Content-Type": "audio/wav" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
