import { test } from "node:test";
import assert from "node:assert/strict";

import { describeCloudError } from "./cloud-error";
import { AppError } from "./errors";
import { LocalEmptyError, NotSignedInError } from "./backup/cloud";

test("not-signed-in is its own kind, not a generic failure", () => {
  assert.equal(describeCloudError(new NotSignedInError()).kind, "not_signed_in");
});

test("local-empty is its own kind so the UI can offer a pull instead", () => {
  assert.equal(describeCloudError(new LocalEmptyError()).kind, "local_empty");
});

test("413 (save_invalid from pushToCloud) reads as too_large, not 'invalid save'", () => {
  // The whole reason this module exists: the shared catalog would render
  // save_invalid as "not SQLite", which is false for an oversized push.
  assert.equal(describeCloudError(new AppError("save_invalid")).kind, "too_large");
});

test("save_load_failed (404 / 503) is 'unavailable' — the local save is fine", () => {
  assert.equal(
    describeCloudError(new AppError("save_load_failed")).kind,
    "unavailable"
  );
});

test("version mismatch carries the file/app versions through for interpolation", () => {
  const info = describeCloudError(
    new AppError("save_version_mismatch", { file: 7, app: 8 })
  );
  assert.equal(info.kind, "version_mismatch");
  assert.deepEqual(info.params, { file: 7, app: 8 });
});

test("unrelated AppError codes and plain throws fall to unknown", () => {
  assert.equal(describeCloudError(new AppError("profile_missing")).kind, "unknown");
  assert.equal(describeCloudError(new Error("boom")).kind, "unknown");
  assert.equal(describeCloudError(null).kind, "unknown");
  assert.equal(describeCloudError("not signed in").kind, "unknown");
});
