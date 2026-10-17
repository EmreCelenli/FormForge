import { readFile } from "fs/promises";
import path from "path";
import { jobDirectory } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const dir = jobDirectory(id);
  if (!dir) return Response.json({ error: "Unknown job." }, { status: 404 });
  for (const name of ["result.json", "state.json"]) {
    try {
      const body = await readFile(path.join(dir, name), "utf8");
      return new Response(body, { headers: { "Content-Type": "application/json" } });
    } catch {
      // The next file is the fallback while the job is still starting.
    }
  }
  return Response.json({ error: "Unknown job." }, { status: 404 });
}
