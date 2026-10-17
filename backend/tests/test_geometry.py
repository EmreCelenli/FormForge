import unittest

from app.analyze import analyze
from app.angles import frame_offset, hip_offset_degrees
from app.coco import COCO_17, index
from app.planner import correct_frame
from app.schemas import Result


def blank() -> list[list[float]]:
    return [[0.0, 0.0, 0.0] for _ in COCO_17]


def side_plank(hip_y: float, confidence: float = 0.9) -> list[list[float]]:
    frame = blank()
    for name, x, y in (
        ("left_shoulder", 0.2, 0.4),
        ("left_hip", 0.5, hip_y),
        ("left_ankle", 0.8, 0.4),
        ("left_elbow", 0.15, 0.55),
        ("left_wrist", 0.1, 0.7),
        ("left_knee", 0.65, 0.4),
    ):
        frame[index(name)] = [x, y, confidence]
    return frame


class GeometryTest(unittest.TestCase):
    def test_sign_and_aspect(self):
        straight = hip_offset_degrees((0.2, 0.4), (0.5, 0.4), (0.8, 0.4), 100, 100)
        sag = hip_offset_degrees((0.2, 0.4), (0.5, 0.7), (0.8, 0.4), 100, 100)
        pike = hip_offset_degrees((0.2, 0.4), (0.5, 0.2), (0.8, 0.4), 100, 100)
        self.assertEqual(straight, 0.0)
        self.assertGreater(sag, 0)
        self.assertLess(pike, 0)
        wide = hip_offset_degrees((0.1, 0.4), (0.25, 0.7), (0.4, 0.4), 200, 100)
        self.assertAlmostEqual(sag, wide, places=6)

    def test_visible_side_is_not_an_average(self):
        frame = side_plank(0.7)
        frame[index("right_shoulder")] = [0.2, 0.4, 0.1]
        frame[index("right_hip")] = [0.5, 0.1, 0.1]
        frame[index("right_ankle")] = [0.8, 0.4, 0.1]
        left_only = frame_offset(side_plank(0.7), 100, 100, 0.5)
        self.assertAlmostEqual(frame_offset(frame, 100, 100, 0.5), left_only)

    def test_hands_and_feet_stay_while_the_hip_drops_onto_the_line(self):
        frame = side_plank(0.7)
        xy, ok = correct_frame(frame, 100, 100, 0.5, (-5, 5))
        self.assertTrue(ok)
        wrist = index("left_wrist")
        ankle = index("left_ankle")
        shoulder = index("left_shoulder")
        self.assertEqual(xy[wrist], frame[wrist][:2])
        self.assertEqual(xy[ankle], frame[ankle][:2])
        self.assertEqual(xy[shoulder], frame[shoulder][:2])
        fixed = frame_offset([row + [frame[i][2]] for i, row in enumerate(xy)], 100, 100, 0.5)
        self.assertTrue(-5 <= fixed <= 5)
        self.assertEqual(len(xy), len(frame))

    def test_both_sides_rotate_around_their_own_hips(self):
        frame = side_plank(0.7)
        for name, x, y in (
            ("right_shoulder", 0.22, 0.42),
            ("right_hip", 0.5, 0.72),
            ("right_ankle", 0.78, 0.42),
            ("right_elbow", 0.16, 0.56),
            ("right_wrist", 0.12, 0.7),
            ("right_knee", 0.64, 0.42),
        ):
            frame[index(name)] = [x, y, 0.95]
        xy, ok = correct_frame(frame, 100, 100, 0.5, (-5, 5))
        self.assertTrue(ok)
        for side in ("left", "right"):
            self.assertEqual(xy[index(f"{side}_wrist")], frame[index(f"{side}_wrist")][:2])
            self.assertEqual(xy[index(f"{side}_ankle")], frame[index(f"{side}_ankle")][:2])
            hip = index(f"{side}_hip")
            fixed = hip_offset_degrees(
                tuple(xy[index(f"{side}_shoulder")]),
                tuple(xy[hip]),
                tuple(xy[index(f"{side}_ankle")]),
                100,
                100,
            )
            self.assertIsNotNone(fixed)
            self.assertTrue(-5 <= fixed <= 5)

    def test_hands_stay_on_the_arms_and_feet_on_the_legs(self):
        frame = side_plank(0.7)
        xy, ok = correct_frame(frame, 200, 100, 0.5, (-5, 5))
        self.assertTrue(ok)
        shoulder = index("left_shoulder")
        wrist = index("left_wrist")
        ankle = index("left_ankle")
        hip = index("left_hip")
        self.assertEqual(xy[wrist], frame[wrist][:2])
        self.assertEqual(xy[ankle], frame[ankle][:2])
        self.assertEqual(xy[shoulder], frame[shoulder][:2])
        self.assertNotEqual(xy[hip], frame[hip][:2])
        fixed = frame_offset([row + [frame[i][2]] for i, row in enumerate(xy)], 200, 100, 0.5)
        self.assertIsNotNone(fixed)
        self.assertTrue(-5 <= fixed <= 5)

    def test_live_meter_follows_the_visible_side(self):
        frame = side_plank(0.7, confidence=0.8)
        for name, x, y in (
            ("right_shoulder", 0.22, 0.42),
            ("right_hip", 0.5, 0.72),
            ("right_ankle", 0.78, 0.42),
            ("right_knee", 0.64, 0.42),
        ):
            frame[index(name)] = [x, y, 0.99]
        result = analyze([frame], 100, 100)
        self.assertTrue(-5 <= result.angles["hip_offset"].corrected[0] <= 5)
        self.assertEqual(
            result.keypoints_corrected[0][index("right_wrist")],
            frame[index("right_wrist")][:2],
        )

    def test_failed_correction_is_not_success(self):
        _, ok = correct_frame(side_plank(0.7), 100, 100, 0.5, (20, 30))
        self.assertFalse(ok)

    def test_low_confidence_does_not_correct(self):
        hidden = side_plank(0.7, confidence=0.1)
        result = analyze([hidden, hidden], 100, 100)
        self.assertEqual(result.status, "low_confidence")
        self.assertEqual(result.errors, [])
        self.assertEqual(result.keypoints_corrected[0][index("left_hip")], hidden[index("left_hip")][:2])

    def test_error_span_skips_unevaluable_frames(self):
        good = side_plank(0.4)
        bad = side_plank(0.75)
        hidden = side_plank(0.75, confidence=0.1)
        result = analyze([good, bad, bad, hidden], 100, 100)
        self.assertEqual(result.status, "done")
        self.assertEqual(result.errors[0].frames, (1, 2))

    def test_pain_handover_is_marked_unapproved(self):
        result = analyze([side_plank(0.4)], 100, 100, pain_reported=True)
        self.assertTrue(result.safety.handover)
        self.assertIn("Unapproved", result.safety.message)
        self.assertNotIn("exercise", result.safety.message.lower())


class SchemaTest(unittest.TestCase):
    def test_rejects_bad_shapes(self):
        payload = analyze([side_plank(0.4)], 100, 100).model_dump()
        Result.model_validate(payload)
        payload["errors"] = [{"type": "rounded_back", "frames": [0, 0], "severity": "minor"}]
        with self.assertRaises(Exception):
            Result.model_validate(payload)
        payload = analyze([side_plank(0.4)], 100, 100).model_dump()
        payload["coach"] = {
            "lang": "en",
            "summary": "Example.",
            "cue": "Example.",
            "steps": [{"text": "Example.", "frames": [4, 4], "audio_url": None}],
        }
        with self.assertRaises(Exception):
            Result.model_validate(payload)
        payload = analyze([side_plank(0.4)], 100, 100).model_dump()
        payload["keypoints_user"][0] = payload["keypoints_user"][0][:16]
        with self.assertRaises(Exception):
            Result.model_validate(payload)


if __name__ == "__main__":
    unittest.main()
