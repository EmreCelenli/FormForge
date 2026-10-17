import unittest

from app.coco import COCO_17, index
from app.coach import coach_from_model, step_spans
from app.pose import BLAZEPOSE_FOR_COCO17, coco17_from_landmarks
from app.vision import accepting_model, exercise_source


class PoseMapTest(unittest.TestCase):
    def test_coco_order_uses_blazepose_indices(self):
        landmarks = [(float(i), float(i) / 100, 0.5) for i in range(33)]
        frame = coco17_from_landmarks(landmarks)
        self.assertEqual(len(frame), 17)
        shoulder = index("left_shoulder")
        self.assertEqual(frame[shoulder][0], float(BLAZEPOSE_FOR_COCO17[shoulder]))
        self.assertEqual(COCO_17[shoulder], "left_shoulder")
        self.assertEqual(BLAZEPOSE_FOR_COCO17[index("right_ankle")], 28)


class CoachSpanTest(unittest.TestCase):
    def test_spans_cover_the_measured_range(self):
        self.assertEqual(step_spans(0, 9, 3), [(0, 2), (3, 5), (6, 9)])

    def test_model_text_keeps_assigned_spans(self):
        text = '{"summary": "Hips sit below the line.", "steps": ["Brace.", "Lift the hips."]}'
        coach = coach_from_model(text, [(0, 4), (5, 9)], "en")
        self.assertIsNotNone(coach)
        self.assertEqual(coach["steps"][1]["frames"], [5, 9])
        self.assertIsNone(coach["steps"][0]["audio_url"])

    def test_malformed_model_text_is_not_a_cue(self):
        self.assertIsNone(coach_from_model("hold your hips up", [(0, 1), (2, 3)], "en"))

    def test_unknown_vision_label_stays_selected(self):
        self.assertEqual(
            exercise_source('{"exercise":"squat","confident":true}', {"high_plank"}),
            "selected",
        )
        self.assertEqual(
            exercise_source('{"exercise":"high_plank","confident":true}', {"high_plank"}),
            "vision",
        )
        self.assertEqual(
            exercise_source('{"exercise":"high_plank","confident":false}', {"high_plank"}),
            "selected",
        )

    def test_fallback_model_is_used_only_after_an_unsure_label(self):
        unsure = '{"exercise":"high_plank","confident":false}'
        sure = '{"exercise":"high_plank","confident":true}'
        self.assertEqual(
            accepting_model(
                [("MiniCPM-V-4.7-1B", unsure), ("DeepSeek-V4-Flash-Vision-Exp", sure)],
                {"high_plank"},
            ),
            "DeepSeek-V4-Flash-Vision-Exp",
        )
        self.assertEqual(
            accepting_model([("MiniCPM-V-4.7-1B", sure)], {"high_plank"}),
            "MiniCPM-V-4.7-1B",
        )
        self.assertIsNone(
            accepting_model(
                [
                    ("MiniCPM-V-4.7-1B", unsure),
                    ("DeepSeek-V4-Flash-Vision-Exp", unsure),
                ],
                {"high_plank"},
            )
        )
        self.assertIsNone(
            accepting_model([("Gemma-4-31B-IT", sure)], {"high_plank"})
        )


if __name__ == "__main__":
    unittest.main()
