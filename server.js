const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config();

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const MAX_REQUEST_BYTES = 11 * 1024 * 1024;
const API_URL = "https://api.sightengine.com/1.0/check.json";
const API_USER = process.env.SIGHTENGINE_API_USER || "";
const API_SECRET = process.env.SIGHTENGINE_API_SECRET || "";

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

async function requestSightengine(image, contentType, filename, apiUser, apiSecret, fetchImpl) {
  const form = new FormData();
  form.append("media", new Blob([image], { type: contentType }), filename);
  form.append("models", "genai");
  form.append("api_user", apiUser);
  form.append("api_secret", apiSecret);
  return fetchImpl(API_URL, { method: "POST", body: form });
}

async function proxyAnalysis(request, response) {
  if (!API_USER || !API_SECRET) {
    sendJson(response, 503, "Configure SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET.");
    return;
  }

  const contentType = request.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("image/") &&
      contentType.toLowerCase() !== "application/octet-stream") {
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

  const filename = path.basename(request.headers["x-file-name"] || "upload-image");
  const upstreamResponse = await requestSightengine(
    body,
    contentType,
    filename,
    API_USER,
    API_SECRET,
    fetch
  );

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

if (require.main === module) {
  server.listen(PORT, function () {
    console.log("Truth Seeker is available at http://localhost:" + PORT);
  });
}

module.exports = { requestSightengine };
