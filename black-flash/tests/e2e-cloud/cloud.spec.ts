import { expect, test, type Browser, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.cloud-test", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const REST = "http://127.0.0.1:54321/rest/v1";
const svc = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const sql = (q: string) => execFileSync("docker", ["exec", "-i", "-e", `PGPASSWORD=${env.DB_PASSWORD}`, "bf-db", "psql", "-U", "supabase_admin", "-d", "postgres", "-tAc", q]).toString().trim();

async function latestCode(email: string, after: number): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch("http://127.0.0.1:8025/api/v1/messages")).json() as { messages: Array<{ ID: string; To: Array<{ Address: string }>; Created: string }> };
    const m = list.messages.find((x) => x.To.some((t) => t.Address === email) && Date.parse(x.Created) >= after - 2000);
    if (m) {
      const body = await (await fetch(`http://127.0.0.1:8025/api/v1/message/${m.ID}`)).json() as { HTML: string; Text: string };
      const code = (body.Text + body.HTML).match(/code:?\s*(\d{6})/i);
      if (code) return code[1];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("no code email");
}

async function freshDevice(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "America/Los_Angeles" });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Start with defaults" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  return page;
}
async function signIn(page: Page, email: string) {
  await page.goto("/settings");
  await page.getByLabel("Email").fill(email);
  let t = Date.now();
  for (let attempt = 0; attempt < 5; attempt++) { // the auth server rate-limits code emails per address
    t = Date.now();
    await page.getByRole("button", { name: "Email me a sign-in code" }).click();
    await expect(page.getByLabel(/Code sent to/).or(page.locator("main [role=alert]"))).toBeVisible();
    if (await page.getByLabel(/Code sent to/).isVisible()) break;
    const msg = (await page.locator("main [role=alert]").allTextContents()).join(" ");
    if (!/only request this after/.test(msg)) throw new Error("send failed: " + msg);
    await page.waitForTimeout(1500);
  }
  await page.getByLabel(/Code sent to/).fill(await latestCode(email, t));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
const xpOf = async (page: Page) => { await page.goto("/growth"); return Number((await page.getByText(/^\d+ XP · \d+ to level/).textContent())!.split(" ")[0]); };

test.beforeAll(async () => {
  for (const email of ["me@example.com", "stranger@example.com"]) {
    await fetch("http://127.0.0.1:54321/auth/v1/admin/users", { method: "POST", headers: { ...svc, "Content-Type": "application/json" }, body: JSON.stringify({ email, email_confirm: true }) }); // 422 if it already exists
  }
  sql("insert into public.bf_allowlist values ('me@example.com') on conflict do nothing; delete from public.bf_records; delete from public.bf_push_subscriptions; delete from public.bf_push_log;");
});

test("sign in with an emailed code, sync to the cloud, and see it on a second device", async ({ browser }) => {
  const a = await freshDevice(browser);
  await a.getByRole("button", { name: "Add a task" }).click();
  await a.getByLabel("Title").fill("Cloud task");
  await a.getByRole("button", { name: "Add task" }).click();
  await expect(a.getByText("Task added")).toBeVisible();
  await signIn(a, "me@example.com");
  await expect(a.getByText("Signed in as me@example.com")).toBeVisible();
  await expect(a.getByText(/Last synced/)).toBeVisible({ timeout: 20_000 });
  const rows = await (await fetch(`${REST}/bf_records?tbl=eq.tasks&select=data`, { headers: svc })).json() as Array<{ data: { title: string } }>;
  expect(rows.map((r) => r.data.title)).toContain("Cloud task");

  const b = await freshDevice(browser);
  await signIn(b, "me@example.com");
  await expect(b.getByText(/Last synced/)).toBeVisible({ timeout: 20_000 });
  await b.goto("/");
  await expect(b.getByRole("heading", { name: "Cloud task" })).toBeVisible();

  // Complete on B, sync, then A sees it; XP counted once on each device.
  await b.getByRole("button", { name: "Mark done" }).click();
  await expect(b.getByText(/Done: Cloud task/)).toBeVisible();
  await b.goto("/settings"); await b.getByRole("button", { name: "Sync now" }).click(); await expect(b.getByText("Synced", { exact: true })).toBeVisible({ timeout: 20_000 });
  await a.goto("/settings"); await a.getByRole("button", { name: "Sync now" }).click(); await expect(a.getByText("Synced", { exact: true })).toBeVisible({ timeout: 20_000 });
  await a.goto("/plan");
  await expect(a.getByRole("button", { name: "Mark Cloud task not done" })).toBeVisible();
  expect(await xpOf(a)).toBe(10);
  expect(await xpOf(b)).toBe(10);

  // The signed-in session unlocks the AI coach on the server (key is a placeholder; no AI call is made).
  const status = await (await a.request.get("/api/coach")).json();
  expect(status).toMatchObject({ allowed: true, signedIn: "me@example.com" });
});

test("an account that isn't on the allowlist is refused and can't read data", async ({ browser, request }) => {
  const s = await freshDevice(browser);
  await signIn(s, "stranger@example.com");
  await expect(s.locator("main [role=alert]")).toContainText("isn't on the allowlist");
  await expect(s.getByText(/Signed in as/)).toHaveCount(0);
  // Anonymous requests to the paid endpoint stay closed on a "deployment".
  expect((await (await request.get("/api/coach")).json()).allowed).toBe(false);
  expect((await request.post("/api/coach", { data: { messages: [{ role: "user", content: "hi" }], context: "", style: "balanced" } })).status()).toBe(403);
});

test("push subscription is stored for the signed-in user; the reminder job requires its secret", async ({ browser, request }) => {
  const p = await freshDevice(browser);
  await signIn(p, "me@example.com");
  await expect(p.getByText("Signed in as me@example.com")).toBeVisible();
  const sub = { endpoint: "https://push.example.com/device-1", keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } };
  expect((await p.request.post("/api/push/subscribe", { data: sub })).status()).toBe(200);
  expect(sql("select count(*) from public.bf_push_subscriptions where endpoint = 'https://push.example.com/device-1' and user_id = (select id from auth.users where email = 'me@example.com')")).toBe("1");
  expect((await request.post("/api/push/subscribe", { data: sub })).status()).toBe(401); // anonymous
  expect((await request.get("/api/push/dispatch")).status()).toBe(401);
  const run = await request.get("/api/push/dispatch", { headers: { Authorization: "Bearer cron-test-secret" } });
  expect(run.status()).toBe(200);
  expect(await run.json()).toMatchObject({ users: 1 });
});
