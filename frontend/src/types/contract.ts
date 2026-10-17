export type JobStatus =
  | "queued"
  | "running"
  | "done"
  | "failed"
  | "low_confidence";

export interface AngleSeries {
  user: number[];
  corrected: number[];
  target_range: [number, number];
}

export interface Result {
  job_id: string;
  status: JobStatus;
  progress: number;
  video: {
    fps: number;
    frames: number;
    width: number;
    height: number;
  };
  keypoint_names: string[];
  keypoints_user: number[][][];
  keypoints_corrected: number[][][];
  angles: {
    hip_offset: AngleSeries;
  };
  errors: {
    type: "hip_misalignment";
    frames: [number, number];
    severity: "minor" | "moderate" | "major";
  }[];
  exercise: {
    id: string;
    label: string;
    source: "vision" | "selected";
    model: string | null;
  };
  confidence: number;
  coach: {
    lang: string;
    summary: string;
    cue: string;
    steps: {
      text: string;
      frames: [number, number];
      audio_url: string | null;
    }[];
  } | null;
  safety: {
    handover: boolean;
    message: string | null;
  };
  timings: {
    pose_ms: number;
    vision_ms: number;
    analysis_ms: number;
    coach_ms: number;
    speech_ms: number;
    device: string;
  };
  error_message?: string;
}
