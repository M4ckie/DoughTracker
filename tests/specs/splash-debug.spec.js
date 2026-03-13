import { test, expect } from '@playwright/test';

test('splash screen debug', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: 'test-results/splash-0ms.png' });

  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/splash-200ms.png' });

  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/splash-500ms.png' });

  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/splash-1100ms.png' });

  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/splash-1900ms.png' });

  // Inspect the DOM
  const info = await page.evaluate(() => {
    const splash = document.querySelector('.splash');
    const img = document.querySelector('.splash-logo');
    if (!splash) return { splashExists: false };
    const imgStyle = img ? window.getComputedStyle(img) : null;
    const splashStyle = window.getComputedStyle(splash);
    return {
      splashExists: true,
      splashClass: splash.className,
      splashOpacity: splashStyle.opacity,
      imgSrc: img?.src,
      imgNaturalWidth: img?.naturalWidth,
      imgBroken: img ? img.naturalWidth === 0 : null,
      imgOpacity: imgStyle?.opacity,
      imgTransform: imgStyle?.transform,
    };
  });
  console.log('Splash DOM info:', JSON.stringify(info, null, 2));

  // Check the image URL
  const imgResp = await page.request.get('/DonutLogo.png');
  console.log('DonutLogo.png HTTP status:', imgResp.status());
  console.log('DonutLogo.png Content-Type:', imgResp.headers()['content-type']);
});
