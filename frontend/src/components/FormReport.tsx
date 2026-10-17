"use client";

import { useEffect, useRef } from "react";
import type { Result } from "@/types/contract";
import type { Copy } from "@/lib/i18n";
import { drawFaultLine, drawHologram, stageRect } from "@/lib/body";
import {
  alignmentDegrees,
  holdLineGap,
  offsetLabel,
  outsideBandPercent,
  peakOffsetIndex,
} from "@/lib/playback";

export function FormReport({
  result,
  videoSrc,
  coach,
  copy,
  recognized,
  onClose,
}: {
  result: Result;
  videoSrc: string | null;
  coach: Result["coach"];
  copy: Copy;
  recognized: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const names = result.keypoint_names;
  const offsets = result.angles.hip_offset.user;
  const worst = peakOffsetIndex(offsets);
  const peakOffset = offsets[worst] ?? 0;
  const range = result.angles.hip_offset.target_range;
  const gap = holdLineGap(result.angles.line_gap.user, result.angles.line_gap.corrected);
  const seconds = (result.video.frames / result.video.fps).toFixed(1);
  const exercise = result.exercise.id === "high_plank" ? copy.highPlank : result.exercise.label;

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = 640;
    const height = 360;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const paint = () => {
      const rect = stageRect(width, height, result.video.width, result.video.height);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#101820";
      context.fillRect(0, 0, width, height);
      if (video && video.readyState >= 2) {
        context.drawImage(video, rect.x, rect.y, rect.width, rect.height);
      }
      const user = result.keypoints_user[worst] ?? [];
      const corrected = result.keypoints_corrected[worst] ?? [];
      const scale = width / 480;
      drawFaultLine(context, names, user, rect, scale, peakOffset, range);
      drawHologram(
        context,
        names,
        user,
        corrected,
        rect,
        scale,
        `${alignmentDegrees(result.angles.hip_offset.corrected[worst] ?? 0).toFixed(0)}°`,
      );
    };

    if (!video || !videoSrc) {
      paint();
      return;
    }
    const seek = () => {
      const time = Math.min((worst + 0.05) / result.video.fps, Math.max(0, (video.duration || result.video.frames / result.video.fps) - 0.05));
      if (Math.abs(video.currentTime - time) > 0.001) video.currentTime = time;
      else paint();
    };
    video.addEventListener("loadeddata", seek);
    video.addEventListener("seeked", paint);
    if (video.readyState >= 2) seek();
    return () => {
      video.removeEventListener("loadeddata", seek);
      video.removeEventListener("seeked", paint);
    };
  }, [names, result, videoSrc, worst]);

  return (
    <article className="report-page">
      {videoSrc ? (
        <video ref={videoRef} className="report-source" src={videoSrc} muted playsInline preload="auto" />
      ) : null}
      <p className="report-kicker">{copy.report}</p>
      <h1>{copy.reportTitle}</h1>
      <p className="report-lead">{copy.reportLead}</p>
      <p>{exercise}. {recognized}</p>
      <ul>
        <li>{copy.holdLength(seconds)}</li>
        <li>
          {copy.peakHip(
            peakOffset.toFixed(1),
            alignmentDegrees(peakOffset).toFixed(0),
            copy.pose[offsetLabel(peakOffset)],
          )}{" "}
          {copy.target(range[0], range[1])} {copy.straight}
        </li>
        <li>{copy.outsideBand(outsideBandPercent(offsets, range).toFixed(0))}</li>
        <li>{copy.lineGap((gap.peak * 100).toFixed(1), (gap.corrected * 100).toFixed(1))}</li>
      </ul>
      <h2>{copy.worstFrame}</h2>
      <canvas ref={canvasRef} className="report-still" />
      <h2>{copy.coachLines}</h2>
      {coach ? (
        <>
          <p>{coach.summary}</p>
          <ol>
            {coach.steps.map((step) => (
              <li key={`${step.frames[0]}-${step.text}`}>{step.text}</li>
            ))}
          </ol>
        </>
      ) : (
        <p>{copy.cueUnavailable}</p>
      )}
      <div className="report-actions no-print">
        <button type="button" className="report-open" onClick={() => window.print()}>{copy.reportPrint}</button>
        <button type="button" className="report-open" onClick={onClose}>{copy.reportClose}</button>
      </div>
    </article>
  );
}
