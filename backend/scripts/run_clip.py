"""Run the plank clip once: MediaPipe on CPU, then Gemma, then Gradium.

Usage, from the repository root:
  backend/.venv/bin/python backend/scripts/run_clip.py
"""

import argparse
import base64
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.analyze import analyze, load_config  # noqa: E402
from app.angles import frame_offset  # noqa: E402
from app.coach import coach_from_model, message_text, step_spans  # noqa: E402
from app.languages import language_name, voice_id_for  # noqa: E402
from app.pose import frame_from_image, landmarker  # noqa: E402
from app.schemas import Result  # noqa: E402
from app.speech import save_wav  # noqa: E402
from app.vision import VISION_LABEL_MODELS, exercise_source  # noqa: E402


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key] = value.strip().strip('"').strip("'")
    return env


def post_json(url: str, payload: dict, headers: dict[str, str], timeout: int) -> tuple[int, bytes]:
    data = json.dumps(payload).encode()
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    context = ssl.create_default_context(cafile="/etc/ssl/cert.pem")
    try:
        with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def chat(env: dict[str, str], model: str, messages: list, timeout: int = 90) -> tuple[int, str]:
    base = env["TOKEN_FACTORY_BASE_URL"].rstrip("/")
    status, body = post_json(
        f"{base}/chat/completions",
        {"model": model, "messages": messages, "temperature": 0.2, "max_tokens": 400},
        {"Authorization": f"Bearer {env['TOKEN_FACTORY_API_KEY']}"},
        timeout,
    )
    text = body.decode("utf-8", "replace")
    if status != 200:
        return status, text[:400]
    try:
        return status, message_text(json.loads(text))
    except json.JSONDecodeError:
        return status, ""


def vision_model_order(env: dict[str, str]) -> list[str]:
    primary = env.get("TOKEN_FACTORY_VISION_MODEL_ID", VISION_LABEL_MODELS[0])
    fallback = env.get("TOKEN_FACTORY_VISION_FALLBACK_MODEL_ID", VISION_LABEL_MODELS[1])
    order = []
    for model in (primary, fallback):
        if model in VISION_LABEL_MODELS and model not in order:
            order.append(model)
    return order


def recognize_exercise(env: dict[str, str], images: list[Path]) -> tuple[str, str | None, float]:
    """Ask MiniCPM first. Ask DeepSeek only when MiniCPM does not confirm the exercise."""
    picks = [images[0], images[len(images) // 2], images[-1]]
    content: list = [
        {
            "type": "text",
            "text": (
                "These frames are from one exercise video. Reply with JSON only: "
                '{"exercise":"high_plank" or "unknown","confident":true or false}. '
                "high_plank means a side-view high plank on the hands and toes. "
                "If you are not sure, set confident to false. Do not judge form."
            ),
        }
    ]
    for path in picks:
        encoded = path.read_bytes()
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(encoded).decode()},
            }
        )
    vision_ms = 0.0
    answers: list[tuple[str, str]] = []
    for model in vision_model_order(env):
        started = time.perf_counter()
        status, text = chat(env, model, [{"role": "user", "content": content}], timeout=120)
        vision_ms += (time.perf_counter() - started) * 1000
        if status != 200:
            print(f"vision_http {status}")
            continue
        answers.append((model, text))
        if exercise_source(text, {"high_plank"}) == "vision":
            break
    recognized = None
    for model, text in answers:
        if exercise_source(text, {"high_plank"}) == "vision":
            recognized = model
            break
    return ("vision" if recognized else "selected"), recognized, vision_ms


def speak_steps(env: dict[str, str], coach: dict, audio_dir: Path, audio_prefix: str) -> float:
    voice = voice_id_for(env, coach["lang"])
    if not voice:
        return 0.0
    started = time.perf_counter()
    for index, step in enumerate(coach["steps"]):
        if step.get("audio_url"):
            continue
        code, body = post_json(
            env["GRADIUM_TTS_URL"],
            {
                "text": step["text"],
                "voice_id": voice,
                "output_format": "wav",
                "only_audio": True,
            },
            {"x-api-key": env["GRADIUM_API_KEY"]},
            timeout=60,
        )
        path = audio_dir / f"step-{index}.wav"
        if code == 200 and save_wav(path, body):
            step["audio_url"] = f"{audio_prefix}/step-{index}.wav"
        else:
            print(f"speech_http {code} bytes {len(body)}", file=sys.stderr)
    return (time.perf_counter() - started) * 1000


def finding_prompt(result: Result, minimum: float, lang: str = "en") -> tuple[str, list[tuple[int, int]]]:
    width, height = result.video.width, result.video.height
    measured = []
    for index, frame in enumerate(result.keypoints_user):
        value = frame_offset(frame, width, height, minimum)
        if value is not None:
            measured.append((index, value))
    if result.errors:
        error = result.errors[0]
        start, end = error.frames
        span_values = [value for index, value in measured if start <= index <= end]
        peak = max(span_values, key=abs) if span_values else 0.0
        fact = (
            f"Supported finding: hip_misalignment, severity {error.severity}, "
            f"inclusive frames {start}-{end}. Peak hip offset in that span: {peak:.1f} degrees. "
            "Positive is sag (hip on the ground side of the shoulder-ankle line). Negative is pike."
        )
    else:
        start, end = 0, result.video.frames - 1
        peak = max((value for _, value in measured), key=abs) if measured else 0.0
        fact = (
            "No hip_misalignment span was found. Evaluable hip offsets stayed inside the "
            f"provisional band. Peak hip offset: {peak:.1f} degrees."
        )
    count = 2 if end - start < 2 else 3
    spans = step_spans(start, end, count)
    band = result.angles["hip_offset"].target_range
    name = language_name(lang)
    prompt = (
        "You write short coaching lines for one high plank. You do not measure anything.\n"
        f"Language: {name}. Write the summary and every step originally in {name}.\n"
        "Do not translate a fixed script from another language. Phrase it the way a coach would speak in this language.\n"
        "Talk about the hips and the straight shoulder-hip-ankle line. Do not mention the spine or the back as something you measured.\n"
        f"{fact}\n"
        f"Provisional target band: {band[0]} to {band[1]} degrees. "
        "That band is an engineering label, not a clinical standard. "
        "The meter shows 180 minus the absolute offset. Straight is 180.\n"
        f"Reply with JSON only: {{\"summary\": \"two or three short sentences\", \"steps\": [{count} short spoken lines]}}. "
        "The summary is read on screen. Explain the hip finding and what the corrected pose changes. "
        "The steps are spoken aloud, so keep each one to a few words. "
        "The lines will be spoken in order. Do not choose frame numbers. "
        "You may mention the peak offset and the target band. Do not add any other number. "
        "Do not diagnose, prescribe treatment, or name a different exercise."
    )
    return prompt, spans


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", default="/tmp/formforge-frames")
    parser.add_argument("--result", default="frontend/src/data/result.json")
    parser.add_argument("--audio-dir", default="frontend/public/coach")
    parser.add_argument("--audio-prefix", default="/coach")
    parser.add_argument("--job-id", default="plank-clip")
    parser.add_argument("--fps", type=float, default=30)
    parser.add_argument("--lang", default="en")
    args = parser.parse_args()
    frames_dir = Path(args.frames)
    result_path = ROOT / args.result
    audio_dir = ROOT / args.audio_dir
    os.environ.setdefault("MPLCONFIGDIR", "/tmp/mpl")
    env = load_env(ROOT / ".env")
    images = sorted(frames_dir.glob("f*.jpg"))
    if not images:
        raise SystemExit(f"no frames in {frames_dir}")

    started = time.perf_counter()
    detector = landmarker()
    frames = []
    for image in images:
        frames.append(frame_from_image(detector, image))
    pose_ms = (time.perf_counter() - started) * 1000
    detector.close()

    started = time.perf_counter()
    result = analyze(frames, width=1920, height=1080, fps=args.fps)
    analysis_ms = (time.perf_counter() - started) * 1000

    vision_ms = 0.0
    source = "selected"
    recognized = None
    if result.status != "low_confidence":
        source, recognized, vision_ms = recognize_exercise(env, images)

    coach = None
    coach_ms = 0.0
    speech_ms = 0.0
    if result.status == "done":
        prompt, spans = finding_prompt(result, load_config()["min_keypoint_confidence"], args.lang)
        started = time.perf_counter()
        status, text = chat(
            env,
            env["TOKEN_FACTORY_MODEL_ID"],
            [{"role": "user", "content": prompt}],
        )
        coach_ms = (time.perf_counter() - started) * 1000
        if status == 200:
            coach = coach_from_model(text, spans, args.lang)
        else:
            print(f"coach_http {status}")
        if coach is not None:
            speech_ms = speak_steps(env, coach, audio_dir, args.audio_prefix)

    payload = result.model_dump()
    payload["job_id"] = args.job_id
    payload["exercise"]["source"] = source
    payload["exercise"]["model"] = recognized
    payload["coach"] = coach
    payload["timings"] = {
        "pose_ms": round(pose_ms, 1),
        "vision_ms": round(vision_ms, 1),
        "analysis_ms": round(analysis_ms, 1),
        "coach_ms": round(coach_ms, 1),
        "speech_ms": round(speech_ms, 1),
        "device": "cpu",
    }
    checked = Result.model_validate(payload)
    result_path.parent.mkdir(parents=True, exist_ok=True)
    result_path.write_text(checked.model_dump_json(indent=2))
    audio = 0 if checked.coach is None else sum(step.audio_url is not None for step in checked.coach.steps)
    error = checked.errors[0].type if checked.errors else "none"
    print(
        f"status {checked.status} confidence {checked.confidence:.2f} "
        f"error {error} exercise {checked.exercise.source} "
        f"coach {'yes' if checked.coach else 'no'} audio {audio} "
        f"pose_ms {checked.timings.pose_ms} device {checked.timings.device}"
    )


if __name__ == "__main__":
    main()
