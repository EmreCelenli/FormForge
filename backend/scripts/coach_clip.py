"""Ask Gemma, then Gradium, for a saved clip in one demo language.

The pose result stays as it is. A finished coach file is reused. If a voice id
has been added since that file was written, only the missing audio is requested.

Usage, from the repository root:
  backend/.venv/bin/python backend/scripts/coach_clip.py \
    --result frontend/src/data/result.json --lang fr \
    --audio-dir frontend/public/coach-lang/short/fr \
    --audio-prefix /coach-lang/short/fr \
    --out data/demo-coach/short/fr.json
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "backend" / "scripts"))

from app.analyze import load_config  # noqa: E402
from app.coach import coach_from_model  # noqa: E402
from app.languages import voice_id_for  # noqa: E402
from app.schemas import Result  # noqa: E402
import run_clip  # noqa: E402


def read_coach(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        value = json.loads(path.read_text())
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def coach_ready(coach: dict | None, lang: str, voice: str) -> bool:
    if not coach or coach.get("lang") != lang:
        return False
    summary = coach.get("summary")
    steps = coach.get("steps")
    if not isinstance(summary, str) or not summary.strip():
        return False
    if not isinstance(steps, list) or not 2 <= len(steps) <= 3:
        return False
    for step in steps:
        if not isinstance(step, dict):
            return False
        text = step.get("text")
        frames = step.get("frames")
        if not isinstance(text, str) or not text.strip():
            return False
        if not isinstance(frames, list) or len(frames) != 2:
            return False
        if voice and not step.get("audio_url"):
            return False
    return True


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload))
    temporary.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--result", required=True)
    parser.add_argument("--lang", required=True)
    parser.add_argument("--audio-dir", required=True)
    parser.add_argument("--audio-prefix", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    env = run_clip.load_env(ROOT / ".env")
    voice = voice_id_for(env, args.lang)
    out = Path(args.out)
    existing = None if args.force else read_coach(out)
    if coach_ready(existing, args.lang, ""):
        if not coach_ready(existing, args.lang, voice):
            run_clip.speak_steps(env, existing, Path(args.audio_dir), args.audio_prefix)
            write_json(out, existing)
        return

    result = Result.model_validate(json.loads(Path(args.result).read_text()))
    prompt, spans = run_clip.finding_prompt(result, load_config()["min_keypoint_confidence"], args.lang)
    status, text = run_clip.chat(
        env,
        env["TOKEN_FACTORY_MODEL_ID"],
        [{"role": "user", "content": prompt}],
    )
    coach = coach_from_model(text, spans, args.lang) if status == 200 else None
    if coach is None:
        print(f"coach_http {status}", file=sys.stderr)
        raise SystemExit("coach unavailable")
    run_clip.speak_steps(env, coach, Path(args.audio_dir), args.audio_prefix)
    write_json(out, coach)


if __name__ == "__main__":
    main()
