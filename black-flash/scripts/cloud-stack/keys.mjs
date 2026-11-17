// Generates a JWT secret plus anon / service_role keys (HS256), like a Supabase project has. Local testing only.
import { createHmac, randomBytes } from "node:crypto";
const secret = process.env.JWT_SECRET || randomBytes(32).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (payload) => { const h = b64({ alg: "HS256", typ: "JWT" }), p = b64(payload); return `${h}.${p}.${createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`; };
const iat = Math.floor(Date.now() / 1000), exp = iat + 10 * 365 * 24 * 3600;
console.log(`JWT_SECRET=${secret}`);
console.log(`ANON_KEY=${sign({ role: "anon", iss: "supabase", iat, exp })}`);
console.log(`SERVICE_KEY=${sign({ role: "service_role", iss: "supabase", iat, exp })}`);
