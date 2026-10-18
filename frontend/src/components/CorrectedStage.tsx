"use client";

import { useEffect, useRef } from "react";
import { drawFaultLine, drawHologram, stageRect } from "@/lib/body";

export function CorrectedStage({
  names,
  userFrame,
  correctedFrame,
  mediaWidth,
  mediaHeight,
  video,
  videoEpoch,
  showGhost,
  showMarks,
  alignmentLabel,
}: {
  names: string[];
  userFrame: number[][];
  correctedFrame: number[][];
  mediaWidth: number;
  mediaHeight: number;
  video: HTMLVideoElement | null;
  videoEpoch: number;
  showGhost: boolean;
  showMarks: boolean;
  alignmentLabel: string;
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
      const rect = stageRect(width, height, mediaWidth, mediaHeight);
      if (video && video.readyState >= 2) {
        context.drawImage(video, rect.x, rect.y, rect.width, rect.height);
      }
      if (showMarks) {
        drawHologram(context, names, userFrame, correctedFrame, rect, width / 480, alignmentLabel);
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
  }, [names, userFrame, correctedFrame, mediaWidth, mediaHeight, video, videoEpoch, showGhost, showMarks, alignmentLabel]);

  return <canvas ref={canvasRef} className="ghost" aria-hidden="true" />;
}

export function FaultMark({
  names,
  userFrame,
  mediaWidth,
  mediaHeight,
  hipOffset,
  range,
}: {
  names: string[];
  userFrame: number[][];
  mediaWidth: number;
  mediaHeight: number;
  hipOffset: number;
  range: [number, number];
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
      drawFaultLine(
        context,
        names,
        userFrame,
        stageRect(width, height, mediaWidth, mediaHeight),
        width / 480,
        hipOffset,
        range,
      );
    };
    draw();
    const box = canvas.parentElement;
    const observer = new ResizeObserver(() => draw());
    if (box) observer.observe(box);
    return () => observer.disconnect();
  }, [names, userFrame, mediaWidth, mediaHeight, hipOffset, range]);

  return <canvas ref={canvasRef} className="ghost" aria-hidden="true" />;
}
