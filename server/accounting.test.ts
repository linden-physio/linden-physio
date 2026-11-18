import { test } from "node:test";
import assert from "node:assert/strict";
import { encode } from "./accounting.ts";

test("the nightly file is written in code page 437, and a character it hasn't got stops it", () => {
  // "ö" is one byte, 0x94, as the file's #FORMAT PC8 promises; in UTF-8 it would be two.
  assert.deepEqual([...encode("för")], [0x66, 0x94, 0x72]);
  assert.throws(() => encode('#FLAGGA 0\r\n#VER "Follow-up – long"'), /Row 2 .*"–"/);
});
