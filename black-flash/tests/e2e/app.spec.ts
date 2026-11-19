import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

test.use({ timezoneId: "America/Los_Angeles", locale: "en-US" });

const MON = new Date("2026-11-16T19:00:00Z"); // Monday 11:00 in Los Angeles

async function startWithDefaults(page: Page) {
  await page.goto("/");
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Start with defaults" }).click();
  await page.waitForURL((u) => u.pathname === "/");
}
async function noHorizontalOverflow(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(1);
}
async function totalXp(page: Page) {
  await page.goto("/growth");
  const t = await page.getByText(/^\d+ XP · \d+ to level/).textContent();
  return Number(t!.split(" ")[0]);
}

test("1. fresh install → onboarding → refresh mid-way → resumes on the same question", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByPlaceholder("First name or nickname").fill("Ari");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Training & sport" }).click();
  await page.getByRole("button", { name: "School & studying" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Pick up to three main priorities.")).toBeVisible();
  const counter = await page.getByText(/^\d+\/\d+$/).first().textContent();
  await page.reload();
  await expect(page.getByText("Pick up to three main priorities.")).toBeVisible();
  await expect(page.getByText(counter!, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("button", { name: "Training & sport" })).toHaveAttribute("aria-pressed", "true");
});

test("2. complete onboarding → plan is only added after approval → personalized Today", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByPlaceholder("First name or nickname").fill("Ari");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Daily habits" }).click();
  // Answer a couple of questions and skip the rest, waiting for each new screen.
  await expect(page.getByRole("button", { name: "Daily habits" })).toHaveAttribute("aria-pressed", "true");
  for (let i = 0; i < 60; i++) {
    const heading = page.getByRole("heading", { level: 1 });
    const text = (await heading.textContent()) ?? "";
    if (text.startsWith("Here's your starting point")) break;
    if (text.startsWith("Which would you like to build")) { await page.getByRole("button", { name: "Plan tomorrow (2 min)" }).click(); await expect(page.getByRole("button", { name: "Plan tomorrow (2 min)" })).toHaveAttribute("aria-pressed", "true"); }
    if (text.startsWith("Should I draft")) { await page.getByRole("button", { name: "Yes, draft them" }).click(); await expect(page.getByRole("button", { name: "Yes, draft them" })).toHaveAttribute("aria-pressed", "true"); }
    const skip = page.getByRole("button", { name: "Skip" });
    if (await skip.isVisible()) await skip.click(); else await page.getByRole("button", { name: /Next|See my plan/ }).click();
    await expect(heading).not.toHaveText(text);
  }
  await expect(page.getByText("Drafted for you")).toBeVisible();
  // Nothing exists yet.
  expect(await page.evaluate(async () => { const r = indexedDB.open("black-flash"); return await new Promise<number>((res) => { r.onsuccess = () => { const tx = r.result.transaction("habits"); const c = tx.objectStore("habits").count(); c.onsuccess = () => res(c.result); }; }); })).toBe(0);
  await page.getByRole("button", { name: /Approve \d+ items? and start/ }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ari");
  await expect(page.getByText("Plan tomorrow (2 min)").first()).toBeVisible();
  // Retake + approve again does not duplicate.
  await page.goto("/onboarding?step=results");
  await page.getByRole("button", { name: /Approve \d+ items? and start/ }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.goto("/plan?view=habits");
  await expect(page.getByText("Plan tomorrow (2 min)")).toHaveCount(1);
});

test("3. add / edit / complete / undo a task → refresh → persistence and XP", async ({ page }) => {
  await startWithDefaults(page);
  await page.getByRole("button", { name: "Add a task" }).click();
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("alert")).toHaveText("Give the task a title."); // form validation
  await page.getByLabel("Title").fill("Finish math assignment");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("heading", { name: "Finish math assignment" })).toBeVisible();
  await page.getByRole("button", { name: "Mark done" }).click();
  await expect(page.getByText(/Done: Finish math assignment \(\+10 XP\)/)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Mark done" })).toBeVisible(); // undo finished
  expect(await totalXp(page)).toBe(0);
  await page.goto("/plan");
  await page.getByRole("button", { name: "Finish math assignment", exact: true }).click();
  await page.getByLabel("Title").fill("Finish math assignment (ch. 4)");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Complete Finish math assignment (ch. 4)" }).click();
  await expect(page.getByRole("button", { name: "Mark Finish math assignment (ch. 4) not done" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Mark Finish math assignment (ch. 4) not done" })).toBeVisible();
  expect(await totalXp(page)).toBe(10);
});

test("4. 3-days-a-week habit: off-days are not missed and the streak survives them", async ({ page }) => {
  await page.clock.setFixedTime(MON);
  await startWithDefaults(page);
  await page.getByRole("button", { name: "Quick add" }).first().click();
  await page.getByRole("button", { name: /^Habit/ }).click();
  await page.getByLabel("Habit", { exact: true }).fill("Shooting form");
  await page.getByRole("button", { name: "Specific days" }).click();
  await page.getByRole("button", { name: "Add habit" }).click();
  await expect(page.getByText("Habit added")).toBeVisible();
  await page.goto("/plan");
  await page.getByRole("button", { name: "Complete Shooting form" }).click(); // Monday
  await expect(page.getByRole("button", { name: "Uncheck Shooting form" })).toBeVisible();
  await page.clock.setFixedTime(new Date("2026-11-17T19:00:00Z")); // Tuesday: off-day
  await page.goto("/");
  await expect(page.getByText("Shooting form")).toHaveCount(0);
  await page.goto("/plan?view=habits");
  await expect(page.getByRole("button", { name: /Shooting form.*Mon, Wed, Fri/ })).toContainText("1day streak");
  await page.clock.setFixedTime(new Date("2026-11-18T19:00:00Z")); // Wednesday: due, not done yet
  await page.goto("/plan?view=habits");
  await expect(page.getByRole("button", { name: /Shooting form/ })).toContainText("1day streak");
  await page.clock.setFixedTime(new Date("2026-11-19T19:00:00Z")); // Thursday: Wednesday was missed
  await page.goto("/plan?view=habits");
  await expect(page.getByRole("button", { name: /Shooting form/ })).toContainText("0day streak");
});

test("5. log training → history and chart, no duplicate XP on re-save", async ({ page }) => {
  await startWithDefaults(page);
  await page.goto("/training");
  await page.getByRole("button", { name: "Log your first session" }).click();
  await page.getByLabel("Minutes").fill("60");
  await page.getByRole("button", { name: "shooting" }).click();
  await page.getByRole("button", { name: "Add" }).nth(2).click(); // shot log
  await page.getByLabel("Made").fill("42");
  await page.getByLabel("Attempted").fill("60");
  await expect(page.getByText("70%")).toBeVisible();
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page.getByText(/Logged 60 min basketball \(\+15 XP\)/)).toBeVisible();
  await expect(page.getByText("1 session · 60 min")).toBeVisible();
  await expect(page.getByRole("figure", { name: /Training minutes per week/ })).toBeVisible();
  await page.getByRole("button", { name: /Basketball · Independent/ }).click();
  await page.getByLabel("Notes").fill("Good rhythm");
  await page.getByRole("button", { name: "Save session" }).click();
  expect(await totalXp(page)).toBe(15);
});

test("6. focus session is recorded once, even across reloads", async ({ page }) => {
  await page.clock.setFixedTime(MON);
  await startWithDefaults(page);
  await page.goto("/focus");
  await page.getByLabel("What are you focusing on?").fill("Chemistry");
  await page.getByLabel("Custom minutes").fill("1");
  await page.getByRole("button", { name: "Start 1-minute focus" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.goto("/plan"); // navigate away; timer keeps running from timestamps
  await page.clock.setFixedTime(new Date(MON.getTime() + 70_000));
  await page.goto("/focus");
  await expect(page.getByText("1 completed session · 1 min")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 completed session · 1 min")).toBeVisible();
  expect(await totalXp(page)).toBe(10);
});

test("7. goal milestone → linked progress updates", async ({ page }) => {
  await startWithDefaults(page);
  await page.goto("/goals");
  await page.getByRole("button", { name: "Create a goal" }).click();
  await page.getByLabel("Goal", { exact: true }).fill("Make varsity");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: /Make varsity/ }).click();
  for (const m of ["Hit 70% layups", "Run a 6-minute mile"]) {
    await page.getByLabel("New milestone").fill(m);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("button", { name: `Complete ${m}` })).toBeVisible();
  }
  await page.getByRole("button", { name: "Complete Hit 70% layups" }).click();
  await expect(page.getByRole("button", { name: "Reopen Hit 70% layups" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText("1 of 2 milestones")).toBeVisible();
  await expect(page.getByText("50%")).toBeVisible();
});

test("8. export → clean state → import → data and ids intact", async ({ page }) => {
  await startWithDefaults(page);
  await page.getByRole("button", { name: "Add a task" }).click();
  await page.getByLabel("Title").fill("Backup me");
  await page.getByRole("button", { name: "Add task" }).click();
  const before = await page.evaluate(async () => new Promise<string>((res) => { const r = indexedDB.open("black-flash"); r.onsuccess = () => { const q = r.result.transaction("tasks").objectStore("tasks").getAll(); q.onsuccess = () => res(q.result[0].id); }; }));
  await page.goto("/data");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download backup" }).click()]);
  const path = await dl.path();
  const text = readFileSync(path!, "utf8");
  expect(JSON.parse(text).app).toBe("black-flash");
  await page.getByLabel('Type "delete" to enable').fill("delete");
  await page.getByRole("button", { name: "Delete all data" }).click();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await page.waitForURL("**/onboarding");
  await page.goto("/data");
  await page.getByLabel("Choose backup file").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(text) });
  await expect(page.getByText(/Valid backup from/)).toBeVisible();
  await page.getByRole("tab", { name: "Replace everything" }).click();
  await page.getByRole("button", { name: "Replace with backup" }).click();
  await page.getByRole("button", { name: "Replace", exact: true }).click();
  await expect(page.getByText(/Import done/)).toBeVisible();
  const after = await page.evaluate(async () => new Promise<string>((res) => { const r = indexedDB.open("black-flash"); r.onsuccess = () => { const q = r.result.transaction("tasks").objectStore("tasks").getAll(); q.onsuccess = () => res(q.result[0].id); }; }));
  expect(after).toBe(before);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Backup me" })).toBeVisible();
});

test("9. no AI key → Insights Mode, no fake chat, real summary once data exists", async ({ page }) => {
  await startWithDefaults(page);
  await page.goto("/coach");
  await expect(page.getByText("Insights Mode")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Message the coach" })).toHaveCount(0);
  await expect(page.getByText("Not enough data yet")).toBeVisible();
  await page.getByRole("button", { name: "What changed in my training this month?" }).click();
  await expect(page.getByText("No completed training sessions in the last 60 days.")).toBeVisible();
  const status = await (await page.request.get("/api/coach")).json();
  expect(status.allowed).toBe(false);
  const post = await page.request.post("/api/coach", { data: { messages: [{ role: "user", content: "hi" }], context: "", style: "balanced" } });
  expect(post.status()).toBe(403);
});

test("10. 375px: no horizontal overflow and the bottom nav never covers actions", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await startWithDefaults(page);
  for (const p of ["/", "/plan", "/plan?view=habits", "/coach", "/growth", "/training", "/wellness", "/goals", "/focus", "/journal", "/settings", "/data"]) {
    await page.goto(p);
    await page.waitForTimeout(150);
    await noHorizontalOverflow(page);
  }
  // The last control on a long page must be able to rest above the fixed bottom nav.
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  const geo = await page.evaluate(() => {
    const nav = [...document.querySelectorAll('nav[aria-label="Main"]')].pop()!.getBoundingClientRect();
    const items = document.querySelectorAll("main a, main button");
    const last = items[items.length - 1].getBoundingClientRect();
    return { lastBottomInDoc: last.bottom + window.scrollY, docHeight: document.documentElement.scrollHeight, navHeight: nav.height };
  });
  expect(geo.docHeight - geo.lastBottomInDoc).toBeGreaterThanOrEqual(geo.navHeight);
});

test("11. desktop: sidebar navigation and readable content width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startWithDefaults(page);
  await expect(page.locator("aside").getByRole("link", { name: "Training" })).toBeVisible();
  const main = await page.locator("main").boundingBox();
  expect(main!.width).toBeLessThanOrEqual(800);
  await noHorizontalOverflow(page);
});

test("12. keyboard, dialogs and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startWithDefaults(page);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  const opener = page.getByRole("button", { name: "Quick add" }).first();
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Quick add" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  const dur = await page.evaluate(() => { const el = document.createElement("div"); el.className = "sheet-in"; document.body.appendChild(el); return getComputedStyle(el).animationDuration; });
  expect(parseFloat(dur)).toBeLessThan(0.01);
});

test("13. suggest times proposes free slots and only changes tasks after approval", async ({ page }) => {
  await page.clock.setFixedTime(MON); // Monday 11:00 Los Angeles
  await startWithDefaults(page);
  await page.goto("/plan");
  await page.getByRole("tab", { name: /Tue/ }).click();
  for (const t of ["Essay outline", "Call grandma"]) {
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByLabel("Title").fill(t);
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByText("Task added")).toBeVisible();
  }
  await page.getByRole("button", { name: "Suggest times" }).click();
  const sheet = page.getByRole("dialog", { name: "Suggested times" });
  await expect(sheet.getByRole("button", { name: /Essay outline/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Essay outline.*AM|Essay outline.*PM/ })).toHaveCount(0); // nothing changed yet
  await sheet.getByRole("button", { name: /Call grandma/ }).click(); // untick one
  await sheet.getByRole("button", { name: "Apply 1" }).click();
  await expect(page.getByText("Scheduled 1 task")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Essay outline.*\d{1,2}:\d{2} (AM|PM)/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Call grandma", exact: true })).toBeVisible(); // still unscheduled
});

test("14. a goal can be pinned as Today's focus", async ({ page }) => {
  await startWithDefaults(page);
  await page.goto("/goals");
  await page.getByRole("button", { name: "Create a goal" }).click();
  await page.getByLabel("Goal", { exact: true }).fill("Make varsity");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: /Make varsity/ }).click();
  await page.getByLabel("New milestone").fill("Hit 70% layups");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: "Complete Hit 70% layups" })).toBeVisible();
  await page.getByRole("button", { name: "Pin to Today" }).click();
  await expect(page.getByText("Pinned as Today's focus")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Goal focus")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Make varsity" })).toBeVisible();
  await expect(page.getByText(/Next: Hit 70% layups/)).toBeVisible();
});

test("15. without cloud configuration the app says so and stays fully local", async ({ page }) => {
  await startWithDefaults(page);
  await page.goto("/settings");
  await expect(page.getByText(/Cloud sync isn't set up for this installation/)).toBeVisible();
  await expect(page.getByText(/Push isn't set up for this installation/)).toBeVisible();
});

test("16. sound effects play on completions and stay silent when turned off", async ({ page }) => {
  // Count oscillator starts so the test can see sounds without hearing them.
  await page.addInitScript(() => {
    const w = window as unknown as { __tones: number };
    w.__tones = 0;
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args: Parameters<typeof start>) { w.__tones++; return start.apply(this, args); };
  });
  const tones = () => page.evaluate(() => (window as unknown as { __tones: number }).__tones);
  await startWithDefaults(page);
  await page.getByRole("button", { name: "Add a task" }).click();
  await page.getByLabel("Title").fill("Free throws");
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByRole("button", { name: "Mark done" }).click();
  await expect(page.getByText(/Done: Free throws/)).toBeVisible();
  await expect.poll(tones).toBeGreaterThan(0);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/settings");
  const sw = page.getByRole("switch", { name: "Sound effects" });
  await expect(sw).toHaveAttribute("aria-checked", "true");
  for (const name of ["Task", "Habit", "Training", "Milestone", "Focus", "Achievement", "Level up"]) await page.getByRole("button", { name, exact: true }).click();
  await expect.poll(tones).toBeGreaterThan(20);
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await expect(page.getByRole("switch", { name: "Sound effects" })).toHaveAttribute("aria-checked", "false"); // remembered
  await page.goto("/plan"); // a new page load resets the tone counter
  await page.getByRole("button", { name: "Mark Free throws not done" }).click();
  await expect(page.getByText("Marked not done")).toBeVisible();
  await page.waitForTimeout(300);
  expect(await tones()).toBe(0);
  expect(errors).toEqual([]);
});

test("17. 90-day program: set up, baseline test, a training day, check-in makes it lighter, progress saved", async ({ page }) => {
  await startWithDefaults(page);
  await page.clock.setFixedTime(MON);
  await page.goto("/program");
  await page.getByRole("button", { name: "Start my 90 days" }).click();
  await expect(page.locator("main [role=alert]")).toHaveText("Pick at least one skill to focus on.");
  for (const n of ["Finishing", "Shooting"]) await page.getByRole("button", { name: n, exact: true }).click();
  await page.getByRole("button", { name: "Start my 90 days" }).click();
  await expect(page.getByRole("heading", { name: "Day 1 of 90" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Baseline test day" })).toBeVisible();
  await page.getByLabel("Free throws (out of 20)").fill("11");
  await page.getByRole("button", { name: /Finish session/ }).click();
  await page.getByRole("button", { name: "About right" }).click();
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page.getByText(/Day 1 done \(\+15 XP\)/)).toBeVisible();
  await expect(page.getByText("11 → –")).toBeVisible(); // baseline recorded

  // Next day (Tuesday, a default training day).
  await page.clock.setFixedTime(new Date(MON.getTime() + 86_400_000));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Day 2 of 90" })).toBeVisible();
  const full = Number((await page.getByText(/^Training · Day 2 · \d+ min$/).textContent())!.match(/(\d+) min/)![1]);
  await page.getByRole("button", { name: /^Mark .* done$/ }).first().click();
  await page.reload(); // checklist progress survives a reload
  await expect(page.getByRole("button", { name: /^Mark .* not done$/ })).toHaveCount(1);

  // A sore check-in makes today lighter, with an explanation and an override.
  await page.goto("/wellness");
  await page.getByRole("button", { name: "Check in now" }).click();
  await page.getByRole("button", { name: "Soreness 4 of 5" }).click();
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(page.getByText(/Check-in saved/)).toBeVisible();
  await page.goto("/program");
  await expect(page.locator("main")).toContainText("Lighter today because soreness is 4/5");
  const light = Number((await page.getByText(/^Training · Day 2 · \d+ min$/).textContent())!.match(/(\d+) min/)![1]);
  expect(light).toBeLessThan(full);
  await page.getByRole("button", { name: "Use the full session" }).click();
  await expect(page.getByText(new RegExp(`^Training · Day 2 · ${full} min$`))).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: /90-day program/ })).toBeVisible();
  await noHorizontalOverflow(page);
});
