import { expect, test, type Page } from "@playwright/test";

/** A tiny but valid one-page PDF, enough for upload + viewer smoke tests. */
function pdfBuffer(title: string): Buffer {
  return Buffer.from(
    `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 60>>stream
BT /F1 24 Tf 72 700 Td (${title}) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`,
  );
}

async function register(page: Page, tag: string) {
  const email = `e2e-${tag}-${Date.now()}@test.local`;
  await page.goto("/register");
  await page.getByPlaceholder("Full name").fill(`E2E ${tag}`);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (min. 8 characters)").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/f\//);
  return email;
}

test("owner journey: folders, conflicts, upload with auto-suffix, delete warning", async ({
  page,
}) => {
  await register(page, "owner");

  // Create a folder.
  await page.getByRole("button", { name: "New folder" }).click();
  await page.getByPlaceholder("Folder name").fill("Docs");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("button", { name: "Docs" })).toBeVisible();

  // A duplicate name is rejected with an inline error.
  await page.getByRole("button", { name: "New folder" }).click();
  await page.getByPlaceholder("Folder name").fill("Docs");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText('already exists here')).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  // Upload the same file twice: second copy gets an auto-suffix.
  const file = { name: "report.pdf", mimeType: "application/pdf", buffer: pdfBuffer("E2E") };
  await page.locator('input[type="file"]').setInputFiles([file]);
  await expect(page.getByText("report.pdf", { exact: true })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles([file]);
  await expect(page.getByText("report (1).pdf")).toBeVisible();

  // Preview opens with the file title and a Download button.
  await page.getByRole("button", { name: "report.pdf", exact: true }).click();
  await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
  await page.keyboard.press("Escape");

  // Deleting a non-empty folder warns with exact contents. The room root
  // currently holds 2 files; "Docs" is empty, so delete a file instead:
  const row = page.locator("tr", { hasText: "report (1).pdf" });
  await row.hover();
  await row.getByLabel("Actions").click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByText(/permanently deleted/)).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator("tr", { hasText: "report (1).pdf" })).toHaveCount(0);
});

test("public share lifecycle: create link, view-only access, disable, revoked", async ({
  page,
  browser,
}) => {
  await register(page, "sharer");

  // A folder with one file to share.
  await page.getByRole("button", { name: "New folder" }).click();
  await page.getByPlaceholder("Folder name").fill("Deal docs");
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("button", { name: "Deal docs" }).click();
  // The room root URL also matches /f/, so wait for the breadcrumb instead.
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Deal docs");
  await page
    .locator('input[type="file"]')
    .setInputFiles([{ name: "nda.pdf", mimeType: "application/pdf", buffer: pdfBuffer("NDA") }]);
  await expect(page.getByText("nda.pdf")).toBeVisible();

  // Share the folder via a public link.
  await page.goBack();
  const row = page.locator("tr", { hasText: "Deal docs" });
  await row.hover();
  await row.getByLabel("Actions").click();
  await page.getByRole("menuitem", { name: "Share" }).click();
  await page.getByRole("button", { name: "Create public link" }).click();
  const link = await page.locator('input[value*="/s/"]').inputValue();
  expect(link).toContain("/s/");

  // An anonymous visitor sees a read-only page with the shared content.
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(link);
  await expect(anonPage.getByText("view only")).toBeVisible();
  await expect(anonPage.getByText("nda.pdf")).toBeVisible();
  await expect(anonPage.getByRole("button", { name: "New folder" })).toHaveCount(0);

  // Disabling the link revokes access with a clear message.
  await page.getByRole("button", { name: "Disable link" }).click();
  await expect(page.getByRole("button", { name: "Create public link" })).toBeVisible();
  await anonPage.reload();
  await expect(
    anonPage.getByText("This link is invalid or its access has been revoked"),
  ).toBeVisible();
  await anon.close();
});
