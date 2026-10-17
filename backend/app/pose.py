"""Map BlazePose landmarks into the documented COCO-17 order and run that model on CPU."""

from pathlib import Path

import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

from app.coco import COCO_17

# MediaPipe pose indices in COCO-17 order. See PoseLandmark in mediapipe 1.1.1.
BLAZEPOSE_FOR_COCO17 = (0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28)
MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "pose_landmarker_full.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_full/float16/latest/pose_landmarker_full.task"
)


def coco17_from_landmarks(landmarks: list[tuple[float, float, float]]) -> list[list[float]]:
    if len(landmarks) <= BLAZEPOSE_FOR_COCO17[-1]:
        raise ValueError("expected BlazePose landmarks through the ankles")
    if len(BLAZEPOSE_FOR_COCO17) != len(COCO_17):
        raise ValueError("COCO-17 mapping length drifted")
    return [
        [float(landmarks[i][0]), float(landmarks[i][1]), float(landmarks[i][2])]
        for i in BLAZEPOSE_FOR_COCO17
    ]


def empty_frame() -> list[list[float]]:
    return [[0.0, 0.0, 0.0] for _ in COCO_17]


def landmarks_from_pose(pose) -> list[list[float]]:
    if not pose:
        return empty_frame()
    points = []
    for landmark in pose:
        visibility = getattr(landmark, "visibility", None)
        confidence = 0.0 if visibility is None else float(visibility)
        points.append((float(landmark.x), float(landmark.y), confidence))
    return coco17_from_landmarks(points)


def landmarker(model_path: Path = MODEL_PATH):
    options = vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(model_path)),
        running_mode=vision.RunningMode.IMAGE,
        num_poses=1,
    )
    return vision.PoseLandmarker.create_from_options(options)


def frame_from_image(detector, image_path: Path) -> list[list[float]]:
    image = mp.Image.create_from_file(str(image_path))
    result = detector.detect(image)
    poses = result.pose_landmarks or []
    return landmarks_from_pose(poses[0] if poses else None)
