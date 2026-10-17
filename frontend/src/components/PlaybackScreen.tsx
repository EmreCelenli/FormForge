"use client";

import { useEffect, useRef, useState } from "react";
import type { Result } from "@/types/contract";
import { CorrectedStage } from "@/components/CorrectedStage";
import { useLanguage } from "@/components/LanguageState";
import type { Copy, JointName } from "@/lib/i18n";
import {
  activeStepIndex,
  alignmentDegrees,
  contractIssue,
  frameIndex,
  inTargetRange,
  lowEndJoints,
  offsetLabel,
} from "@/lib/playback";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function recognitionLine(exercise: Result["exercise"], copy: Copy): string {
  if (exercise.source === "vision" && exercise.model) {
    return copy.recognizedBy(exercise.model);
  }
  if (exercise.source === "vision") return copy.recognized;
  return copy.selected;
}

function jointNote(names: string[], frame: number[][], copy: Copy): string | null {
  const low = lowEndJoints(names, frame);
  if (low.length === 0) return null;
  const labels = low.map((name) => copy.joints[name as JointName] ?? name.replaceAll("_", " "));
  const list =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(", ")} ${copy.and} ${labels[labels.length - 1]}`;
  return copy.lowConfidence(list, labels.length === 1);
}

function issueText(issue: string | null, copy: Copy): string | null {
  if (issue === "This result does not have 17 keypoints.") return copy.contractKeypoints;
  if (issue) return copy.contractMismatch;
  return null;
}

export function PlaybackScreen({
  result = null,
  example = false,
  videoSrc = null,
  playbackSrc = null,
  jobId = null,
  jobsUrl = null,
  toolbar = null,
  notice = null,
  spokenCoach,
  coachStatus,
}: {
  result?: Result | null;
  example?: boolean;
  videoSrc?: string | null;
  playbackSrc?: string | null;
  jobId?: string | null;
  jobsUrl?: string | null;
  toolbar?: React.ReactNode;
  notice?: string | null;
  spokenCoach?: Result["coach"];
  coachStatus?: "ready" | "loading" | "missing";
}) {
  const { copy } = useLanguage();
  const polled = useJob(jobId, jobsUrl);
  const current = jobId ? polled.result : result;
  const spoken =
    coachStatus === undefined ? current?.coach ?? null : coachStatus === "ready" ? spokenCoach ?? null : null;
  const finished = Boolean(current && current.status !== "queued" && current.status !== "running");
  const shownVideo = finished && playbackSrc ? playbackSrc : videoSrc;
  const videoRef = useRef<HTMLVideoElement>(null);
  const compareRef = useRef<HTMLElement>(null);
  const [frame, setFrame] = useState(0);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const [videoEpoch, setVideoEpoch] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const spokenStep = useRef<number | null>(null);
  const pendingStep = useRef<number | null>(null);
  const audioUnlocked = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    const compare = compareRef.current;
    if (!video || !compare) return;
    const moveFullscreen = () => {
      if (document.fullscreenElement === video) {
        void compare.requestFullscreen().catch(() => undefined);
      }
    };
    document.addEventListener("fullscreenchange", moveFullscreen);
    return () => document.removeEventListener("fullscreenchange", moveFullscreen);
  }, [videoNode, shownVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const mark = () => setVideoEpoch((value) => value + 1);
    if (video.readyState >= 2) mark();
    video.addEventListener("loadeddata", mark);
    return () => video.removeEventListener("loadeddata", mark);
  }, [videoNode]);

  useEffect(() => {
    if (!current) return;
    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video) {
        const next = frameIndex(video.currentTime, current.video.fps, current.video.frames);
        setFrame((previous) => (previous === next ? previous : next));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [current]);

  useEffect(() => {
    spokenStep.current = null;
    pendingStep.current = null;
    audioRef.current?.pause();
  }, [spoken]);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio || !spoken || !current) return;
    const speak = (fromGesture: boolean) => {
      const index = activeStepIndex(
        spoken.steps,
        frameIndex(video.currentTime, current.video.fps, current.video.frames),
      );
      if (index < 0 || index === spokenStep.current || index === pendingStep.current) return;
      const url = spoken.steps[index]?.audio_url;
      if (!url) {
        audio.pause();
        spokenStep.current = index;
        return;
      }
      if (!fromGesture && !audioUnlocked.current) return;
      pendingStep.current = index;
      const absolute = new URL(url, window.location.href).href;
      if (audio.src !== absolute) audio.src = absolute;
      try {
        audio.currentTime = 0;
      } catch {
        // The new source may not have metadata yet. play() still starts at the beginning.
      }
      void audio.play().then(() => {
        audioUnlocked.current = true;
        spokenStep.current = index;
        if (pendingStep.current === index) pendingStep.current = null;
      }).catch(() => {
        if (pendingStep.current === index) pendingStep.current = null;
      });
    };
    speak(false);
    const onPlay = () => speak(true);
    video.addEventListener("play", onPlay);
    return () => video.removeEventListener("play", onPlay);
  }, [current, frame, spoken]);

  if (jobId && polled.error) {
    return (
      <Shell>
        <p className="banner" role="status">{jobError(polled.error, copy)}</p>
      </Shell>
    );
  }

  if (!current || current.status === "queued" || current.status === "running") {
    const loading = Boolean(jobId) || current?.status === "queued" || current?.status === "running";
    return (
      <Shell>
        {toolbar}
        {notice ? <p className="banner" role="status">{notice}</p> : null}
        <EmptyPanels
          videoSrc={videoSrc}
          user={loading ? copy.loadingAnalysis : copy.noAnalysis}
          corrected={loading ? copy.findingJoints : copy.correctedWillAppear}
          meter={copy.noAngleYet}
          coach={copy.noCueYet}
          progress={loading ? current?.progress : undefined}
        />
      </Shell>
    );
  }

  if (current.status === "failed") {
    return (
      <Shell>
        {toolbar}
        <p className="banner" role="status">{current.error_message ?? copy.analysisFailed}</p>
      </Shell>
    );
  }

  const unreliable = current.status === "low_confidence";
  const issue = issueText(contractIssue(current), copy);
  const names = current.keypoint_names;
  const userFrame = current.keypoints_user[frame] ?? [];
  const correctedFrame = current.keypoints_corrected[frame] ?? [];
  const userOffset = current.angles.hip_offset.user[frame];
  const correctedOffset = current.angles.hip_offset.corrected[frame];
  const range = current.angles.hip_offset.target_range;
  const showGhost = !unreliable && !issue && inTargetRange(correctedOffset, range);
  const fault = current.errors.find(
    (error) => error.type === "hip_misalignment" && frame >= error.frames[0] && frame <= error.frames[1],
  );
  const stepIndex = spoken ? activeStepIndex(spoken.steps, frame) : -1;
  const endNote = jointNote(names, userFrame, copy);

  return (
    <Shell>
      {toolbar}
      {example ? <p className="banner">{copy.exampleBanner}</p> : null}
      {current.safety.handover ? (
        <p className="banner" role="status">
          {current.safety.message ?? copy.safetyStop}
        </p>
      ) : null}
      {unreliable ? (
        <p className="banner" role="status">{copy.rerecord}</p>
      ) : null}
      {issue ? <p className="banner" role="status">{issue}</p> : null}
      <p className="exercise">
        {current.exercise.id === "high_plank" ? copy.highPlank : current.exercise.label}.{" "}
        {recognitionLine(current.exercise, copy)}
      </p>
      <section className="panels compare" ref={compareRef}>
        <article className="panel user">
          <h2>{copy.yourVideo}</h2>
          <div className="stage media">
            {shownVideo ? (
              <video
                ref={(node) => {
                  videoRef.current = node;
                  setVideoNode(node);
                }}
                src={shownVideo}
                controls
                playsInline
              />
            ) : (
              <p>{copy.clipMissing}</p>
            )}
          </div>
          {!unreliable && fault ? (
            <p className="fault">
              {offsetLabel(userOffset) === "pike" ? copy.pikingHips : copy.saggingHips}
              <span> {copy.severity[fault.severity]}. {copy.engineeringLabel}</span>
            </p>
          ) : null}
        </article>
        <article className="panel corrected">
          <h2>{copy.correctedForm}</h2>
          <div className="stage media">
            {showGhost && !issue ? (
              <CorrectedStage
                names={names}
                userFrame={userFrame}
                correctedFrame={correctedFrame}
                mediaWidth={current.video.width}
                mediaHeight={current.video.height}
                video={videoNode}
                videoEpoch={videoEpoch}
                showGhost
              />
            ) : (
              <p>{unreliable ? copy.correctedHidden : copy.notCorrected}</p>
            )}
          </div>
          {!unreliable && !issue && endNote ? <p className="fault">{endNote}</p> : null}
        </article>
      </section>
      <section className="meter" aria-label={copy.angleMeter}>
        <h2>{copy.angleMeter}</h2>
        {unreliable || issue || !Number.isFinite(userOffset) ? (
          <p>{copy.noReliableAngle}</p>
        ) : (
          <p>
            {copy.yours(alignmentDegrees(userOffset).toFixed(0), copy.pose[offsetLabel(userOffset)])}{" "}
            {copy.corrected(alignmentDegrees(correctedOffset).toFixed(0))}{" "}
            {copy.target(range[0], range[1])} {copy.straight}
          </p>
        )}
      </section>
      <section className="coach" aria-label={copy.coach}>
        <h2>{copy.coach}</h2>
        {coachStatus === "loading" ? (
          <p>{copy.writingCue}</p>
        ) : spoken ? (
          <>
            <audio ref={audioRef} preload="auto" />
            <p>{spoken.summary}</p>
            <ol className="steps">
              {spoken.steps.map((step, index) => (
                <li key={`${step.frames[0]}-${step.text}`} className={index === stepIndex ? "active" : undefined}>
                  {step.text}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p>{copy.cueUnavailable}</p>
        )}
      </section>
    </Shell>
  );
}

function useJob(jobId: string | null, jobsUrl: string | null): { result: Result | null; error: string | null } {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let stopped = false;
    let timer = 0;
    async function tick() {
      try {
        const response = await fetch(jobsUrl ? `${jobsUrl}/${jobId}` : `${API_URL}/jobs/${jobId}`);
        if (!response.ok) throw new Error(`request:${response.status}`);
        const body = (await response.json()) as Result;
        if (stopped) return;
        if (!body || typeof body.status !== "string") {
          setError("contract");
          return;
        }
        setResult(body);
        if (body.status === "queued" || body.status === "running") {
          timer = window.setTimeout(tick, 1000);
        }
      } catch (cause) {
        if (stopped) return;
        if (cause instanceof Error && cause.message.startsWith("request:")) setError(cause.message);
        else setError("read");
      }
    }
    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [jobId, jobsUrl]);

  return { result, error };
}

function jobError(code: string, copy: Copy): string {
  if (code.startsWith("request:")) return copy.jobFailed(Number(code.slice("request:".length)));
  if (code === "contract") return copy.contractMismatch;
  return copy.jobUnreadable;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="screen">{children}</main>
  );
}

function EmptyPanels({
  videoSrc = null,
  user,
  corrected,
  meter,
  coach,
  progress,
}: {
  videoSrc?: string | null;
  user: string;
  corrected: string;
  meter: string;
  coach: string;
  progress?: number;
}) {
  const { copy } = useLanguage();
  return (
    <>
      <section className="panels">
        <article className="panel user">
          <h2>{copy.yourVideo}</h2>
          <div className={videoSrc ? "stage media" : "stage"}>
            {videoSrc ? (
              <video src={videoSrc} controls playsInline />
            ) : (
              <p>
                {user}
                {typeof progress === "number" ? ` ${Math.round(progress * 100)}%.` : ""}
              </p>
            )}
          </div>
          {videoSrc && typeof progress === "number" ? (
            <p className="fault">{copy.analyzing(Math.round(progress * 100))}</p>
          ) : null}
        </article>
        <article className="panel corrected">
          <h2>{copy.correctedForm}</h2>
          <div className="stage"><p>{corrected}</p></div>
        </article>
      </section>
      <section className="meter" aria-label={copy.angleMeter}>
        <h2>{copy.angleMeter}</h2>
        <p>{meter}</p>
      </section>
      <section className="coach" aria-label={copy.coach}>
        <h2>{copy.coach}</h2>
        <p>{coach}</p>
      </section>
    </>
  );
}
