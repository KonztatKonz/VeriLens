const test = require("node:test");
const assert = require("node:assert/strict");
const { tryApiKeys } = require("./server");

function mockResponse(status) {
  return { status: status };
}

test("switches after a 402 exhausted-credits response", async function () {
  const attemptedKeys = [];
  const fetchImpl = async function (_url, options) {
    const key = options.headers.Authorization;
    attemptedKeys.push(key);
    if (key.endsWith("first")) return mockResponse(402);
    if (key.endsWith("second")) return mockResponse(200);
    throw new Error("unexpected key");
  };

  const result = await tryApiKeys(
    ["key-first", "key-second"],
    0,
    Buffer.from("image"),
    "multipart/form-data; boundary=test",
    fetchImpl
  );

  assert.equal(result.response.status, 200);
  assert.equal(result.keyIndex, 1);
  assert.deepEqual(attemptedKeys, [
    "Bearer key-first",
    "Bearer key-second"
  ]);
});

test("returns the last 402 after every key is exhausted", async function () {
  const attemptedKeys = [];
  const fetchImpl = async function (_url, options) {
    attemptedKeys.push(options.headers.Authorization);
    return mockResponse(402);
  };

  const result = await tryApiKeys(
    ["key-first", "key-second"],
    0,
    Buffer.from("image"),
    "multipart/form-data; boundary=test",
    fetchImpl
  );

  assert.equal(result.response.status, 402);
  assert.equal(result.keyIndex, 1);
  assert.deepEqual(attemptedKeys, [
    "Bearer key-first",
    "Bearer key-second"
  ]);
});
