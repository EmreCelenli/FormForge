def smooth(values: list[float | None], window: int = 1) -> list[float | None]:
    if window <= 1:
        return list(values)
    half = window // 2
    out: list[float | None] = []
    for i in range(len(values)):
        chunk = [v for v in values[max(0, i - half) : i + half + 1] if v is not None]
        out.append(sum(chunk) / len(chunk) if chunk else None)
    return out
