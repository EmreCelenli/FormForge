"""Gradium speaks finished coach lines. It does not rewrite them."""

from pathlib import Path


def save_wav(path: Path, body: bytes) -> bool:
    if len(body) < 12 or not body.startswith(b"RIFF") or body[8:12] != b"WAVE":
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(body)
    return True
