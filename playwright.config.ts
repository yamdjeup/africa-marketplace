import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const wallPort = 3101;
const wallPassword = "mur-test-jetable";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  webServer: [
    {
      command: `npm run db:seed && npm run build && npx next start -p ${port}`,
      // Mur de mot de passe désactivé par défaut (variable vide) pour les parcours.
      env: { AUTH_SECRET: "e2e-only-secret-not-for-production", SITE_ACCESS_PASSWORD: "" },
      url: `http://localhost:${port}/fr`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
    {
      // Même build, mur activé avec un mot de passe jetable propre aux tests.
      command: `npx next start -p ${wallPort}`,
      env: {
        AUTH_SECRET: "e2e-only-secret-not-for-production",
        SITE_ACCESS_PASSWORD: wallPassword,
        SITE_ACCESS_SECRET: "e2e-only-access-secret",
      },
      url: `http://localhost:${wallPort}/acces`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts|access\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
    {
      name: "wall",
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${wallPort}` },
      testMatch: /access\.spec\.ts/,
    },
  ],
});
