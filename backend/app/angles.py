import math

from app.coco import index


def to_plane(x: float, y: float, width: float, height: float) -> tuple[float, float]:
    return x * width, y * height


def _line_geometry(
    shoulder: tuple[float, float],
    hip: tuple[float, float],
    ankle: tuple[float, float],
    width: float,
    height: float,
) -> tuple[float, float] | None:
    """Signed hip offset in degrees, and the perpendicular gap as a fraction of the shoulder–ankle line."""
    sx, sy = to_plane(*shoulder, width, height)
    hx, hy = to_plane(*hip, width, height)
    ax, ay = to_plane(*ankle, width, height)
    upper = (sx - hx, sy - hy)
    lower = (ax - hx, ay - hy)
    nu = math.hypot(*upper)
    nl = math.hypot(*lower)
    if nu < 1e-6 or nl < 1e-6:
        return None
    cos = max(-1.0, min(1.0, (upper[0] * lower[0] + upper[1] * lower[1]) / (nu * nl)))
    magnitude = 180.0 - math.degrees(math.acos(cos))
    dx, dy = ax - sx, ay - sy
    span = math.hypot(dx, dy)
    if span < 1e-6:
        return None
    t = ((hx - sx) * dx + (hy - sy) * dy) / (span * span)
    ox, oy = hx - (sx + t * dx), hy - (sy + t * dy)
    gap = math.hypot(ox, oy) / span
    down_x, down_y = -dy, dx
    if down_y < 0 or (down_y == 0 and down_x < 0):
        down_x, down_y = -down_x, -down_y
    side = ox * down_x + oy * down_y
    if abs(side) < 1e-8 or magnitude < 1e-6:
        return 0.0, 0.0
    signed = magnitude if side > 0 else -magnitude
    return signed, gap


def hip_offset_degrees(
    shoulder: tuple[float, float],
    hip: tuple[float, float],
    ankle: tuple[float, float],
    width: float,
    height: float,
) -> float | None:
    geometry = _line_geometry(shoulder, hip, ankle, width, height)
    if geometry is None:
        return None
    return geometry[0]


def line_gap_fraction(
    shoulder: tuple[float, float],
    hip: tuple[float, float],
    ankle: tuple[float, float],
    width: float,
    height: float,
) -> float | None:
    geometry = _line_geometry(shoulder, hip, ankle, width, height)
    if geometry is None:
        return None
    return geometry[1]


def choose_side(frame: list[list[float]], minimum: float) -> str | None:
    best_name = None
    best_score = -1.0
    for name in ("left", "right"):
        score = min(
            frame[index(f"{name}_shoulder")][2],
            frame[index(f"{name}_hip")][2],
            frame[index(f"{name}_ankle")][2],
        )
        if score >= minimum and score > best_score:
            best_name = name
            best_score = score
    return best_name


def frame_offset(
    frame: list[list[float]], width: float, height: float, minimum: float
) -> float | None:
    side = choose_side(frame, minimum)
    if side is None:
        return None
    return hip_offset_degrees(
        tuple(frame[index(f"{side}_shoulder")][:2]),
        tuple(frame[index(f"{side}_hip")][:2]),
        tuple(frame[index(f"{side}_ankle")][:2]),
        width,
        height,
    )


def frame_line_gap(
    frame: list[list[float]], width: float, height: float, minimum: float
) -> float | None:
    side = choose_side(frame, minimum)
    if side is None:
        return None
    return line_gap_fraction(
        tuple(frame[index(f"{side}_shoulder")][:2]),
        tuple(frame[index(f"{side}_hip")][:2]),
        tuple(frame[index(f"{side}_ankle")][:2]),
        width,
        height,
    )
