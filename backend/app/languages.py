"""Demo languages. Codes are ISO 639-1, which is also what Gemma receives."""

LANGUAGES = {
    "en": "English",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "pt": "Portuguese",
}


def language_name(lang: str) -> str:
    try:
        return LANGUAGES[lang]
    except KeyError as error:
        raise ValueError(f"unknown language {lang}") from error


def voice_id_for(env: dict[str, str], lang: str) -> str:
    if lang not in LANGUAGES:
        raise ValueError(f"unknown language {lang}")
    chosen = env.get(f"GRADIUM_VOICE_ID_{lang.upper()}", "").strip()
    if chosen:
        return chosen
    if lang == "en":
        return env.get("GRADIUM_VOICE_ID", "").strip()
    return ""
