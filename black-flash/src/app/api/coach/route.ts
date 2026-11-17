import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { coachStatus, rateLimited } from "@/lib/server/coach-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).min(1).max(20),
  context: z.string().max(12_000),
  style: z.enum(["direct", "balanced", "encouraging", "analytical"]),
});

const SYSTEM = `You are the coach inside BLACK FLASH, a private personal-performance app for one person, often a student-athlete.
Use only the app data provided in the CONTEXT block and what the user says. Never invent numbers, sessions, or history.
Structure every answer with these four short headings:
**What your logs show** - facts from the context, with dates or counts.
**What that may mean** - careful interpretation, phrased as possibilities.
**Practical next action** - one to three concrete steps.
**What I can't tell from this data** - honest limits.
Never diagnose injuries, illnesses or mental health, never guess hidden feelings, physical potential or anything not measured, and never recommend supplements, calorie targets, weight goals or extreme training. If something sounds like pain or a health concern, suggest talking to a trusted adult or a qualified professional.
If you suggest creating a task or habit, ALSO add at the very end a fenced code block with language "proposals" containing JSON like {"proposals":[{"type":"create_task","title":"...","dueDate":"YYYY-MM-DD"},{"type":"create_habit","label":"...","perWeek":3}]}. The app shows each proposal for the user to confirm; you cannot change anything yourself.`;

export async function GET(req: Request) {
  return Response.json(coachStatus(req.headers.get("host")));
}

export async function POST(req: Request) {
  const status = coachStatus(req.headers.get("host"));
  if (!status.allowed) return Response.json({ error: status.reason }, { status: 403 });
  if (rateLimited()) return Response.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
  const raw = await req.text();
  if (raw.length > 100_000) return Response.json({ error: "Request too large." }, { status: 413 });
  let parsed;
  try { parsed = Body.safeParse(JSON.parse(raw)); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!parsed.success) return Response.json({ error: "Invalid request: " + parsed.error.issues[0].message }, { status: 400 });
  const { messages, context, style } = parsed.data;

  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
  const stream = client.beta.messages.stream({
    model: status.model,
    max_tokens: 8000,
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: `${SYSTEM}\nWrite in a ${style} tone.\n\nCONTEXT (only the categories the user approved):\n${context || "(no data shared)"}`,
    messages,
  }, { signal: req.signal });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") controller.enqueue(encoder.encode(event.delta.text));
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\n_The model declined to answer this request._"));
        if (final.stop_reason === "max_tokens") controller.enqueue(encoder.encode("\n\n_Reply was cut off at the length limit._"));
      } catch (e) {
        const msg = e instanceof Anthropic.RateLimitError ? "The AI service is rate limiting requests. Try again shortly."
          : e instanceof Anthropic.AuthenticationError ? "The server's API key was rejected."
          : e instanceof Anthropic.APIError ? `The AI service returned an error (${e.status ?? "network"}).` : "The AI request failed.";
        controller.enqueue(encoder.encode(`\n\n[error] ${msg}`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
