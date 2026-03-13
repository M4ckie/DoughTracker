import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  expect: { timeout: 8000 },
  use: {
    baseURL: 'http://192.168.68.120:9000',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  reporter: [['list']],
});
