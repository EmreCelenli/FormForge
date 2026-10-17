"""Turn a validated plank finding into short coach lines. Gemma does not choose frame spans."""

import json


def step_spans(start: int, end: int, count: int) -> list[tuple[int, int]]:
    if end < start:
        raise ValueError("span is reversed")
    count = max(1, min(count, end - start + 1))
    length = end - start + 1
    spans = []
    for i in range(count):
        a = start + (i * length) // count
        b = start + ((i + 1) * length) // count - 1
        spans.append((a, b))
    return spans


def extract_json(text: str) -> dict | None:
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        value = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def coach_from_model(text: str, spans: list[tuple[int, int]], lang: str) -> dict | None:
    data = extract_json(text)
    if data is None:
        return None
    summary = data.get("summary")
    steps = data.get("steps")
    if not isinstance(summary, str) or not summary.strip():
        return None
    if not isinstance(steps, list) or not (2 <= len(steps) <= 3):
        return None
    if len(steps) != len(spans):
        return None
    if not all(isinstance(step, str) and step.strip() for step in steps):
        return None
    lines = [step.strip() for step in steps]
    return {
        "lang": lang,
        "summary": summary.strip(),
        "cue": " ".join(lines),
        "steps": [
            {"text": line, "frames": [a, b], "audio_url": None}
            for line, (a, b) in zip(lines, spans)
        ],
    }


def message_text(payload: dict) -> str:
    try:
        content = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                parts.append(str(part.get("text") or ""))
        return "".join(parts)
    return ""
