from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.coco import COCO_17
from app.vision import VISION_LABEL_MODELS


class VideoInfo(BaseModel):
    fps: float
    frames: int = Field(ge=1)
    width: int = Field(ge=1)
    height: int = Field(ge=1)


class AngleSeries(BaseModel):
    user: list[float]
    corrected: list[float]
    target_range: tuple[float, float]


class FormError(BaseModel):
    type: Literal["hip_misalignment"]
    frames: tuple[int, int]
    severity: Literal["minor", "moderate", "major"]


class ExerciseInfo(BaseModel):
    id: str
    label: str
    source: Literal["vision", "selected"]
    model: str | None = None

    @model_validator(mode="after")
    def model_matches_source(self) -> "ExerciseInfo":
        if self.source == "vision" and self.model not in VISION_LABEL_MODELS:
            raise ValueError("a vision label needs the catalogue model that confirmed it")
        if self.source == "selected" and self.model is not None:
            raise ValueError("a selected exercise has no vision model")
        return self


class CoachStep(BaseModel):
    text: str
    frames: tuple[int, int]
    audio_url: str | None


class Coach(BaseModel):
    lang: str
    summary: str
    cue: str
    steps: list[CoachStep]


class Safety(BaseModel):
    handover: bool
    message: str | None


class Timings(BaseModel):
    pose_ms: float
    vision_ms: float
    analysis_ms: float
    coach_ms: float
    speech_ms: float
    device: str


class Result(BaseModel):
    job_id: str
    status: Literal["queued", "running", "done", "failed", "low_confidence"]
    progress: float = Field(ge=0, le=1)
    video: VideoInfo
    keypoint_names: list[str]
    keypoints_user: list[list[list[float]]]
    keypoints_corrected: list[list[list[float]]]
    angles: dict[str, AngleSeries]
    errors: list[FormError]
    exercise: ExerciseInfo
    confidence: float = Field(ge=0, le=1)
    coach: Coach | None
    safety: Safety
    timings: Timings
    error_message: str | None = None

    @model_validator(mode="after")
    def matches_contract(self) -> "Result":
        n = self.video.frames
        if self.keypoint_names != list(COCO_17):
            raise ValueError("keypoint_names must be the 17 COCO names")
        if len(self.keypoints_user) != n or len(self.keypoints_corrected) != n:
            raise ValueError("keypoint frames do not match the clip")
        series = self.angles.get("hip_offset")
        if series is None or len(series.user) != n or len(series.corrected) != n:
            raise ValueError("hip_offset length does not match the clip")
        for frame in self.keypoints_user:
            if len(frame) != 17 or any(len(p) != 3 for p in frame):
                raise ValueError("each user keypoint is x, y, confidence")
        for frame in self.keypoints_corrected:
            if len(frame) != 17 or any(len(p) != 2 for p in frame):
                raise ValueError("each corrected keypoint is x, y")
        for error in self.errors:
            a, b = error.frames
            if a < 0 or b >= n or a > b:
                raise ValueError("error frames fall outside the clip")
        if self.coach:
            for step in self.coach.steps:
                a, b = step.frames
                if a < 0 or b >= n or a > b:
                    raise ValueError("coach step frames fall outside the clip")
        if self.status == "failed" and not self.error_message:
            raise ValueError("failed results need error_message")
        return self
