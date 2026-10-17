# FormForge — project idea

**Tagline:** See the correct motion clearly, in the same view as your own.

Scope, the measurement contract, and operating rules live in `AGENTS.md`. This file is the product idea. If the two disagree about a measurement or an API field, follow `AGENTS.md`.

## The idea

A user uploads a short video of themselves doing an exercise. `MiniCPM-V-4.7-1B` names the movement and selects that movement's check. MediaPipe extracts the joint positions. A fix planner computes a corrected version of the same movement. The user then sees the correct motion as a semi-transparent ghost avatar overlaid on their twin video, aligned at the hips, with a live angle meter showing their value against the target range. `Gemma-4-31B-IT` writes two or three short cues in the user's language, and Gradium speaks each cue as the clip reaches its frames. The goal is understanding: the user should grasp the correct motion in their own mind after one viewing.

Most form-checking apps draw a skeleton and show text warnings. FormForge shows the corrected movement itself, in the same pose, speed, and camera view as the user's own rep.

## What one viewing shows

The reference screen is two panels that play together, plus one coach line:

- **Your video.** The user's clip. The one detected fault can be labeled on this side. For the first demo that label is sagging hips.
- **Corrected form.** The same camera view and the same speed. A semi-transparent ghost avatar of the corrected movement, aligned at the user's hips. This is the user's rep with the fault taken out, not a textbook pose and not a different exercise.
- **Angle meter.** Updates with the frame. It shows the user's angle and the corrected angle against the provisional target range. A straight shoulder–hip–ankle line is 180°.
- **Exercise.** The recognized movement, or the movement the user selected when recognition is unsure.
- **Coach.** Two or three short lines, in the language the user selected, spoken by Gradium in time with the frames. The lines describe the finding the planner already computed. They do not invent the error or the corrected pose. The text stays on screen if the voice fails.

After one play-through, the user should be able to picture the correct motion. A still frame with a warning is not the product.

## First demo

One side-view high plank of one adult. One error: `hip_misalignment`, the hip leaving the straight shoulder–hip–ankle line (sag or pike). The corrected ghost brings that line into the target range while the hip stays the anchor and the original timing stays.

The same pose model and the same ghost can take a later movement. That movement is a new check in config: joints, angle, target range, and error label. It is not a new MediaPipe mode. The demo does not claim every exercise. A second check waits until a human names it and supplies a clip. There is no rep counter. The plank clip is still a movement through time, played at the user's speed.

## How the correction is made

MediaPipe runs on CPU and produces the landmarks. Deterministic code, not the coach model, does the rest:

1. Measure the visible-side shoulder, hip, and ankle. Do not invent a spine. Do not average left and right into one.
2. Compare the user's angle with the provisional target range.
3. Plan the fix around the hips. Limb lengths stay constant. The hip of the ghost stays on the user's hip. The rest of the body rotates into the target alignment. The frame timing does not change.
4. Reject the correction if the corrected angle is not inside the target range.
5. Ask `Gemma-4-31B-IT` for a short summary and two or three cue lines in the user's language. Send the structured finding and the measured frame spans, not the video. Gemma does not choose the frames.
6. Send each finished line to Gradium text-to-speech. Gradium does not see the video and does not rewrite the line. If speech fails, the text remains.

`MiniCPM-V-4.7-1B` may label the clip as high plank before the check runs. If it is unsure, `DeepSeek-V4-Flash-Vision-Exp` is asked the same question. If both are unsure, the user selects high plank. Neither model measures the hip. The AMD surface is Token Factory only, at `notebooks.amd.com/tokenfactory`. ROCm is not part of this build.

The target range is provisional configuration. It is not a clinical standard. Low confidence asks for a re-record and does not guess a correction. Reported pain shows a neutral handover and no exercise prescription.

## What this is not

- A skeleton drawn on the user plus a text warning, with no corrected movement.
- A generated photorealistic twin of the person. The ghost is driven by the corrected keypoints.
- A claim that pose ran on an AMD GPU. Pose is MediaPipe. Gemma and the vision label, when they succeed, are Token Factory calls. Gradium is speech only. None of these is ROCm.
- A measured learning benefit. "The user understands after one viewing" is the product goal. It stays **not measured yet** until a real test says otherwise.

Upload, deletion, Docker, and evaluation on genuine labels follow the first clip that plays this way. They are in the definition of done in `AGENTS.md`.

## Two developers

| | Dev A | Dev B |
|---|---|---|
| File | `docs/dev_a.md` | `docs/dev_b.md` |
| Owns | MediaPipe, the exercise config, the vision label, the hip-anchored fix, Gemma, Gradium | Your video and corrected form, the ghost, the live meter, the cue lines, and their audio |
| Hands off | A schema-valid `mock/sample_result.json`, then a real `Result` for the clip | A screen that renders that `Result` without inventing a pose or a cue |

Dev B does not call Token Factory or Gradium from the browser. Neither developer changes the contract without human approval, and neither invents benchmark numbers.
