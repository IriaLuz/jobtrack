import { expect, test, type Page } from "@playwright/test";

// These tests drive the real web app, API and database. The API runs without an AI key,
// so they also prove that the practice feature degrades gracefully.

async function signUpAsNewUser(page: Page) {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "jobtrack" })).toBeVisible();
}

async function addApplication(page: Page, { company, role }: { company: string; role: string }) {
  await page.getByRole("button", { name: "Add application" }).click();
  const dialog = page.getByRole("dialog", { name: "Add application" });
  await dialog.getByLabel("Company").fill(company);
  await dialog.getByLabel("Role").fill(role);
  await dialog.getByLabel("Link to the job post").fill("https://example.com/jobs/1");
  await dialog.getByRole("button", { name: "Add application" }).click();
  await expect(dialog).toBeHidden();
}

const column = (page: Page, status: string) => page.getByRole("region", { name: status });

// The preview server sends the production Content-Security-Policy. Any violation fails the test,
// so a policy that would break something in production is caught here first.
let securityPolicyViolations: string[] = [];
test.beforeEach(({ page }) => {
  securityPolicyViolations = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) securityPolicyViolations.push(message.text());
  });
});
test.afterEach(() => {
  expect(securityPolicyViolations).toEqual([]);
});

test("track an application, practise for it, then delete it", async ({ page }) => {
  await signUpAsNewUser(page);
  await addApplication(page, { company: "Acme", role: "Frontend Engineer" });
  const card = page.getByRole("article", { name: "Frontend Engineer at Acme" });
  await expect(column(page, "Saved").getByRole("article")).toHaveCount(1);

  // Change the status from the edit dialog: the keyboard and touch friendly way to move a card.
  await page.getByRole("button", { name: "Edit Frontend Engineer at Acme" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit application" });
  await editDialog.getByLabel("Status").selectOption("interviewing");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(column(page, "Interviewing").getByRole("article", { name: "Frontend Engineer at Acme" })).toBeVisible();

  // Practise: with no AI available the user still gets a question and keeps their answer.
  await page.getByRole("button", { name: "Practise for Frontend Engineer at Acme" }).click();
  const practice = page.getByRole("dialog", { name: "Interview practice: Frontend Engineer at Acme" });
  await practice.getByRole("button", { name: "New question" }).click();
  await expect(practice.getByText(/from our question bank/i)).toBeVisible();
  await practice.getByLabel("Your answer").fill("I would measure first, then fix the slowest part.");
  await practice.getByRole("button", { name: "Submit answer" }).click();
  await expect(practice.getByText(/your answer is saved/i)).toBeVisible();
  await practice.getByRole("button", { name: "Close" }).click();

  page.once("dialog", (confirmation) => void confirmation.accept());
  await page.getByRole("button", { name: "Edit Frontend Engineer at Acme" }).click();
  await page.getByRole("button", { name: "Delete application" }).click();
  await expect(card).toHaveCount(0);
});

test("drag a card to another column and it stays there after a reload", async ({ page }) => {
  await signUpAsNewUser(page);
  await addApplication(page, { company: "Globex", role: "Backend Engineer" });

  await page.getByRole("article", { name: "Backend Engineer at Globex" }).dragTo(column(page, "Applied"));

  const movedCard = column(page, "Applied").getByRole("article", { name: "Backend Engineer at Globex" });
  await expect(movedCard).toBeVisible();
  await page.reload();
  await expect(movedCard).toBeVisible();
});

test("a new user never sees the previous user's applications", async ({ page }) => {
  await signUpAsNewUser(page);
  await addApplication(page, { company: "Initech", role: "QA Engineer" });
  await page.getByRole("button", { name: "Sign out" }).click();

  await signUpAsNewUser(page);

  await expect(page.getByText("No applications yet.")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
});
