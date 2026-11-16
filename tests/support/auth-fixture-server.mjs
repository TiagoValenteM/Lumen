import { createServer } from "node:http";

// Browser-specific fixtures own writes and REST data. This only answers server-side
// session reads from the compiled app, on loopback, without hitting a hosted project.
const emails = new Map([
  ["00000000-0000-4000-8000-000000000001", "moderator@example.test"],
  ["00f25ce5-a8b1-4e49-aee0-5258c65f243c", "test@example.com"],
]);

function getUser(header) {
  const match = /^Bearer eyJhbGciOiJIUzI1NiJ9\.([A-Za-z0-9_-]+)\.fixture$/.exec(header ?? "");
  if (!match) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(match[1], "base64url").toString());
    if (!emails.has(sub) || typeof exp !== "number" || exp <= Date.now() / 1000) return null;
    return { id: sub, email: emails.get(sub), aud: "authenticated", app_metadata: {}, user_metadata: {} };
  } catch {
    return null;
  }
}

createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  const send = (status, body) => {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (request.method !== "GET") return send(405, { message: "Fixture writes are disabled." });
  if (path === "/health") return send(200, { ok: true });
  if (path === "/auth/v1/user") {
    const user = getUser(request.headers.authorization);
    return user ? send(200, user) : send(401, { code: "bad_jwt", message: "Fixture token required." });
  }
  if (path.startsWith("/rest/v1/")) return send(200, []);
  return send(404, { message: "Unexpected fixture endpoint." });
}).listen(3172, "127.0.0.1");
