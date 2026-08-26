import { defineConfig } from "@playwright/test";

/**
 * E2E tests run against a live local stack:
 *   docker compose up -d          (PostgreSQL + MinIO)
 *   cd backend  && npm run start:dev
 *   cd frontend && npm run dev -- -p 3001
 * Then: npm run test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "retain-on-failure",
  },
});
