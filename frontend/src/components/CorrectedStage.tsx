"use client";

import { useEffect, useRef } from "react";
import {
  visibleSideEdges,
  contentRect,
  normalizedToView,
  type Point,
} from "@/lib/playback";

export function CorrectedStage({
  names,
  userFrame,
  correctedFrame,
  mediaWidth,
  mediaHeight,
  video,
  videoEpoch,
  showGhost,
}: {
  names: string[];
  userFrame: number[][];
  correctedFrame: number[][];
  mediaWidth: number;
  mediaHeight: number;
  video: HTMLVideoElement | null;
  videoEpoch: number;
  showGhost: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const context = canvas.getContext("2d");
      if (!context) return;
      const box = canvas.parentElement ?? canvas;
      const bounds = box.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      if (!showGhost) return;

      const rect = contentRect(width, height, mediaWidth, mediaHeight);
      if (video && video.readyState >= 2) {
        context.drawImage(video, rect.x, rect.y, rect.width, rect.height);
        context.fillStyle = "rgba(8, 12, 16, 0.55)";
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
      }
      const points = correctedFrame.map((point) => ({ x: point?.[0] ?? 0, y: point?.[1] ?? 0 }));
      const scale = width / 480;
      context.lineWidth = Math.max(2, 3 * scale);
      context.strokeStyle = "rgba(255, 159, 28, 0.95)";
      context.fillStyle = "rgba(255, 159, 28, 0.98)";
      const drawn = new Set<number>();
      for (const [start, end] of visibleSideEdges(names, userFrame)) {
        if (jointConfidence(userFrame, start) < 0.5 || jointConfidence(userFrame, end) < 0.5) continue;
        drawn.add(start);
        drawn.add(end);
        const a = points[start];
        const b = points[end];
        if (!a || !b) continue;
        const from = normalizedToView(a, rect);
        const to = normalizedToView(b, rect);
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
      }
      for (const index of drawn) {
        const point = points[index];
        if (!point) continue;
        const endJoint = names[index]?.endsWith("_wrist") || names[index]?.endsWith("_ankle");
        const scale = width / 480;
        drawJoint(context, normalizedToView(point, rect), (endJoint ? 7 : 4) * scale);
      }
    };
    draw();
    const box = canvas.parentElement;
    const observer = new ResizeObserver(() => draw());
    if (box) observer.observe(box);
    if (!video) return () => observer.disconnect();
    video.addEventListener("loadeddata", draw);
    video.addEventListener("seeked", draw);
    const frameCallback = video.requestVideoFrameCallback?.(() => draw());
    return () => {
      observer.disconnect();
      video.removeEventListener("loadeddata", draw);
      video.removeEventListener("seeked", draw);
      if (frameCallback !== undefined) video.cancelVideoFrameCallback?.(frameCallback);
    };
  }, [names, userFrame, correctedFrame, mediaWidth, mediaHeight, video, videoEpoch, showGhost]);

  return <canvas ref={canvasRef} className="ghost" aria-hidden="true" />;
}

function jointConfidence(frame: number[][], index: number): number {
  return frame[index]?.[2] ?? 0;
}

function drawJoint(context: CanvasRenderingContext2D, point: Point, radius: number) {
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
}
