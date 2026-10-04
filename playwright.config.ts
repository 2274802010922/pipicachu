import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3104",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start -- --port 3104",
    url: "http://127.0.0.1:3104/api/health",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      PIPICACHU_OFFLINE_TEST: "1",
      AI_ENABLED: "false",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3104",
    },
  },
});
