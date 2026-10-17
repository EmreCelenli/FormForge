from app.angles import frame_offset, hip_offset_degrees
from app.coco import index

def _on_line(
    shoulder: tuple[float, float],
    ankle: tuple[float, float],
    hip: tuple[float, float],
) -> tuple[float, float] | None:
    dx, dy = ankle[0] - shoulder[0], ankle[1] - shoulder[1]
    span = dx * dx + dy * dy
    if span < 1e-6:
        return None
    t = ((hip[0] - shoulder[0]) * dx + (hip[1] - shoulder[1]) * dy) / span
    t = min(1.0, max(0.0, t))
    return shoulder[0] + t * dx, shoulder[1] + t * dy


def _side_offset(frame, side: str, width: float, height: float, minimum: float) -> float | None:
    names = (f"{side}_shoulder", f"{side}_hip", f"{side}_ankle")
    if min(frame[index(name)][2] for name in names) < minimum:
        return None
    return hip_offset_degrees(
        tuple(frame[index(names[0])][:2]),
        tuple(frame[index(names[1])][:2]),
        tuple(frame[index(names[2])][:2]),
        width,
        height,
    )


def _straighten_side(frame, xy, side: str, width: float, height: float) -> bool:
    """Drop the hip onto the shoulder–ankle line. Hands and feet stay where they were measured."""
    hip_i = index(f"{side}_hip")
    shoulder_i = index(f"{side}_shoulder")
    ankle_i = index(f"{side}_ankle")
    knee_i = index(f"{side}_knee")
    hip = (frame[hip_i][0] * width, frame[hip_i][1] * height)
    shoulder = (frame[shoulder_i][0] * width, frame[shoulder_i][1] * height)
    ankle = (frame[ankle_i][0] * width, frame[ankle_i][1] * height)
    knee = (frame[knee_i][0] * width, frame[knee_i][1] * height)
    new_hip = _on_line(shoulder, ankle, hip)
    if new_hip is None:
        return False
    leg = (ankle[0] - hip[0], ankle[1] - hip[1])
    leg_span = leg[0] * leg[0] + leg[1] * leg[1]
    if leg_span > 1e-6:
        frac = ((knee[0] - hip[0]) * leg[0] + (knee[1] - hip[1]) * leg[1]) / leg_span
        frac = min(1.0, max(0.0, frac))
        xy[knee_i] = [
            (new_hip[0] + frac * (ankle[0] - new_hip[0])) / width,
            (new_hip[1] + frac * (ankle[1] - new_hip[1])) / height,
        ]
    xy[hip_i] = [new_hip[0] / width, new_hip[1] / height]
    xy[shoulder_i] = [frame[shoulder_i][0], frame[shoulder_i][1]]
    xy[ankle_i] = [frame[ankle_i][0], frame[ankle_i][1]]
    for joint in ("elbow", "wrist"):
        i = index(f"{side}_{joint}")
        xy[i] = [frame[i][0], frame[i][1]]
    return True


def correct_frame(
    frame: list[list[float]],
    width: float,
    height: float,
    minimum: float,
    band: tuple[float, float],
) -> tuple[list[list[float]], bool]:
    xy = [[p[0], p[1]] for p in frame]
    offset = frame_offset(frame, width, height, minimum)
    if offset is None:
        return xy, False
    if band[0] <= offset <= band[1]:
        return xy, True
    for side in ("left", "right"):
        side_offset = _side_offset(frame, side, width, height, minimum)
        if side_offset is None or band[0] <= side_offset <= band[1]:
            continue
        if not _straighten_side(frame, xy, side, width, height):
            return [[p[0], p[1]] for p in frame], False
    fixed = frame_offset([row + [frame[i][2]] for i, row in enumerate(xy)], width, height, minimum)
    if fixed is None or not (band[0] <= fixed <= band[1]):
        return [[p[0], p[1]] for p in frame], False
    return xy, True
