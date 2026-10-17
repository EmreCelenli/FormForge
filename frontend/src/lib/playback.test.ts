import assert from "node:assert/strict";
import test from "node:test";
import {
  activeStepIndex,
  alignCorrectedToUserHip,
  alignmentDegrees,
  contentRect,
  holdLineGap,
  outsideBandPercent,
  frameIndex,
  faultCloseness,
  inTargetRange,
  normalizedToView,
  lowEndJointNote,
  visibleSideEdges,
  offsetLabel,
} from "./playback.ts";

test("frame index follows one clock and stays inside the clip", () => {
  assert.equal(frameIndex(0, 10, 5), 0);
  assert.equal(frameIndex(0.19, 10, 5), 1);
  assert.equal(frameIndex(9, 10, 5), 4);
});

test("letterbox keeps the video aspect inside a wider box", () => {
  const rect = contentRect(200, 100, 100, 100);
  assert.equal(rect.y, 0);
  assert.equal(rect.height, 100);
  assert.equal(rect.width, 100);
  assert.equal(rect.x, 50);
});

test("normalized origin is the top left", () => {
  const point = normalizedToView({ x: 0, y: 0 }, { x: 10, y: 20, width: 100, height: 50 });
  assert.deepEqual(point, { x: 10, y: 20 });
});

test("line gap reports the peak of the hold and the corrected value there", () => {
  assert.deepEqual(holdLineGap([0.1, 0.42, 0.2], [0, 0.01, 0]), { peak: 0.42, corrected: 0.01 });
  assert.equal(outsideBandPercent([0, 8, -6], [-5, 5]), (200 / 3));
});

test("the measured line turns green as the hip enters the band", () => {
  const range: [number, number] = [-5, 5];
  assert.equal(faultCloseness(0, range), 1);
  assert.equal(faultCloseness(-5, range), 1);
  assert.equal(faultCloseness(40, range), 0);
  assert.equal(faultCloseness(-53, range), 0);
  assert.ok(faultCloseness(-16, range) > 0.6);
  assert.ok(faultCloseness(-16, range) > faultCloseness(-40, range));
});

test("zero hip offset displays as a straight 180 degrees", () => {
  assert.equal(alignmentDegrees(0), 180);
  assert.equal(alignmentDegrees(8), 172);
  assert.equal(alignmentDegrees(-8), 172);
  assert.equal(offsetLabel(8), "sag");
  assert.equal(offsetLabel(-3), "pike");
  assert.equal(inTargetRange(2, [-5, 5]), true);
  assert.equal(inTargetRange(9, [-5, 5]), false);
});

test("ghost hip is moved onto the user's hip", () => {
  const names = ["left_hip", "left_shoulder"];
  const aligned = alignCorrectedToUserHip(
    names,
    [
      [0.4, 0.6, 0.9],
      [0.4, 0.2, 0.9],
    ],
    [
      [0.5, 0.7],
      [0.5, 0.3],
    ],
  );
  assert.deepEqual(aligned[0], { x: 0.4, y: 0.6 });
  assert.deepEqual(aligned[1], { x: 0.4, y: 0.2 });
});

test("a faint wrist is named and a confident one is not", () => {
  const names = ["left_wrist", "right_wrist", "left_ankle", "right_ankle"];
  const note = lowEndJointNote(names, [
    [0.1, 0.2, 0.2],
    [0.3, 0.4, 0.9],
    [0.5, 0.6, 0.8],
    [0.7, 0.8, 0.9],
  ]);
  assert.equal(note, "Low-confidence left wrist. That point is not used for the corrected pose.");
  assert.equal(
    lowEndJointNote(names, [
      [0.1, 0.2, 0.9],
      [0.3, 0.4, 0.9],
      [0.5, 0.6, 0.9],
      [0.7, 0.8, 0.9],
    ]),
    null,
  );
});

test("the ghost uses the side whose shoulder, hip, and ankle are clearer", () => {
  const names = ["left_shoulder", "left_elbow", "left_wrist", "left_hip", "left_knee", "left_ankle", "right_shoulder", "right_elbow", "right_wrist", "right_hip", "right_knee", "right_ankle"];
  const frame = names.map(() => [0.5, 0.5, 0.2]);
  for (const name of ["right_shoulder", "right_hip", "right_ankle", "right_wrist"]) {
    frame[names.indexOf(name)] = [0.5, 0.5, 0.9];
  }
  const edges = visibleSideEdges(names, frame);
  assert.equal(edges.length, 5);
  assert.ok(edges.some(([a, b]) => names[a] === "right_elbow" && names[b] === "right_wrist"));
  assert.equal(edges.some(([a]) => names[a].startsWith("left_")), false);
});

test("the cue for the current frame is the only active step", () => {
  const steps = [
    { frames: [0, 2] as [number, number] },
    { frames: [3, 5] as [number, number] },
  ];
  assert.equal(activeStepIndex(steps, 2), 0);
  assert.equal(activeStepIndex(steps, 4), 1);
  assert.equal(activeStepIndex(steps, 9), -1);
});
