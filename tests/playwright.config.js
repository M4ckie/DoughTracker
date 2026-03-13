import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  expect: { timeout: 8000 },
  use: {
    baseURL: 'http://192.168.68.120:9000',
    browserName: 'chromium',
    viewport: { width: 1024, height: 768 },
  },
  reporter: [['list']],
});
