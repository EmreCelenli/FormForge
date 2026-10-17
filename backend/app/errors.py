def severity(offset: float, band: tuple[float, float], cuts: dict[str, float]) -> str:
    excess = band[0] - offset if offset < band[0] else offset - band[1]
    if excess < cuts["minor"]:
        return "minor"
    if excess < cuts["moderate"]:
        return "moderate"
    return "major"


def misalignment_span(
    offsets: list[float | None], band: tuple[float, float]
) -> tuple[int, int] | None:
    start = None
    for i, offset in enumerate(offsets):
        outside = offset is not None and not (band[0] <= offset <= band[1])
        if outside and start is None:
            start = i
        elif not outside and start is not None:
            return start, i - 1
    if start is None:
        return None
    return start, len(offsets) - 1
