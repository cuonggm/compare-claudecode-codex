import { expect, test } from "@playwright/test";

test("technician plans a load and manager schedules it with sensor alerts", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tổng quan vận hành" })).toBeVisible();
  await expect(page.locator(".metric-card").first()).toBeVisible();

  await page.getByLabel("Đăng nhập giả lập").selectOption({ label: "Tuan - kỹ thuật viên" });
  await page.getByRole("button", { name: "Lập mẻ nung" }).click();
  await page.getByRole("button", { name: /Chạy lập mẻ/ }).click();

  await expect(page.getByText(/Đã tạo mẻ nung nháp/)).toBeVisible();
  await expect(page.locator(".piece-block").first()).toBeVisible();
  await expect(page.getByText("Men chưa rõ").first()).toBeVisible();

  await page.getByLabel("Đăng nhập giả lập").selectOption({ label: "Mira - quản lý" });
  await page.getByRole("button", { name: "Lịch nung" }).click();
  await page.getByRole("button", { name: /Duyệt/ }).click();
  await expect(page.getByText(/Cone 6 - oxy hóa - đã duyệt/)).toBeVisible();

  await page.getByRole("button", { name: /Lên lịch/ }).click();
  await expect(page.getByText(/Cone 6 - oxy hóa - đã lên lịch/)).toBeVisible();

  await page.getByRole("button", { name: /Nhập CSV cảm biến/ }).click();
  await expect(page.getByText("Lệch nhiệt").first()).toBeVisible();
  await expect(page.getByText("Tăng nhiệt quá nhanh").first()).toBeVisible();
});
