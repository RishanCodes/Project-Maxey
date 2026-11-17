// Minimal stand-in for Supabase's API gateway: /auth/v1 -> GoTrue, /rest/v1 -> PostgREST, plus CORS.
import http from "node:http";
const ROUTES = { "/auth/v1": "http://127.0.0.1:9999", "/rest/v1": "http://127.0.0.1:3001" };
const TEMPLATE = `<h2>Your BLACK FLASH sign-in code</h2><p>Code: {{ .Token }}</p>`;
http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, X-Supabase-Api-Version");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  if (req.url.startsWith("/templates/magic_link")) { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(TEMPLATE); }
  const prefix = Object.keys(ROUTES).find((p) => req.url.startsWith(p));
  if (!prefix) { res.writeHead(404); return res.end("not found"); }
  const target = new URL(ROUTES[prefix] + req.url.slice(prefix.length));
  const headers = { ...req.headers, host: target.host };
  const up = http.request(target, { method: req.method, headers }, (r) => { res.writeHead(r.statusCode || 502, r.headers); r.pipe(res); });
  up.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(up);
}).listen(54321, "127.0.0.1", () => console.log("gateway on http://127.0.0.1:54321"));
