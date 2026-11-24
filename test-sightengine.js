const test = require("node:test");
const assert = require("node:assert/strict");
const { requestSightengine } = require("./server");

test("sends the image and Sightengine credentials in the documented format", async function () {
  let requestUrl;
  let requestOptions;
  const fetchImpl = async function (url, options) {
    requestUrl = url;
    requestOptions = options;
    return { status: 200 };
  };

  await requestSightengine(
    Buffer.from("image-data"),
    "image/png",
    "sample.png",
    "test-user",
    "test-secret",
    fetchImpl
  );

  assert.equal(requestUrl, "https://api.sightengine.com/1.0/check.json");
  assert.equal(requestOptions.method, "POST");
  assert.equal(requestOptions.body.get("models"), "genai");
  assert.equal(requestOptions.body.get("api_user"), "test-user");
  assert.equal(requestOptions.body.get("api_secret"), "test-secret");
  assert.equal(requestOptions.body.get("media").name, "sample.png");
  assert.equal(requestOptions.body.get("media").type, "image/png");
});
