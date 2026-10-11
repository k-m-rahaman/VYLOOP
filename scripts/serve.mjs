import http from "node:http";
import { appendFileSync, createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildRoot = path.join(projectRoot, "out");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function log(message) {
  console.log(message);
  try {
    appendFileSync(path.join(projectRoot, "VYLOOP-startup.log"), `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // A read-only folder must not prevent the app from starting.
  }
}

export function parseArgs(args) {
  let port = 4173;
  let open = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--open") open = true;
    else if (args[index] === "--port") port = Number(args[++index]);
    else throw new Error(`Unknown option: ${args[index]}`);
  }
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Choose a port between 1024 and 65535, for example --port 4173.");
  return { port, open };
}

export function createAppServer(root, instance = randomUUID()) {
  root = path.resolve(root);
  return http.createServer((request, response) => {
    response.setHeader("X-VYLOOP-Instance", instance);
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    } catch {
      response.writeHead(400);
      response.end("Invalid URL");
      return;
    }
    let file = path.resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    try {
      if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!existsSync(file) || !statSync(file).isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      });
      if (request.method === "HEAD") response.end();
      else createReadStream(file).on("error", () => response.destroy()).pipe(response);
    } catch {
      response.writeHead(500);
      response.end("Unable to read the app files");
    }
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const failed = (error) => { server.off("listening", ready); reject(error); };
    const ready = () => { server.off("error", failed); resolve(); };
    server.once("error", failed);
    server.once("listening", ready);
    server.listen({ port, host: "127.0.0.1", exclusive: true });
  });
}

export function verifyApp(url, instance) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("error", reject);
      response.on("end", () => {
        if (response.headers["x-vyloop-instance"] !== instance) {
          const error = new Error("The local address did not return this VYLOOP app.");
          error.code = "EVYLOOPMISMATCH";
          reject(error);
        } else if (response.statusCode !== 200) {
          const error = new Error(`The VYLOOP server returned HTTP ${response.statusCode}. Check that the complete out folder was extracted.`);
          error.code = "EVYLOOPHTTP";
          reject(error);
        } else if (!/vyloop/i.test(body)) {
          const error = new Error("The local address did not return this VYLOOP app: out/index.html does not contain the VYLOOP page.");
          error.code = "EVYLOOPCONTENT";
          reject(error);
        } else {
          resolve();
        }
      });
    });
    request.setTimeout(5000, () => request.destroy(new Error("The local app check timed out. Check whether security software blocks Node.js on localhost.")));
    request.on("error", reject);
  });
}

export async function startServer({ root = buildRoot, port = 4173, maxAttempts = 20 } = {}) {
  root = path.resolve(root);
  if (!existsSync(path.join(root, "index.html"))) {
    throw new Error(`The built app is missing: ${path.join(root, "index.html")}\nExtract the complete VYLOOP app folder, or run npm run build from the source folder.`);
  }
  for (let attempt = 0; attempt < maxAttempts && port + attempt <= 65535; attempt += 1) {
    const chosenPort = port + attempt;
    const instance = randomUUID();
    const server = createAppServer(root, instance);
    try {
      await listen(server, chosenPort);
    } catch (error) {
      if (error.code === "EADDRINUSE") continue;
      throw error;
    }
    const url = `http://127.0.0.1:${chosenPort}/`;
    try {
      await verifyApp(url, instance);
    } catch (error) {
      await new Promise((resolve) => server.close(resolve));
      if (error.code === "EVYLOOPMISMATCH") continue;
      throw error;
    }
    return { server, port: chosenPort, url };
  }
  throw new Error(`No verified VYLOOP address was available on ports ${port} through ${Math.min(port + maxAttempts - 1, 65535)}. Run node scripts\\serve.mjs --port 4300 --open, or close an earlier VYLOOP window.`);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const { server, port, url } = await startServer(options);
    log(`VYLOOP is ready: ${url}`);
    if (port !== options.port) log(`Port ${options.port} was busy. Use the VYLOOP address above instead.`);
    log("Keep this window open while using VYLOOP. Press Ctrl+C to stop the app.");
    server.on("error", (error) => log(`Server error: ${error.message}`));
    if (options.open && process.platform === "win32") {
      const browser = spawn(process.env.ComSpec || "cmd.exe", ["/d", "/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true });
      browser.on("error", (error) => log(`Could not open your browser: ${error.message}\nOpen ${url} manually.`));
      browser.unref();
    }
  } catch (error) {
    log(`VYLOOP could not start.\n${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
