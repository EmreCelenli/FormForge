import type { Result } from "../types/contract";

const BODY_EDGES = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
] as const;

export interface Point {
  x: number;
  y: number;
}

export interface ContentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function frameIndex(currentTimeSec: number, fps: number, frames: number): number {
  if (frames <= 0) return 0;
  const index = Number.isFinite(currentTimeSec) && fps > 0 ? Math.floor(currentTimeSec * fps) : 0;
  return Math.min(frames - 1, Math.max(0, index));
}

export function contentRect(
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number,
): ContentRect {
  if (containerWidth <= 0 || containerHeight <= 0 || mediaWidth <= 0 || mediaHeight <= 0) {
    return { x: 0, y: 0, width: Math.max(0, containerWidth), height: Math.max(0, containerHeight) };
  }
  const mediaAspect = mediaWidth / mediaHeight;
  const boxAspect = containerWidth / containerHeight;
  if (boxAspect > mediaAspect) {
    const height = containerHeight;
    const width = height * mediaAspect;
    return { x: (containerWidth - width) / 2, y: 0, width, height };
  }
  const width = containerWidth;
  const height = width / mediaAspect;
  return { x: 0, y: (containerHeight - height) / 2, width, height };
}

export function normalizedToView(point: Point, rect: ContentRect): Point {
  return {
    x: rect.x + point.x * rect.width,
    y: rect.y + point.y * rect.height,
  };
}

export function alignmentDegrees(hipOffset: number): number {
  return 180 - Math.abs(hipOffset);
}

export function offsetLabel(hipOffset: number): "straight" | "sag" | "pike" {
  if (hipOffset > 0) return "sag";
  if (hipOffset < 0) return "pike";
  return "straight";
}

export function inTargetRange(value: number, range: [number, number]): boolean {
  return Number.isFinite(value) && value >= range[0] && value <= range[1];
}

const FAULT_RED_AT_OFFSET = 40;

export function faultCloseness(hipOffset: number, range: [number, number]): number {
  if (!Number.isFinite(hipOffset)) return 0;
  const band = Math.max(Math.abs(range[0]), Math.abs(range[1]));
  const excess = Math.abs(hipOffset) - band;
  if (excess <= 0) return 1;
  return 1 - Math.min(1, excess / Math.max(1, FAULT_RED_AT_OFFSET - band));
}

export function faultLineColor(hipOffset: number, range: [number, number]): { stroke: string; glow: string } {
  const closeness = faultCloseness(hipOffset, range);
  const red = [255, 75, 92];
  const amber = [240, 193, 74];
  const green = [61, 220, 151];
  const [from, to, amount] = closeness < 0.5
    ? [red, amber, closeness / 0.5]
    : [amber, green, (closeness - 0.5) / 0.5];
  const channels = from.map((channel, index) => Math.round(channel + ((to[index] ?? channel) - channel) * amount));
  const [r, g, b] = channels;
  return { stroke: `rgb(${r}, ${g}, ${b})`, glow: `rgba(${r}, ${g}, ${b}, 0.85)` };
}

export function holdLineGap(user: number[], corrected: number[]): { peak: number; corrected: number } {
  if (user.length === 0) return { peak: 0, corrected: 0 };
  let index = 0;
  for (let frame = 1; frame < user.length; frame += 1) {
    if ((user[frame] ?? 0) > (user[index] ?? 0)) index = frame;
  }
  return { peak: user[index] ?? 0, corrected: corrected[index] ?? 0 };
}

export function outsideBandPercent(values: number[], range: [number, number]): number {
  if (values.length === 0) return 0;
  const outside = values.reduce(
    (count, value) => count + (inTargetRange(value, range) ? 0 : 1),
    0,
  );
  return (100 * outside) / values.length;
}

export function peakOffsetIndex(values: number[]): number {
  let index = 0;
  for (let frame = 1; frame < values.length; frame += 1) {
    if (Math.abs(values[frame] ?? 0) > Math.abs(values[index] ?? 0)) index = frame;
  }
  return index;
}

export function contractIssue(result: Result): string | null {
  const frames = result.video.frames;
  const names = result.keypoint_names.length;
  if (names !== 17) return "This result does not have 17 keypoints.";
  if (result.keypoints_user.length !== frames || result.keypoints_corrected.length !== frames) {
    return "This result does not match the contract.";
  }
  const lineGap = result.angles.line_gap;
  if (
    result.angles.hip_offset.user.length !== frames ||
    result.angles.hip_offset.corrected.length !== frames ||
    !lineGap ||
    lineGap.user.length !== frames ||
    lineGap.corrected.length !== frames
  ) {
    return "This result does not match the contract.";
  }
  for (let index = 0; index < frames; index += 1) {
    const user = result.keypoints_user[index];
    const corrected = result.keypoints_corrected[index];
    if (!user || !corrected || user.length !== 17 || corrected.length !== 17) {
      return "This result does not match the contract.";
    }
  }
  return null;
}

export function visibleHipIndex(names: string[], userFrame: number[][]): number {
  let best = -1;
  let bestConfidence = -1;
  for (const name of ["left_hip", "right_hip"]) {
    const index = names.indexOf(name);
    if (index < 0) continue;
    const confidence = userFrame[index]?.[2] ?? 0;
    if (confidence > bestConfidence) {
      best = index;
      bestConfidence = confidence;
    }
  }
  return best;
}

export function alignCorrectedToUserHip(
  names: string[],
  userFrame: number[][],
  correctedFrame: number[][],
): Point[] {
  const hip = visibleHipIndex(names, userFrame);
  const dx = hip >= 0 ? (userFrame[hip]?.[0] ?? 0) - (correctedFrame[hip]?.[0] ?? 0) : 0;
  const dy = hip >= 0 ? (userFrame[hip]?.[1] ?? 0) - (correctedFrame[hip]?.[1] ?? 0) : 0;
  return correctedFrame.map((point) => ({
    x: (point?.[0] ?? 0) + dx,
    y: (point?.[1] ?? 0) + dy,
  }));
}

const END_JOINTS = ["left_wrist", "right_wrist", "left_ankle", "right_ankle"] as const;

export function lowEndJoints(names: string[], frame: number[][], minimum = 0.5): string[] {
  return END_JOINTS.filter((name) => {
    const point = frame[names.indexOf(name)];
    return !point || point.length < 3 || point[2] < minimum;
  });
}

export function lowEndJointNote(
  names: string[],
  frame: number[][],
  minimum = 0.5,
): string | null {
  const low = lowEndJoints(names, frame, minimum).map((name) => name.replace(/_/g, " "));
  if (low.length === 0) return null;
  const list = low.length === 1 ? low[0] : `${low.slice(0, -1).join(", ")} and ${low[low.length - 1]}`;
  const noun = low.length === 1 ? "That point is" : "Those points are";
  return `Low-confidence ${list}. ${noun} not used for the corrected pose.`;
}

export function activeStepIndex(
  steps: { frames: [number, number] }[],
  frame: number,
): number {
  return steps.findIndex((step) => frame >= step.frames[0] && frame <= step.frames[1]);
}

export function visibleSideEdges(names: string[], frame: number[][]): [number, number][] {
  let side: "left" | "right" | null = null;
  let best = -1;
  for (const candidate of ["left", "right"] as const) {
    const score = Math.min(
      frame[names.indexOf(`${candidate}_shoulder`)]?.[2] ?? 0,
      frame[names.indexOf(`${candidate}_hip`)]?.[2] ?? 0,
      frame[names.indexOf(`${candidate}_ankle`)]?.[2] ?? 0,
    );
    if (score > best) {
      side = candidate;
      best = score;
    }
  }
  if (!side || best <= 0) return [];
  const pairs = [
    [`${side}_shoulder`, `${side}_elbow`],
    [`${side}_elbow`, `${side}_wrist`],
    [`${side}_shoulder`, `${side}_hip`],
    [`${side}_hip`, `${side}_knee`],
    [`${side}_knee`, `${side}_ankle`],
  ];
  const edges: [number, number][] = [];
  for (const [start, end] of pairs) {
    const a = names.indexOf(start);
    const b = names.indexOf(end);
    if (a >= 0 && b >= 0) edges.push([a, b]);
  }
  return edges;
}

export function bodyEdges(names: string[]): [number, number][] {
  const edges: [number, number][] = [];
  for (const [start, end] of BODY_EDGES) {
    const a = names.indexOf(start);
    const b = names.indexOf(end);
    if (a >= 0 && b >= 0) edges.push([a, b]);
  }
  return edges;
}
