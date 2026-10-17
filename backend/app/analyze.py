import json
from pathlib import Path

from app.angles import frame_offset
from app.coco import COCO_17
from app.errors import misalignment_span, severity
from app.planner import correct_frame
from app.schemas import Result
from app.smoothing import smooth

_CONFIG = Path(__file__).parent / "config" / "exercises" / "high_plank.json"
UNAPPROVED_HANDOVER = (
    "Unapproved wording. Stop and consult a qualified professional."
)


def load_config() -> dict:
    return json.loads(_CONFIG.read_text())


def analyze(
    frames: list[list[list[float]]],
    width: int,
    height: int,
    fps: float = 30,
    pain_reported: bool = False,
) -> Result:
    config = load_config()
    minimum = config["min_keypoint_confidence"]
    band = tuple(config["target_range"])
    raw = [frame_offset(frame, width, height, minimum) for frame in frames]
    offsets = smooth(raw, 1)
    evaluable = sum(v is not None for v in offsets)
    confidence = evaluable / len(frames)
    low = confidence < config["min_evaluable_frame_ratio"]
    corrected_xy: list[list[list[float]]] = []
    corrected_offsets: list[float] = []
    if low:
        for frame, offset in zip(frames, offsets):
            corrected_xy.append([[p[0], p[1]] for p in frame])
            corrected_offsets.append(0.0 if offset is None else offset)
        errors = []
        status = "low_confidence"
    else:
        span = misalignment_span(offsets, band)
        errors = []
        if span is not None:
            peak = max(
                (offsets[i] for i in range(span[0], span[1] + 1) if offsets[i] is not None),
                key=abs,
            )
            errors.append(
                {
                    "type": "hip_misalignment",
                    "frames": list(span),
                    "severity": severity(peak, band, config["severity_excess_degrees"]),
                }
            )
        status = "done"
        for frame, offset in zip(frames, offsets):
            if offset is None:
                corrected_xy.append([[p[0], p[1]] for p in frame])
                corrected_offsets.append(0.0)
                continue
            xy, ok = correct_frame(frame, width, height, minimum, band)
            fixed = frame_offset(
                [row + [frame[i][2]] for i, row in enumerate(xy)],
                width,
                height,
                minimum,
            )
            if ok and fixed is not None and band[0] <= fixed <= band[1]:
                corrected_xy.append(xy)
                corrected_offsets.append(fixed)
            else:
                corrected_xy.append([[p[0], p[1]] for p in frame])
                corrected_offsets.append(offset)
    user_offsets = [0.0 if v is None else v for v in offsets]
    return Result.model_validate(
        {
            "job_id": "local",
            "status": status,
            "progress": 1,
            "video": {"fps": fps, "frames": len(frames), "width": width, "height": height},
            "keypoint_names": list(COCO_17),
            "keypoints_user": frames,
            "keypoints_corrected": corrected_xy,
            "angles": {
                "hip_offset": {
                    "user": user_offsets,
                    "corrected": corrected_offsets,
                    "target_range": band,
                }
            },
            "errors": errors,
            "exercise": {"id": config["id"], "label": config["label"], "source": "selected"},
            "confidence": confidence,
            "coach": None,
            "safety": {
                "handover": pain_reported,
                "message": UNAPPROVED_HANDOVER if pain_reported else None,
            },
            "timings": {
                "pose_ms": 0,
                "vision_ms": 0,
                "analysis_ms": 0,
                "coach_ms": 0,
                "speech_ms": 0,
                "device": "unmeasured",
            },
        }
    )
