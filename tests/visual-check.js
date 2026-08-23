const { chromium } = require("playwright");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const cases = [
    { name: "mobile-home", viewport: { width: 390, height: 844 }, url: "http://127.0.0.1:4173/" },
    { name: "mobile-shop", viewport: { width: 390, height: 844 }, url: "http://127.0.0.1:4173/shop" },
    { name: "mobile-product", viewport: { width: 390, height: 844 }, url: "http://127.0.0.1:4173/product/india-blue-cricket-fan-jersey" },
    { name: "desktop-home", viewport: { width: 1440, height: 1000 }, url: "http://127.0.0.1:4173/" }
  ];
  for (const testCase of cases) {
    const page = await browser.newPage({ viewport: testCase.viewport, deviceScaleFactor: 1 });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(testCase.url, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const metrics = await page.evaluate(() => ({
      title: document.title,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      productCards: document.querySelectorAll(".product-card").length,
      imageFailures: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
      bodyText: document.body.innerText.slice(0, 200)
    }));
    if (metrics.scrollWidth > metrics.clientWidth + 1) throw new Error(`${testCase.name} overflows horizontally: ${metrics.scrollWidth} > ${metrics.clientWidth}`);
    if (metrics.imageFailures.length) throw new Error(`${testCase.name} has broken images: ${metrics.imageFailures.join(", ")}`);
    if (pageErrors.length) throw new Error(`${testCase.name} page errors: ${pageErrors.join("; ")}`);
    await page.screenshot({ path: path.resolve(__dirname, "..", "tmp", `${testCase.name}.png`), fullPage: true });
    console.log(JSON.stringify({ name: testCase.name, ...metrics }));
    await page.close();
  }
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
