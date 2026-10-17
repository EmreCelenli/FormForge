"""Accept a vision-model exercise label only when it names a configured check."""

from app.coach import extract_json

# MiniCPM is asked first. DeepSeek is asked only when MiniCPM is not confident.
VISION_LABEL_MODELS = ("MiniCPM-V-4.7-1B", "DeepSeek-V4-Flash-Vision-Exp")


def exercise_source(text: str, allowed: set[str]) -> str:
    data = extract_json(text)
    if data is None:
        return "selected"
    exercise = data.get("exercise")
    confident = data.get("confident")
    if confident is True and isinstance(exercise, str) and exercise in allowed:
        return "vision"
    return "selected"


def accepting_model(answers: list[tuple[str, str]], allowed: set[str]) -> str | None:
    """Return the first allowed catalogue model that confidently names a configured exercise."""
    for model, text in answers:
        if model not in VISION_LABEL_MODELS:
            continue
        if exercise_source(text, allowed) == "vision":
            return model
    return None
