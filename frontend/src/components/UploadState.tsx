"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageState";

const MAX_BYTES = 100 * 1024 * 1024;

type UploadValue = {
  url: string | null;
  name: string | null;
  jobId: string | null;
  error: string | null;
  choose: (file: File | null) => void;
  clear: () => void;
};

const UploadContext = createContext<UploadValue | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const { lang } = useLanguage();

  const value = useMemo<UploadValue>(
    () => ({
      url,
      name,
      jobId,
      error,
      choose(file) {
        if (!file) return;
        const allowed =
          file.type.startsWith("video/") || /\.(mp4|mov)$/i.test(file.name);
        if (!allowed) {
          setError("Choose a video file.");
          return;
        }
        if (file.size > MAX_BYTES) {
          setError("That video is larger than 100 MB.");
          return;
        }
        const ticket = ++request.current;
        setUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(file);
        });
        setName(file.name);
        setJobId(null);
        setError(null);
        const body = new FormData();
        body.set("video", file);
        body.set("lang", lang);
        body.set("pain_reported", "false");
        void fetch("/api/analyze", { method: "POST", body })
          .then(async (response) => {
            const payload = (await response.json().catch(() => null)) as { job_id?: string; error?: string } | null;
            if (request.current !== ticket) return;
            if (!response.ok || !payload?.job_id) {
              setError(payload?.error ?? "The video could not be sent for analysis.");
              return;
            }
            setJobId(payload.job_id);
          })
          .catch(() => {
            if (request.current === ticket) setError("The video could not be sent for analysis.");
          });
      },
      clear() {
        request.current += 1;
        setUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return null;
        });
        setName(null);
        setJobId(null);
        setError(null);
      },
    }),
    [url, name, jobId, error, lang],
  );

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUpload(): UploadValue {
  const value = useContext(UploadContext);
  if (!value) throw new Error("Upload state is missing.");
  return value;
}
