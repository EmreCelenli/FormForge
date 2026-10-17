"use client";

import { useEffect, useState } from "react";
import { PlaybackScreen } from "@/components/PlaybackScreen";
import { useLanguage } from "@/components/LanguageState";
import { useUpload } from "@/components/UploadState";
import type { LangId } from "@/lib/i18n";
import type { Result } from "@/types/contract";
import shortResult from "@/data/result.json";
import longResult from "@/data/result-long.json";

const clips = [
  {
    id: "short",
    result: shortResult,
    videoSrc: "/plank.mp4",
  },
  {
    id: "long",
    result: longResult,
    videoSrc: "/plank-long.mp4",
  },
] as const;

type Coach = Result["coach"];
type CoachStatus = "ready" | "loading" | "missing";

function useClipCoach(clipId: string, lang: LangId, embedded: Coach): { coach: Coach; status: CoachStatus } {
  const [state, setState] = useState<{ clipId: string; lang: LangId; coach: Coach; status: CoachStatus }>({
    clipId,
    lang: "en",
    coach: embedded,
    status: "ready",
  });

  useEffect(() => {
    if (lang === "en") {
      setState({ clipId, lang, coach: embedded, status: "ready" });
      return;
    }
    const controller = new AbortController();
    setState({ clipId, lang, coach: null, status: "loading" });
    fetch(`/api/demo-coach?clip=${clipId}&lang=${lang}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as { coach?: Coach };
        if (!response.ok || !body.coach) {
          setState({ clipId, lang, coach: null, status: "missing" });
          return;
        }
        setState({ clipId, lang, coach: body.coach, status: "ready" });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ clipId, lang, coach: null, status: "missing" });
      });
    return () => controller.abort();
  }, [clipId, lang, embedded]);

  if (state.clipId !== clipId || state.lang !== lang) return { coach: null, status: "loading" };
  return { coach: state.coach, status: state.status };
}

export function DemoScreen() {
  const [clipId, setClipId] = useState<(typeof clips)[number]["id"]>("short");
  const upload = useUpload();
  const { lang, copy } = useLanguage();
  const clip = clips.find((item) => item.id === clipId) ?? clips[0];
  const showingUpload = Boolean(upload.url);
  const clipCoach = useClipCoach(clip.id, lang, (clip.result as unknown as Result).coach ?? null);
  const labels = { short: copy.shortHold, long: copy.longHold };

  return (
    <PlaybackScreen
      key={showingUpload ? upload.jobId ?? upload.url ?? "upload" : clip.id}
      result={showingUpload ? null : (clip.result as unknown as Result)}
      videoSrc={showingUpload ? upload.url : clip.videoSrc}
      playbackSrc={upload.jobId ? `/api/jobs/${upload.jobId}/video` : null}
      jobId={showingUpload ? upload.jobId : null}
      jobsUrl={showingUpload ? "/api/jobs" : null}
      spokenCoach={showingUpload ? undefined : clipCoach.coach}
      coachStatus={showingUpload ? undefined : clipCoach.status}
      notice={
        upload.error ??
        (showingUpload && !upload.jobId ? "Sending the video for analysis." : null)
      }
      toolbar={
        <div className="clip-switch" role="group" aria-label={copy.demoClip}>
          {clips.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={!showingUpload && item.id === clip.id}
              onClick={() => {
                upload.clear();
                setClipId(item.id);
              }}
            >
              {labels[item.id]}
            </button>
          ))}
        </div>
      }
    />
  );
}
