# Dev A — analysis workflow

You own the pipeline that turns a clip into a `Result`. Dev B owns playback in `docs/dev_b.md`. Read `AGENTS.md` and `formforge-project-idea.md` before editing. This file does not override `AGENTS.md`.

Do not create `docs/PLAN_A_BACKEND.md`. Do not start a later step while an earlier demo step is unfinished.

## Ownership

You own:

- `backend/**`
- `mock/sample_result.json`
- backend variables in `.env.example`
- `docker-compose.yml` and `backend/Dockerfile` when that later task starts
- `docs/LICENSES.md` entries for backend assets you add

You do not edit `frontend/**`. You do not change the contract in `AGENTS.md` on your own. You do not put Token Factory or Gradium keys in the frontend. You do not call a coach model other than `Gemma-4-31B-IT`, a vision model other than `MiniCPM-V-4.7-1B`, or a speech service other than Gradium TTS. You do not use Gradium speech-to-text. You do not use ROCm.

## Demo path

The demo clip is one side-view high plank. Do these in order.

1. **Schema.** Implement `backend/app/schemas.py` as the Pydantic form of the `Result` contract. Test that a valid plank result is accepted and that mismatched frame lengths, wrong keypoint counts, unknown error types, and a coach step whose frames fall outside the clip are rejected.
2. **Example result.** Write `mock/sample_result.json` so it validates. Label it as an example. Include `exercise` for high plank with `source: "selected"`, two or three `coach.steps` with frame spans, and `audio_url: null` until speech exists. Tell Dev B when this file exists.
3. **Geometry tests first.** Before the math, test:
   - hip offset sign: colinear is 0, sag is positive, pike is negative
   - aspect ratio: normalized x/y become a consistent spatial unit before the angle
   - visible side only: no average of left and right, no invented spine
   - `hip_misalignment` only on an evaluable inclusive frame span
   - correction: the ghost hip stays on the user's hip, limb lengths stay constant, frame timing stays the same, and the body rotates around the hip until the angle is inside the target range
   - a corrected angle outside the target range is not shown as a successful ghost
   - low confidence does not emit a guessed correction
4. **Implement the tested math** in `angles.py`, `errors.py`, `planner.py`, and `smoothing.py`. Put the plank target band in `backend/app/config/exercises/high_plank.json` with a written rationale and the label provisional. Severity labels are engineering labels, not medical risk.
5. **Pose.** Run MediaPipe on CPU on the plank clip. Map native landmarks to the documented COCO-17 order and test that mapping. Set `timings.device` to the device actually used. Set `vision_ms` to `0` until the label step exists, and say that it was skipped.
6. **One-clip result.** Produce a real `Result` for that clip: keypoints, `hip_offset`, one `hip_misalignment` when the check is evaluable, and corrected keypoints. Set `exercise.source` to `selected` and `exercise.id` to `high_plank`. A local runner is enough. Full upload validation comes later.
7. **Safety paths.** `low_confidence` returns that status and no guessed correction. `pain_reported` sets the safety handover and does not prescribe an exercise. Until H5 approval, keep the message neutral and mark the copy as unapproved.
8. **Gemma.** Call `Gemma-4-31B-IT` from `coach.py`, server-side only. Send the validated finding, the measured frame spans, and `lang`. Do not send frames. Require `summary` and two or three short step lines. You assign the frame spans. Gemma does not choose them. On failure, set `coach` to `null`. Do not invent cue text. If the key is missing, report H1 and H4 and continue with the geometric result.
9. **Gradium.** After the step text exists, POST each line to `GRADIUM_TTS_URL` with `GRADIUM_API_KEY` in `x-api-key`, the heard `GRADIUM_VOICE_ID`, and `output_format` `wav`. Store the audio where Dev B can play it, and set `audio_url`. On failure, keep the text and set `audio_url` to `null`. Do not send the video. Do not let Gradium rewrite the line. Skip speech-to-text.

## After the plank demo

Start these only when the demo path produces a real plank `Result` and Dev B can play it.

10. **Exercise config.** Keep the plank check as data: id, required joints, angle definition, provisional target range, and error label. Loading that file must reproduce the demo result. MediaPipe stays the same pose model.
11. **Vision label.** Send a few frames to `MiniCPM-V-4.7-1B`. Accept only a configured exercise id. If it returns `high_plank` confidently, set `exercise.source` to `vision` and load that config. If it is unsure or names an unknown movement, set the job so the user must choose, and do not run a guessed check. The demo clip must still be runnable with `high_plank` selected by hand.
12. **Second movement.** Add one only after a human names it and supplies a clip. New joints, angle, target range, and error label go in a new config file. If the public `angles` object cannot represent that check, stop and ask for a contract change. Do not retune MediaPipe. Do not claim every movement.
13. **Product shell.** `POST /analyze` with file type, size, and corrupt-video checks, plus `lang` and `pain_reported`. `GET /jobs/{job_id}` for polling. `DELETE /jobs/{job_id}` removes the stored video, artifacts, and job data this app controls.
14. **Run and measure.** `docker-compose.yml` for the documented configuration. `backend/scripts/eval.py` only with human-supplied labels. If none exist, say **not measured yet**.

## Handoff to Dev B

- the contract, unchanged
- `mock/sample_result.json` once it validates
- a `GET /jobs/{job_id}` payload once a real or example job exists
- `coach: null` when Gemma did not succeed
- `audio_url: null` when Gradium did not succeed
- `exercise.source` so the screen can say whether the movement was recognized or selected

Dev B polls about once per second while status is `queued` or `running`.

## Stop and report

Stop the dependent step, and keep going on independent steps, when you need:

- Token Factory or Gradium credentials, or a heard voice id (H1, H4)
- approved safety wording (H5)
- a licensed demo clip (H3)
- a named second exercise and its clip (human scope decision)
- genuine evaluation labels (H2)

Report commands you actually ran. If a command did not run, say **not run** or **blocked** and why. A schema test is not a live pose run. A mock file is not a measured benchmark. A Token Factory usage row is evidence of that API call, not of ROCm.
