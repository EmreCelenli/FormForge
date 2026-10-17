"""Analyze one uploaded video with the plank pipeline.

Usage, from the repository root:
  backend/.venv/bin/python backend/scripts/analyze_video.py --video path --job-dir data/jobs/<id>
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "backend" / "scripts"))

from app.analyze import analyze, load_config  # noqa: E402
from app.coach import coach_from_model  # noqa: E402
from app.pose import frame_from_image, landmarker  # noqa: E402
from app.schemas import Result  # noqa: E402
import run_clip  # noqa: E402


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload))
    temporary.replace(path)


def write_state(job_dir: Path, job_id: str, status: str, progress: float, error: str | None = None) -> None:
    payload = {"job_id": job_id, "status": status, "progress": max(0.0, min(1.0, progress))}
    if error:
        payload["status"] = "failed"
        payload["error_message"] = error
    write_json(job_dir / "state.json", payload)


def run_ffmpeg(args: list[str]) -> None:
    completed = subprocess.run(args, capture_output=True, text=True)
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "ffmpeg failed").strip().splitlines()
        raise RuntimeError(detail[-1][:240] if detail else "ffmpeg failed")


def prepare_media(source: Path, job_dir: Path) -> tuple[list[Path], int, int, float]:
    playable = job_dir / "video.mp4"
    frames = job_dir / "frames"
    frames.mkdir(parents=True, exist_ok=True)
    run_ffmpeg(
        [
            "ffmpeg", "-y", "-i", str(source),
            "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(playable),
        ]
    )
    run_ffmpeg(
        [
            "ffmpeg", "-y", "-i", str(playable),
            "-vf", "scale=640:-2", "-r", "30", str(frames / "f%04d.jpg"),
        ]
    )
    images = sorted(frames.glob("f*.jpg"))
    if not images:
        raise RuntimeError("The video did not produce any frames.")
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height,duration",
            "-of", "json", str(playable),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    stream = json.loads(probe.stdout)["streams"][0]
    width = int(stream["width"])
    height = int(stream["height"])
    duration = float(stream.get("duration") or 0)
    fps = (len(images) / duration) if duration > 0 else 30.0
    return images, width, height, fps


def finish(env: dict[str, str], job_dir: Path, job_id: str, images: list[Path], frames, width: int, height: int, fps: float, pose_ms: float, lang: str) -> None:
    started = time.perf_counter()
    result = analyze(frames, width=width, height=height, fps=fps)
    analysis_ms = (time.perf_counter() - started) * 1000
    write_state(job_dir, job_id, "running", 0.78)

    vision_ms = 0.0
    source = "selected"
    recognized = None
    if result.status != "low_confidence":
        source, recognized, vision_ms = run_clip.recognize_exercise(env, images)
    write_state(job_dir, job_id, "running", 0.86)

    coach = None
    coach_ms = 0.0
    speech_ms = 0.0
    if result.status == "done":
        prompt, spans = run_clip.finding_prompt(result, load_config()["min_keypoint_confidence"], lang)
        started = time.perf_counter()
        status, text = run_clip.chat(env, env["TOKEN_FACTORY_MODEL_ID"], [{"role": "user", "content": prompt}])
        coach_ms = (time.perf_counter() - started) * 1000
        if status == 200:
            coach = coach_from_model(text, spans, lang)
        if coach is not None:
            speech_ms = run_clip.speak_steps(env, coach, job_dir / "audio", f"/api/jobs/{job_id}/audio")
            for index, step in enumerate(coach["steps"]):
                if step.get("audio_url"):
                    step["audio_url"] = f"/api/jobs/{job_id}/audio/{index}"

    payload = result.model_dump()
    payload["job_id"] = job_id
    payload["exercise"]["source"] = source
    payload["exercise"]["model"] = recognized
    payload["coach"] = coach
    payload["progress"] = 1
    payload["timings"] = {
        "pose_ms": round(pose_ms, 1),
        "vision_ms": round(vision_ms, 1),
        "analysis_ms": round(analysis_ms, 1),
        "coach_ms": round(coach_ms, 1),
        "speech_ms": round(speech_ms, 1),
        "device": "cpu",
    }
    checked = Result.model_validate(payload)
    write_json(job_dir / "result.json", json.loads(checked.model_dump_json()))
    write_state(job_dir, job_id, checked.status, 1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--job-dir", required=True)
    parser.add_argument("--lang", default="en")
    args = parser.parse_args()
    os.environ.setdefault("MPLCONFIGDIR", "/tmp/mpl")
    job_dir = Path(args.job_dir).resolve()
    jobs_root = (ROOT / "data" / "jobs").resolve()
    if jobs_root not in job_dir.parents:
        raise SystemExit("job directory is outside data/jobs")
    job_id = job_dir.name
    source = Path(args.video).resolve()
    if source.parent != job_dir:
        raise SystemExit("video must stay inside its job directory")
    try:
        env = run_clip.load_env(ROOT / ".env")
        write_state(job_dir, job_id, "running", 0.05)
        images, width, height, fps = prepare_media(source, job_dir)
        write_state(job_dir, job_id, "running", 0.15)
        started = time.perf_counter()
        detector = landmarker()
        frames = []
        total = len(images)
        for index, image in enumerate(images, start=1):
            frames.append(frame_from_image(detector, image))
            if index == total or index % 20 == 0:
                write_state(job_dir, job_id, "running", 0.15 + 0.6 * (index / total))
        pose_ms = (time.perf_counter() - started) * 1000
        detector.close()
        finish(env, job_dir, job_id, images, frames, width, height, fps, pose_ms, args.lang)
    except Exception as error:
        message = str(error).strip() or "Analysis failed."
        write_state(job_dir, job_id, "failed", 1, message[:240])
        raise


if __name__ == "__main__":
    main()
