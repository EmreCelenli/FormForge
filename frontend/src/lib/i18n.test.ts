import assert from "node:assert/strict";
import test from "node:test";
import { COPY, LANGUAGES } from "./i18n.ts";

test("the language list uses ISO 639-1 codes", () => {
  assert.deepEqual(
    LANGUAGES.map((item) => item.id),
    ["en", "fr", "es", "de", "pt"],
  );
  assert.deepEqual(
    LANGUAGES.map((item) => item.label),
    ["en", "fr", "es", "de", "pt"],
  );
});

test("every language has the same page lines", () => {
  const keys = Object.keys(COPY.en).sort();
  for (const item of LANGUAGES) {
    assert.deepEqual(Object.keys(COPY[item.id]).sort(), keys);
  }
  assert.equal(COPY.en.motto, "Form meets precision.");
  assert.equal(COPY.de.highPlank.length > 0, true);
});
