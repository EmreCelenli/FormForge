import { contentRect, faultLineColor, normalizedToView, visibleSideEdges, type ContentRect, type Point } from "./playback";

const GLOW = "rgba(0, 214, 255, 0.9)";
const CORE = "rgba(186, 247, 255, 0.96)";
const ARC = "#3DDC97";

function confident(frame: number[][], index: number): boolean {
  return index >= 0 && (frame[index]?.[2] ?? 0) >= 0.5;
}

function viewOf(frame: number[][], index: number, rect: ContentRect, source: number[][]): Point | null {
  if (!confident(source, index)) return null;
  const point = frame[index];
  if (!point) return null;
  return normalizedToView({ x: point[0] ?? 0, y: point[1] ?? 0 }, rect);
}

function headPlacement(
  names: string[],
  userFrame: number[][],
  correctedFrame: number[][],
  rect: ContentRect,
  scale: number,
): { center: Point; radius: number } | null {
  const edge = visibleSideEdges(names, userFrame)[0];
  const sideName = edge ? names[edge[0]] ?? "" : "";
  const side = sideName.startsWith("left_") ? "left" : sideName.startsWith("right_") ? "right" : null;
  if (!side) return null;
  const ear = viewOf(correctedFrame, names.indexOf(`${side}_ear`), rect, userFrame);
  const eye = viewOf(correctedFrame, names.indexOf(`${side}_eye`), rect, userFrame);
  const nose = viewOf(correctedFrame, names.indexOf("nose"), rect, userFrame);
  const center = ear ?? eye;
  if (!center) return null;
  const face = nose ?? eye;
  const radius = face
    ? Math.max(Math.max(8, 10 * scale), Math.hypot(face.x - center.x, face.y - center.y))
    : Math.max(8, 11 * scale);
  return { center, radius };
}

function strokeEdges(
  context: CanvasRenderingContext2D,
  names: string[],
  userFrame: number[][],
  points: number[][],
  rect: ContentRect,
) {
  context.beginPath();
  for (const [start, end] of visibleSideEdges(names, userFrame)) {
    const from = viewOf(points, start, rect, userFrame);
    const to = viewOf(points, end, rect, userFrame);
    if (!from || !to) continue;
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
  }
  context.stroke();
}

export function drawFaultLine(
  context: CanvasRenderingContext2D,
  names: string[],
  userFrame: number[][],
  rect: ContentRect,
  scale: number,
  hipOffset: number,
  range: [number, number],
) {
  const color = faultLineColor(hipOffset, range);
  context.save();
  context.lineCap = "round";
  context.setLineDash([Math.max(1.5, 2 * scale), Math.max(6, 8 * scale)]);
  context.strokeStyle = color.stroke;
  context.shadowColor = color.glow;
  context.shadowBlur = 8 * scale;
  context.lineWidth = Math.max(3, 4 * scale);
  context.beginPath();
  for (const [start, end] of visibleSideEdges(names, userFrame)) {
    const chain = (names[start]?.endsWith("_shoulder") && names[end]?.endsWith("_hip"))
      || (names[start]?.endsWith("_hip") && names[end]?.endsWith("_knee"))
      || (names[start]?.endsWith("_knee") && names[end]?.endsWith("_ankle"));
    if (!chain) continue;
    const from = viewOf(userFrame, start, rect, userFrame);
    const to = viewOf(userFrame, end, rect, userFrame);
    if (!from || !to) continue;
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
  }
  context.stroke();
  context.restore();
}

export function drawHologram(
  context: CanvasRenderingContext2D,
  names: string[],
  userFrame: number[][],
  correctedFrame: number[][],
  rect: ContentRect,
  scale: number,
  alignmentLabel: string,
) {
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = GLOW;
  context.shadowBlur = 12 * scale;
  context.strokeStyle = "rgba(0, 210, 255, 0.22)";
  context.lineWidth = Math.max(4, 6 * scale);
  strokeEdges(context, names, userFrame, correctedFrame, rect);
  context.shadowBlur = 8 * scale;
  context.strokeStyle = CORE;
  context.lineWidth = Math.max(1.6, 2.1 * scale);
  strokeEdges(context, names, userFrame, correctedFrame, rect);

  context.fillStyle = CORE;
  for (const [start, end] of visibleSideEdges(names, userFrame)) {
    for (const index of [start, end]) {
      const point = viewOf(correctedFrame, index, rect, userFrame);
      if (!point) continue;
      context.beginPath();
      context.arc(point.x, point.y, Math.max(2.2, 3 * scale), 0, Math.PI * 2);
      context.fill();
    }
  }
  const head = headPlacement(names, userFrame, correctedFrame, rect, scale);
  const shoulderEdge = visibleSideEdges(names, userFrame).find(([start]) => names[start]?.endsWith("_shoulder"));
  const shoulder = shoulderEdge ? viewOf(correctedFrame, shoulderEdge[0], rect, userFrame) : null;
  if (head && shoulder) {
    const dx = shoulder.x - head.center.x;
    const dy = shoulder.y - head.center.y;
    const length = Math.hypot(dx, dy);
    if (length > head.radius) {
      context.beginPath();
      context.moveTo(head.center.x + (dx / length) * head.radius, head.center.y + (dy / length) * head.radius);
      context.lineTo(shoulder.x, shoulder.y);
      context.stroke();
    }
  }
  if (head) {
    context.beginPath();
    context.lineWidth = Math.max(2, 2.4 * scale);
    context.strokeStyle = CORE;
    context.arc(head.center.x, head.center.y, head.radius, 0, Math.PI * 2);
    context.stroke();
  }
  drawAlignmentArc(context, names, userFrame, correctedFrame, rect, scale, alignmentLabel);
  context.restore();
}

function drawAlignmentArc(
  context: CanvasRenderingContext2D,
  names: string[],
  userFrame: number[][],
  correctedFrame: number[][],
  rect: ContentRect,
  scale: number,
  alignmentLabel: string,
) {
  const edges = visibleSideEdges(names, userFrame);
  const shoulderEdge = edges.find(([start, end]) => names[start]?.endsWith("_shoulder") && names[end]?.endsWith("_hip"));
  const ankleEdge = edges.find(([start, end]) => names[start]?.endsWith("_knee") && names[end]?.endsWith("_ankle"));
  const hipEdge = edges.find(([start]) => names[start]?.endsWith("_hip"));
  if (!shoulderEdge || !ankleEdge || !hipEdge) return;
  const hip = viewOf(correctedFrame, hipEdge[0], rect, userFrame);
  const shoulder = viewOf(correctedFrame, shoulderEdge[0], rect, userFrame);
  const ankle = viewOf(correctedFrame, ankleEdge[1], rect, userFrame);
  if (!hip || !shoulder || !ankle) return;
  const towardShoulder = Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x);
  const towardAnkle = Math.atan2(ankle.y - hip.y, ankle.x - hip.x);
  const bisector = towardShoulder + shortestTurn(towardShoulder, towardAnkle) / 2;
  const downward = Math.sin(bisector) > Math.sin(bisector + Math.PI) ? bisector : bisector + Math.PI;
  const radius = Math.max(28, 36 * scale);
  const sweep = 0.85;
  context.shadowColor = "rgba(61, 220, 151, 0.8)";
  context.shadowBlur = 8 * scale;
  context.strokeStyle = ARC;
  context.lineWidth = Math.max(2, 2.4 * scale);
  context.beginPath();
  context.arc(hip.x, hip.y, radius, downward - sweep / 2, downward + sweep / 2);
  context.stroke();
  context.font = `600 ${Math.max(13, 15 * scale)}px sans-serif`;
  context.fillStyle = ARC;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    alignmentLabel,
    hip.x + Math.cos(downward) * (radius + 16 * scale),
    hip.y + Math.sin(downward) * (radius + 16 * scale),
  );
}

function shortestTurn(from: number, to: number): number {
  let turn = to - from;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;
  return turn;
}

export function stageRect(
  boxWidth: number,
  boxHeight: number,
  mediaWidth: number,
  mediaHeight: number,
): ContentRect {
  return contentRect(boxWidth, boxHeight, mediaWidth, mediaHeight);
}

