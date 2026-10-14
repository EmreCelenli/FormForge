# Dev B — playback workflow

You own the interface that plays one side-view high-plank clip and draws the analysis on it. Dev A owns the pipeline in `docs/dev_a.md`. Read `AGENTS.md` and `formforge-project-idea.md` before editing. This file does not override `AGENTS.md`.

Do not create `docs/PLAN_B_FRONTEND.md`. This file is the frontend workflow.

## Ownership

You own:

- `frontend/**`
- `NEXT_PUBLIC_API_URL` in `.env.example`
- `frontend/Dockerfile` when that later task starts

You do not edit `backend/**` or `mock/sample_result.json`. You do not change the contract in `AGENTS.md` without human approval. You do not put the Token Factory key or the Gradium key in the frontend. You do not invent keypoints, angles, errors, cue text, or audio.

## Order of work

Do the first incomplete step. POC steps come before the later project steps. You can scaffold the shell in step 1 before Dev A finishes the mock. Do not build the overlay against a `Result` shape you made up.

### POC

1. **Shell.** The Next.js screen already has **Your video**, **Corrected form**, an empty meter, and **No cue yet.** Keep that empty state until `mock/sample_result.json` exists. The visible tagline is **Form meets precision.**
2. **Types.** Keep `frontend/src/types/contract.ts` identical to the `Result` contract in `AGENTS.md`, including `exercise`, `coach.steps`, and the timing fields. Do not add fields.
3. **Labeled example.** After Dev A publishes `mock/sample_result.json`, render it. Show a visible label that this is an example, not a live analysis.
4. **Same speed.** Play the user's clip and the corrected form from one clock. The frame index selects both panels. Normalized coordinates use the top-left origin from `AGENTS.md`. Use one transform for video and ghost, including letterboxing.
5. **Ghost.** On **Corrected form**, draw `keypoints_corrected` as a semi-transparent ghost avatar in the same camera view. Place it so the ghost hip sits on the user's hip for that frame. This is the user's movement with the fault corrected. Do not replace it with a textbook pose, a still image, or a skeleton-and-warning with no corrected motion. The user's panel may label the one fault, such as sagging hips.
6. **Meter.** As the frame changes, show the user's angle and the corrected angle against the provisional `target_range`. Zero hip offset is a straight line and displays as 180°. Say that the band is provisional. Positive offset is sag. Negative offset is pike. Do not show a rep count.
7. **Error.** Show `hip_misalignment` for its inclusive frame span and its severity. Severity is an engineering label, not a medical risk.
8. **Exercise label.** Show `exercise.label`. When `source` is `vision`, say the movement was recognized. When `source` is `selected`, say the user selected it. Do not hide an unsure label behind a guessed name.
9. **Job states.** Poll `GET /jobs/{job_id}` about once per second while status is `queued` or `running`. Handle `done`, `failed`, and `low_confidence`.
10. **Low confidence.** On `low_confidence`, show a re-record prompt. Do not present the measurements as reliable.
11. **Pain.** When the safety handover is set, show `safety.message`. Do not offer a corrective exercise or treatment advice.
12. **Cue lines.** When `coach` is present, show `summary` and each `steps` line. Highlight the line whose frame span contains the current frame. When `coach` is `null`, show **Cue unavailable.** On the empty screen, before any result exists, keep **No cue yet.** Do not write a substitute and attribute it to Gemma.
13. **Voice.** When the current step has an `audio_url`, play that Gradium clip as the video enters its frames. Do not overlap lines. If `audio_url` is `null`, the text still shows. Do not call Gradium from the browser.

### After the POC

14. Upload through `POST /analyze` with `video`, `lang`, and `pain_reported`.
15. Delete through `DELETE /jobs/{job_id}`, and show success only on HTTP 204.
16. A second language after a human reviews the translation and a Gradium voice for that language has been heard.
17. When Dev A adds a second exercise, play it with the same panels, meter, ghost, and cue timing. Do not add a separate screen per movement.
18. The frontend service in `docker-compose.yml`. Do not claim it starts unless you ran it.

## Handoff from Dev A

Wait on Dev A only for these:

- `mock/sample_result.json` before treating any analysis as renderable data
- a real job endpoint before replacing the labeled example with a live result

You do not wait on Gemma, Gradium, or the vision label to finish the ghost and the meter. Those render from keypoints and `hip_offset` even when `coach` is `null` and `audio_url` is `null`.

If the payload does not match the contract, stop and ask for a contract change through the human. Do not patch the UI to accept a private shape.

## Stop and report

Stop the dependent step, and keep going on independent steps, when you need:

- the mock file or a live `Result` from Dev A
- approved safety wording before calling the pain message final (H5)
- a licensed clip before shipping a sample video in `frontend/public` (H3)
- a reviewed translation before adding a second language (H5)

Report commands you actually ran. If a command did not run, say **not run** or **blocked** and why. A page that renders the labeled example is not a live analysis.
