import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', fullyParallel: false, retries: 0,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: process.env.PW_CHANNEL || undefined } },
  ],
  webServer: {
    command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI,
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:8000' },
  },
});
