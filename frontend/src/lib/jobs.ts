import path from "path";

const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function repoRoot(): string {
  return path.resolve(process.cwd(), "..");
}

export function jobDirectory(id: string): string | null {
  if (!JOB_ID.test(id)) return null;
  const root = path.resolve(repoRoot(), "data", "jobs");
  const dir = path.resolve(root, id);
  if (dir !== root && !dir.startsWith(root + path.sep)) return null;
  return dir;
}
