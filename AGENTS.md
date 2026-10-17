# AGENTS.md — FormForge

Shared project context and operating rules for all coding agents. Read this file before changing code.

This file governs scope, the POC contract, and operating rules. `formforge-project-idea.md` is the product context. `docs/dev_a.md` and `docs/dev_b.md` divide the workflow between two developers. Those files add implementation detail and must not contradict this file. Do not create `docs/PLAN_A_BACKEND.md` or `docs/PLAN_B_FRONTEND.md`. Inspect the repository before assuming that any application, script, model, or service exists. Do not assume a listed file already exists.

## 1. Project goal

A user uploads a short video of an exercise. A vision model names the movement and selects that movement's check. MediaPipe extracts joint positions. Deterministic code finds one form error and plans a corrected version of the same movement. The user sees that motion as a semi-transparent ghost avatar on their twin view, aligned at the hips, with a live angle meter of their value against the target range. Gemma writes a few short cues in the user's language, and Gradium speaks those cues as the clip reaches the matching frames. The goal is understanding: after one viewing, the user should be able to picture the correct motion.

The difference from a typical form check is the output. The product shows the corrected movement itself, in the same pose, speed, and camera view as the user's own rep. A skeleton plus a text warning is not the product.

The hackathon POC is **one prepared side-view high-plank clip of one adult**. The one error is the hip leaving the straight shoulder–hip–ankle line (sag or pike). The screen plays two panels together: the user's video, and the corrected form as the ghost, hip-aligned, at the same speed. A straight line reads as 180° on the meter.

The hackathon demo is that one plank clip. The pipeline is built so a later movement is another check in config, not a new pose model. Forearm plank, push-up, and squat are not in the demo until a human names one and supplies a clip. Live camera, PostgreSQL, a photorealistic generated twin, and ROCm are out. The organizers provided Token Factory only: sign in at `notebooks.amd.com/tokenfactory` for the API key, manual, catalogue, and usage. There is no GPU notebook and no credit account in that instruction. The ghost is drawn from the corrected keypoints. It is not a generated video of the person.

### Product principles

- Evidence before claims: never invent accuracy, latency, cost, compatibility, or benchmark results.
- Uncertainty before guessing: if video or pose confidence is insufficient, ask the user to re-record.
- Geometry before generation: deterministic code, not an LLM, determines the angle, the error, and the corrected movement.
- Coaching is explanatory: Gemma may write the validated fix in the user's language. Gradium may speak those words. Neither may invent measurements or alter the correction.
- Privacy by design: videos and results are private, and users can delete them when that project task is implemented.
- Safe language: no diagnosis, injury identification, treatment advice, or claims that a movement is medically safe.
- Honest fallbacks: saved examples and mock results must be clearly identified as examples, never as live analysis.

## 2. Compute and model constraints

The project must not assume that a dedicated AMD GPU instance is available.

- **Pose backend:** MediaPipe, using a supported local runtime. CPU execution is the baseline. The same pose model runs for every exercise. A vision label does not switch MediaPipe into a plank mode or a squat mode.
- **Exercise label:** `MiniCPM-V-4.7-1B` on Token Factory is asked first. It sees a few frames and returns a movement name. That name selects a versioned check config. It does not return joints, angles, or a corrected pose. If that label is unsure, `DeepSeek-V4-Flash-Vision-Exp` is asked the same question. If either model returns a confident configured label, `exercise.source` is `vision` and `exercise.model` is that catalogue id. If both are unsure or name no config, ask the user which exercise it is. DeepSeek does not replace MiniCPM, and it does not measure joints or write cues.
- **Coach model:** `Gemma-4-31B-IT` on Token Factory. It receives the validated finding, the frame spans, and the user's language. It returns a short summary and two or three short cue lines. It does not see the video.
- **Speech:** Gradium text-to-speech, which is allowed outside the Token Factory catalogue. It speaks the finished cue lines. It does not see the video, choose the error, or rewrite the words. One POST per line to `https://api.gradium.ai/api/post/speech/tts` with the key in the `x-api-key` header. Pick `voice_id` from Gradium's voice library for the requested language. The sample voice in Gradium's docs is not the shipped voice until it has been heard in that language.
- **Local deterministic processing:** the selected check's angle, error decision, confidence, and hip-anchored correction run in Python.
- **ROCm:** out of scope. Do not claim a local AMD GPU run.

A hosted Token Factory call is not evidence that FormForge runs pose estimation on an AMD GPU. `timings.device` reports the device actually used for the relevant computation.

### Configuration

Use environment variables rather than hard-coding provider settings. Keep `.env.example` safe and documented. Do not switch the coach or the vision label to another catalogue model. Gradium is the only speech service.

```dotenv
# Backend
MOCK=0
POSE_BACKEND=mediapipe
DATA_DIR=./data
MAX_UPLOAD_MB=100
TOKEN_FACTORY_BASE_URL=
TOKEN_FACTORY_API_KEY=
TOKEN_FACTORY_MODEL_ID=Gemma-4-31B-IT
TOKEN_FACTORY_VISION_MODEL_ID=MiniCPM-V-4.7-1B
TOKEN_FACTORY_VISION_FALLBACK_MODEL_ID=DeepSeek-V4-Flash-Vision-Exp
GRADIUM_API_KEY=
GRADIUM_VOICE_ID=
GRADIUM_VOICE_ID_EN=
GRADIUM_VOICE_ID_FR=
GRADIUM_VOICE_ID_ES=
GRADIUM_VOICE_ID_DE=
GRADIUM_VOICE_ID_PT=
GRADIUM_TTS_URL=https://api.gradium.ai/api/post/speech/tts

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080
```

The Token Factory base URL and API key come from the console after sign-in. The Gradium key stays server-side. Do not commit keys. A filled-in model name is not a claim that a live call succeeded. Leave each `GRADIUM_VOICE_ID_EN`, `_FR`, `_ES`, `_DE`, and `_PT` empty until a library voice for that language has been heard. The suffixes are the ISO 639-1 codes. `GRADIUM_VOICE_ID` is the English voice when `GRADIUM_VOICE_ID_EN` is empty.

The catalogue also lists DeepSeek-V4.1-Flash, DeepSeek-V4-Flash, DeepSeek-V4-Flash-Vision-Exp, GLM-5.3-Flash, MiMo-V2.6-Flash, MinerU2.5-Pro, MiniCPM5-2B, MiniCPM-V-4.7-35B-A3B, Qwen3.8-27B, and Qwen3.8-Flash-Next. Do not use them for coaching or as a replacement for `MiniCPM-V-4.7-1B`. `DeepSeek-V4-Flash-Vision-Exp` may answer the exercise-label question only after MiniCPM is not confident. `MiniCPM-V-4.7-35B-A3B` does not replace the 1B label model. MinerU2.5-Pro is a document model and has no job here. Gradium speech-to-text is not used.

If Token Factory is not yet verified, keep coaching behind an interface and report the blocker. Do not pretend a live call succeeded.

### Hardware and provider failure

If MediaPipe, Token Factory, or Gradium fails:

1. Preserve the exact error and relevant environment or version information. Do not log secrets.
2. Do not silently change device, provider, model family, or execution mode.
3. Report what was attempted and what remains unverified.
4. Continue independent work that does not depend on the failed step.

If Gemma fails, set `coach` to `null`. Do not invent cue text. If Gradium fails, keep the written steps and set each `audio_url` to `null`. If the vision label is unsure, ask which exercise it is and continue with the selected config. CPU MediaPipe remains the pose baseline.

## 3. Scope and supported error

Supported error label:

- `hip_misalignment` — the hip leaves the shoulder–ankle line (sag or pike) on an evaluable span of frames.

There is no rep counter for plank. Do not report repetition counts.

The plank check is the first entry in versioned exercise config. A later movement adds its own joints, angle, target range, and error label. It uses the same MediaPipe pose model. Do not claim the system covers every movement until that second check has run on a real clip.

COCO-17 does not provide a spine landmark. Do not infer a spine. Published angles use only shoulder, hip, and ankle.

The target band lives in version-controlled configuration and must have a documented rationale. Label it provisional until a human approves it. Do not present it as universally correct or clinically authoritative.

## 4. Repository layout

```text
formforge/
  AGENTS.md
  formforge-project-idea.md
  docs/
    dev_a.md                  # Dev A analysis workflow
    dev_b.md                  # Dev B playback workflow
    LICENSES.md
  mock/
    sample_result.json
  backend/
    app/
      main.py
      schemas.py
      jobs.py
      pose.py
      smoothing.py
      angles.py
      errors.py
      planner.py
      coach.py
      config/target_ranges.json
    tests/
    scripts/eval.py
    Dockerfile
  frontend/
    src/
      app/
      components/
      lib/
      types/contract.ts
      i18n/
    public/
      sample-video.*
    Dockerfile
  data/
    eval/
      manifest.csv
      clips/                  # local/private data; do not commit personal videos
  docker-compose.yml
  .env.example
```

The repository may differ from this layout. Inspect the actual files before creating, renaming, or moving anything.

### Developer documents

Read these for the high-plank POC:

1. `formforge-project-idea.md` — product context.
2. `docs/dev_a.md` — Dev A, the analysis pipeline.
3. `docs/dev_b.md` — Dev B, the playback UI.

Do not create `docs/PLAN_A_BACKEND.md` or `docs/PLAN_B_FRONTEND.md`. A missing application file is not permission to add a second exercise or a second coaching provider. Workflow notes that conflict with this file are wrong; follow this file and record the discrepancy.

## 5. API contract — single source of truth

The following contract is shared by the backend, frontend, and mock example. Do not change it without explicit human approval.

`backend/app/schemas.py` (Pydantic), `frontend/src/types/contract.ts`, and `mock/sample_result.json` must agree. The mock JSON must validate against the backend schema.

```ts
type JobStatus =
  | "queued"
  | "running"
  | "done"
  | "failed"
  | "low_confidence";

interface AngleSeries {
  user: number[];
  corrected: number[];
  target_range: [number, number];
}

interface Result {
  job_id: string;
  status: JobStatus;
  progress: number; // 0..1
  video: {
    fps: number;
    frames: number;
    width: number;
    height: number;
  };
  keypoint_names: string[]; // exactly 17 COCO keypoint names, in documented order
  keypoints_user: number[][][]; // [frames][17][3]: normalized x, y, confidence
  keypoints_corrected: number[][][]; // [frames][17][2]: normalized x, y
  angles: {
    hip_offset: AngleSeries; // signed degrees from the shoulder–ankle line
    line_gap: AngleSeries; // hip's perpendicular distance divided by the shoulder–ankle length; 0 is on the line
  };
  errors: {
    type: "hip_misalignment";
    frames: [number, number]; // inclusive frame indices
    severity: "minor" | "moderate" | "major";
  }[];
  exercise: {
    id: string;
    label: string;
    source: "vision" | "selected";
    model: string | null; // catalogue id that confirmed the label, or null when selected
  };
  confidence: number; // 0..1 overall
  coach: {
    lang: string;
    summary: string;
    cue: string;
    steps: {
      text: string;
      frames: [number, number]; // inclusive
      audio_url: string | null;
    }[];
  } | null;
  safety: {
    handover: boolean;
    message: string | null;
  };
  timings: {
    pose_ms: number;
    vision_ms: number;
    analysis_ms: number;
    coach_ms: number;
    speech_ms: number;
    device: string;
  };
  error_message?: string; // only when status = "failed"
}
```

### Coordinate, angle, and correction conventions

- Image coordinates are normalized to `[0, 1]`, origin at the top-left, x increases rightward, y increases downward.
- `keypoint_names` uses the COCO-17 ordering defined by the implementation and tests.
- MediaPipe may use its native landmarks internally. The public keypoints are the documented COCO-17 subset. Record the mapping and test it.
- `keypoints_user` stores x, y, and confidence for each frame and keypoint.
- `keypoints_corrected` stores x and y only, in the same normalized image space.
- Use the visible side. If only one side's shoulder, hip, and ankle are usable, use that side. Do not average left and right into a spine.
- Convert normalized x/y into a consistent spatial unit before measuring the angle so image aspect ratio does not distort it.
- **Hip offset** is the signed angle, in degrees, of the hip relative to the shoulder–ankle segment. Zero means shoulder, hip, and ankle are colinear, which the meter shows as 180°. Positive means the hip is on the ground side of that segment (sag). Negative means the opposite side (pike).
- The live meter shows the user's value and the corrected value against `target_range` for the frame that is playing.
- The correction is the same movement. It keeps the original frame timing and the limb lengths. It anchors the ghost at the user's hip and rotates the body around that hip until the shoulder–hip–ankle angle is inside the target range. It does not slide the hip onto the line while freezing the shoulder and ankle. It does not invent a spine. It does not replace the rep with a different pose or a still frame.
- Show the corrected ghost only when its angle is inside the target range. Otherwise report the check as not corrected.
- All per-frame arrays must align with `video.frames`. Validate dimensions and reject malformed internal results rather than emitting inconsistent data.
- `target_range` is the provisional band from `backend/app/config/target_ranges.json`. Severity labels are provisional engineering labels, not medical risk scores.
- `exercise.source` is `vision` when `MiniCPM-V-4.7-1B`, or `DeepSeek-V4-Flash-Vision-Exp` after MiniCPM is not confident, returns a confident configured label. `exercise.model` is that catalogue id. Source is `selected` and `model` is `null` when the user chose the exercise.
- `coach.steps` has two or three short lines. The frame spans come from the measured error, not from Gemma. `cue` is the same lines joined for a single text fallback. `audio_url` is set only after Gradium returns audio for that line.
- Timing fields are measured durations. If a stage is skipped, report `0` and do not describe it as measured work. A failed or skipped model call is not a success.
- `device` reports the device actually used, not the device hoped for.

### Endpoints

- `POST /analyze` accepts multipart fields `video` (file), `lang` (e.g. `en`), and `pain_reported` (boolean); returns `{ "job_id": "..." }`.
- `GET /jobs/{job_id}` returns a `Result`. The client polls about once per second while status is `queued` or `running`.
- `DELETE /jobs/{job_id}` deletes the uploaded video and associated results and returns HTTP 204 when successful.

The first implementation slice is the prepared plank clip through pose, hip offset, correction, ghost overlay, Gemma's cue steps, and Gradium audio for those steps. The vision label follows that slice and selects the plank config on the demo clip. Upload, deletion, and Docker follow. When those endpoints are implemented, document validation for file type, file size, empty or corrupt videos, and malformed inputs. Do not claim that view classification exists unless it is implemented and tested. The exercise label is not a view classifier.

Deletion, once implemented, must remove the stored source video, generated artifacts, and associated job data to the extent controlled by this application. Document any unavoidable limitations of temporary storage or logs. Do not log video contents, credentials, or unnecessary personal data.

### Contract change procedure

If a necessary change is discovered:

1. Stop before making a unilateral change.
2. Explain why the current contract is insufficient.
3. Propose the smallest compatible change and its effect on both agents.
4. Wait for human approval.
5. Update schemas, TypeScript types, mock data, tests, and documentation together.

## 6. Confidence, safety, and coaching

### Low-confidence behavior

Low confidence must produce `low_confidence`, not a guessed correction. The frontend must display a visible re-record prompt and must not present uncertain measurements as reliable.

Define and test the confidence policy. Consider per-frame landmark confidence, the proportion of usable frames, and whether the visible-side shoulder, hip, and ankle are visible. Do not invent a threshold and describe it as scientifically validated. Mark an initial threshold as provisional until evaluated.

### Pain and handover behavior

When `pain_reported` is true:

- Do not offer a corrective exercise prescription or treatment advice.
- Set the safety handover fields according to the approved safety wording.
- Display a neutral message encouraging the user to consult an appropriately qualified professional.
- Continue only with behavior explicitly approved by the human. When uncertain, choose the conservative path.

No feature may diagnose a condition, identify an injury, promise injury prevention, or assert medical safety. H5 (human safety review) is required before finalizing safety copy.

### Coach model boundary

`MiniCPM-V-4.7-1B` may name the exercise. If it is not confident, `DeepSeek-V4-Flash-Vision-Exp` may name it. `Gemma-4-31B-IT` receives only the validated structured finding, the measured frame spans, and the requested language. It must not calculate the offset, decide whether the error occurred, invent the target band, or produce corrected keypoints. Gradium receives only the finished step text.

- Gemma returns `summary` and two or three short `steps`. The lines are simple spoken corrections, in order.
- Request the user's chosen language. The demo may ship one language. A second language is later and needs human review.
- Validate provider output and handle timeouts, malformed output, unavailable service, and rate limits.
- Do not expose secrets in logs or error messages.
- Coaching text is done only after one real Gemma response has been verified. Speech is done only after one real Gradium response for those lines has been verified.
- If Gemma fails, return `coach: null`. If Gradium fails, keep the text and set `audio_url` to `null`. Do not fabricate either and attribute it to the service.
- Translation quality and all safety wording require human review before being represented as approved.

## 7. Evaluation and measurement

`backend/scripts/eval.py` is later project work. It must compute reported metrics from real, documented evaluation clips and a reproducible procedure. It does not block the first working clip.

- Ground truth is human-owned. Do not create fake ground-truth values, use guessed angles as labels, or treat synthetic or mock examples as real evaluation.
- Keep personal videos and sensitive evaluation data out of version control. The manifest must not expose unnecessary identifying information.
- Record the metric definition, evaluation-set size, model and runtime versions, device, and relevant configuration alongside any real results.
- If no real evaluation has been run, say **"not measured yet"**.
- Never hard-code benchmark numbers into the UI, README, slides, or code unless they are produced by a reproducible measurement and are clearly contextualized.
- Tests using synthetic points are useful for mathematical correctness. They do not establish real-world pose accuracy.

## 8. Licensing and privacy

- Project-authored code uses the MIT license, subject to repository licensing files.
- Record the source, license, attribution requirements, and any usage restrictions for fonts, sample videos, datasets, and other third-party assets in `docs/LICENSES.md` before adding them. A 3D avatar is out of scope for this POC.
- Do not commit API keys, access tokens, `.env` files containing secrets, personal videos, or third-party footage without explicit permission and an appropriate license.
- Use `.env.example` for variable names and safe placeholders only.
- Restrict upload size and file types, use safe generated filenames, and avoid trusting user-provided paths.
- Keep videos and results private. A job ID must not be treated as authorization by itself if the deployment requires user authentication.
- Do not claim production-grade security or compliance unless it has actually been implemented and assessed.

## 9. Agent ownership

### Dev A — `docs/dev_a.md`

Follow that workflow. Own FastAPI, Pydantic schemas, job lifecycle, video validation and decoding, MediaPipe integration, smoothing, hip-offset analysis, `hip_misalignment` detection, correction planning, Token Factory coaching, safety logic, deletion, backend tests, and the later evaluation script.

Keep `backend/app/schemas.py` aligned with the contract in this file. Do not change the contract unilaterally.

### Dev B — `docs/dev_b.md`

Follow that workflow. Own the Next.js UI, the side-by-side playback of the user's video and the corrected form, the hip-aligned ghost, the live angle meter, error presentation, coach text in the user's language, localization, privacy and deletion controls, accessible interactions, and frontend tests.

Use `frontend/src/types/contract.ts` as the typed mirror of the contract. Do not invent API fields or live analysis results.

### Shared responsibilities

- Both developers read this file, `formforge-project-idea.md`, their own workflow file, and the mock example before implementation.
- Coordinate contract changes through the human.
- Do not overwrite or revert the other developer's work.
- Keep changes small, reviewable, and testable.
- Record blockers explicitly rather than implementing assumptions.

## 10. Human-only tasks — stop and ask when blocked

These tasks cannot be completed or truthfully claimed by coding agents without human action or evidence.

- **H1 — Account and keys:** sign in at `notebooks.amd.com/tokenfactory` and redeem the API key. Confirm the catalogue ids for `Gemma-4-31B-IT` and `MiniCPM-V-4.7-1B`. Provide the Gradium API key and a heard `voice_id` for the demo language. Routine local MediaPipe checks are agent work. There is no ROCm instance to start.
- **H2 — Ground truth:** film or provide permitted test clips and supply genuine labels if evaluation is run. Do not invent labels. This does not block the POC clip.
- **H3 — Asset licensing:** approve sample-video and other third-party assets and verify their licenses before adding them.
- **H4 — Model verification:** confirm Gemma, the vision label model, and Gradium against their real request and response formats. One verified response from each is required before that stage is called done. Record Token Factory usage from the console. Do not claim ROCm.
- **H5 — Safety and translations:** a qualified human reviewer approves safety wording, and a native speaker verifies translations before they are called approved.
- **H6 — Competition rules:** a human reviews current hackathon rules and decides which services are permitted. Token Factory is the selected coaching provider unless the human says otherwise.

If a task depends on one of these and the required evidence is missing, state exactly what is missing and stop that dependent task. Continue with independent work.

## 11. Development workflow

For every task:

1. Read this file, `formforge-project-idea.md`, and `docs/dev_a.md` or `docs/dev_b.md` for the side you are implementing. Inspect the actual repository before editing.
2. Select the first task whose dependencies are complete. The POC acceptance list in section 12 comes before the rest of the project definition of done.
3. State the acceptance criteria in the PR description, in your own words.
4. Write tests first for hip-offset geometry, the error rule, the confidence policy, and the correction constraints.
5. Implement the smallest change that meets the criteria. Do not refactor unrelated code.
6. Run the task's specified verification commands. Report the commands and actual outcomes. Distinguish verified facts from assumptions.
7. Update documentation and `.env.example` when behavior or configuration changes.
8. Report any human-owned dependency or API blocker explicitly.
9. Never claim tests passed, an endpoint worked, a model loaded, or a benchmark was measured unless that action actually occurred.

If a command cannot run because dependencies, credentials, network access, or hardware are unavailable, report it as **not run** or **blocked**, with the reason. Do not substitute a mock test for a live integration test without labeling the difference.

## 12. POC acceptance and definition of done

### POC acceptance

The hackathon POC is accepted when these are demonstrated on the one side-view high-plank clip:

- The clip produces real keypoints, the `hip_offset` series, one `hip_misalignment` error when the check is evaluable, and corrected keypoints from deterministic code. The correction keeps the original timing, anchors at the user's hip, and keeps limb lengths.
- The UI plays the user's video and the corrected form together, at the same speed and in the same camera view. The ghost is a semi-transparent avatar aligned at the hips. The meter shows the user's value against the target range for the current frame.
- The exercise label is shown. On the demo clip it is high plank, from the vision model when that call is confident, or selected when it is not.
- Gemma's two or three cue lines are shown in order. When Gradium audio exists, each line plays as the video reaches its frames. If audio is missing, the text still shows. If Gemma fails, the cue area says the cue is unavailable.
- Low-confidence and pain-reported paths are tested and do not invent a correction or medical advice.
- Accuracy and benefit stay **not measured yet** unless a real run produced them.

### Project definition of done

The project is done when the POC acceptance items and all applicable items below are demonstrated, not merely described:

- A user can upload a clip and receive a real analysis.
- The user can delete the uploaded video and associated results.
- A second configured exercise works through the same pose model and a new check, or the limitation is clearly documented. Do not claim every movement.
- Coaching in a second language works through verified Gemma and a heard Gradium voice, or the limitation is clearly documented.
- `backend/scripts/eval.py` computes metrics from genuine evaluation data. Until then, say **not measured yet**.
- README and presentation claims include only measured results.
- The frontend and backend use this contract, and the mock result validates against it.
- `docker-compose up` starts the services in the documented configuration, with required credentials clearly explained.
- Required tests pass, and any skipped or blocked verification is disclosed.
- Third-party asset licensing is recorded in `docs/LICENSES.md`.
- Current hackathon rules and required human approvals have been checked before claiming compliance.

A successful local mock is not evidence of a live analysis or of AMD GPU execution. A verified Token Factory coaching call is evidence of that API call only.
