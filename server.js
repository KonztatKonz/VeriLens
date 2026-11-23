const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config();

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const MAX_REQUEST_BYTES = 11 * 1024 * 1024;
const API_URL = "https://api.aiornot.com/v2/image/sync?excluding=nsfw";
const API_KEYS = (process.env.API_KEYS || "")
  .split(",")
  .map(function (key) { return key.trim(); })
  .filter(Boolean);
let activeApiKeyIndex = 0;

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function sendJson(response, status, message) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: message }));
}

async function proxyAnalysis(request, response) {
  if (API_KEYS.length === 0) {
    sendJson(response, 503, "Configure at least one API key in .env.");
    return;
  }

  const contentType = request.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    sendJson(response, 400, "Expected an image upload.");
    return;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) {
      sendJson(response, 413, "The image upload is too large.");
      return;
    }
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);

  let upstreamResponse;
  const firstKeyIndex = activeApiKeyIndex;
  for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
    const keyIndex = (firstKeyIndex + attempt) % API_KEYS.length;
    upstreamResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + API_KEYS[keyIndex],
        "Content-Type": contentType
      },
      body: body
    });

    if (upstreamResponse.status !== 401 && upstreamResponse.status !== 403) {
      activeApiKeyIndex = keyIndex;
      break;
    }
    activeApiKeyIndex = (keyIndex + 1) % API_KEYS.length;
  }

  const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
  response.writeHead(upstreamResponse.status, {
    "Content-Type": upstreamResponse.headers.get("content-type") || "application/json"
  });
  response.end(responseBody);
}

async function serveStatic(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch (error) {
    sendJson(response, 400, "Invalid URL path.");
    return;
  }

  const pathSegments = decodedPath.split(/[\\/]+/).filter(Boolean);
  if (pathSegments.some(function (segment) { return segment.startsWith("."); }) ||
      pathSegments[0] === "node_modules") {
    sendJson(response, 404, "File not found.");
    return;
  }

  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const filePath = path.resolve(ROOT, relativePath);
  const pathFromRoot = path.relative(ROOT, filePath);
  if (pathFromRoot.startsWith("..") || path.isAbsolute(pathFromRoot)) {
    sendJson(response, 403, "Access denied.");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(request.method === "HEAD" ? undefined : file);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      sendJson(response, 404, "File not found.");
      return;
    }
    throw error;
  }
}

const server = http.createServer(async function (request, response) {
  try {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/api/analyze") {
      if (request.method !== "POST") {
        response.writeHead(405, { Allow: "POST" });
        response.end();
        return;
      }
      await proxyAnalysis(request, response);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    await serveStatic(request, response, url.pathname);
  } catch (error) {
    console.error("Request failed:", error.message);
    if (!response.headersSent) {
      sendJson(response, 502, "The request could not be completed.");
    } else {
      response.destroy();
    }
  }
});

server.listen(PORT, function () {
  console.log("Truth Seeker is available at http://localhost:" + PORT);
});
