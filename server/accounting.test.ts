import { test } from "node:test";
import assert from "node:assert/strict";
import { encode, plain } from "./accounting.ts";

test("the nightly file is written in code page 437, and a character it hasn't got stops it", () => {
  // "ö" is one byte, 0x94, as the file's #FORMAT PC8 promises; in UTF-8 it would be two.
  assert.deepEqual([...encode("för")], [0x66, 0x94, 0x72]);
  assert.throws(() => encode('#FLAGGA 0\r\n#VER "Michał"'), /Row 2 .*"ł"/);
  // The error goes to the log, so it names the row, not what's in it.
  assert.throws(
    () => encode('#VER "Michał"'),
    (error: Error) => !error.message.includes("Mich"),
  );
});

test("people's names are written with the nearest letters the file has", () => {
  assert.equal(plain("Michał Nowak"), "Michal Nowak");
  assert.equal(plain("Śliwa, Åsa Öberg"), "Sliwa, Åsa Öberg");
  assert.equal(plain("Bjørn – 😀"), "Bjorn - ?");
  assert.doesNotThrow(() => encode(plain("Zoë Ćwik—Łukasz")));
});
