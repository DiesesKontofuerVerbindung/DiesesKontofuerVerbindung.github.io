/* Optional integration tests: use an existing Playwright installation, never npm install. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/site.json"), "utf8"));
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, bytes) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader("Content-Type", file.endsWith(".js") ? "application/javascript" : file.endsWith(".json") ? "application/json" : file.endsWith(".css") ? "text/css" : "text/html; charset=utf-8");
    res.end(bytes);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({ locale: "en-US" });
    await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    async function checkLanguage(language) {
      await page.waitForFunction(lang => document.documentElement.lang === lang && document.querySelector(".hero__role").textContent.includes("Agent Security"), language);
      assert.equal(await page.title(), data.locales[language]["meta.title"]);
      assert.equal(await page.locator("meta[name=description]").getAttribute("content"), data.locales[language]["meta.description"]);
      assert.equal(await page.locator(".lang a[aria-current=true]").count(), 1);
      assert.equal(await page.locator(".lang a[aria-current=true]").getAttribute("hreflang"), language);
      assert.equal(await page.locator(".hero__name").innerText(), data.profile.name);
      assert.equal(await page.locator("[data-profile-name]").innerText(), data.profile.name);
      assert.equal(await page.locator(".project").count(), data.projects.length);
      assert.equal(await page.locator(".cursor").count(), 1);
      assert.equal(await page.locator(".hero__role > :last-child").getAttribute("class"), "cursor");
      assert.equal(await page.locator(".hero__bio em").count(), 1);
      assert.equal(await page.locator(".hero__bio a.link").count(), 1);
      assert.equal(await page.locator("nav").getAttribute("aria-label"), data.locales[language]["nav.language"]);
      assert.equal(await page.locator(".socials").getAttribute("aria-label"), data.locales[language]["social.contact"]);
      for (let index = 0; index < data.projects.length; index++) {
        const project = data.projects[index];
        const row = page.locator(".project").nth(index);
        assert.equal(await row.locator(":scope > a.project__link").count(), 1);
        assert.equal(await row.locator(".project__title").innerText(), data.locales[language][project.titleKey]);
        assert.equal(await row.locator(".project__desc").innerText(), data.locales[language][project.descriptionKey]);
        assert.deepEqual(await row.locator(".tags li").allTextContents(), project.tags.map(tag => `[${tag}]`));
        if (project.year) assert.equal(await row.locator(".project__year").innerText(), project.year);
        else assert.equal(await row.locator(".project__year").count(), 0);
        await row.scrollIntoViewIfNeeded();
        await page.waitForFunction(id => document.querySelector(`[data-project='${id}']`).classList.contains("is-visible"), project.id);
      }
    }
    await page.goto(url);
    await checkLanguage("en");
    for (const language of ["de", "zh", "en"]) {
      await page.locator(`.lang a[hreflang=${language}]`).click();
      await checkLanguage(language);
      assert.equal(await page.evaluate(() => localStorage.getItem("einbaum.language")), language);
    }
    await page.locator(".lang a[hreflang=de]").click();
    await page.goto(url); // Stored selection without a query string.
    await checkLanguage("de");
    await page.goto(url + "?lang=zh"); // Explicit URL wins over storage.
    await checkLanguage("zh");
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const language of ["en", "de", "zh"]) {
        await page.locator(`.lang a[hreflang=${language}]`).click();
        await checkLanguage(language);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${language}/${width} overflows`);
        if (process.env.SCREENSHOT_DIR && [360, 1440].includes(width)) {
          fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
          await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `${language}-${width}.png`), fullPage: true });
        }
      }
    }
    assert.deepEqual(errors, []);
    await context.close();

    for (const [locale, language] of [["de-DE", "de"], ["zh-TW", "zh"], ["fr-FR", "en"]]) {
      const context = await browser.newContext({ locale });
      await context.route(/fonts\./, route => route.abort());
      const page = await context.newPage();
      await page.goto(url + "?lang=invalid");
      await page.waitForFunction(lang => document.documentElement.lang === lang && document.querySelector(".hero__role").textContent.includes("Agent Security"), language);
      await context.close();
    }

    for (const failure of ["no-js", "no-data", "no-script", "invalid-data", "no-storage-and-observer"]) {
      const context = await browser.newContext({ locale: "de-DE", javaScriptEnabled: failure !== "no-js", reducedMotion: "reduce" });
      await context.route(/fonts\./, route => route.abort());
      if (failure === "no-data") await context.route("**/data/site.json", route => route.abort());
      if (failure === "no-script") await context.route("**/site.js", route => route.abort());
      if (failure === "invalid-data") await context.route("**/data/site.json", route => route.fulfill({ contentType: "application/json", body: "{}" }));
      if (failure === "no-storage-and-observer") await context.addInitScript(() => {
        delete window.IntersectionObserver;
        Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
      });
      const page = await context.newPage();
      await page.goto(url);
      if (failure === "no-storage-and-observer") {
        await page.waitForFunction(() => document.documentElement.lang === "de");
        await page.locator(".lang a[hreflang=zh]").click();
        assert.equal(await page.locator("html").getAttribute("lang"), "zh");
        assert.equal(await page.locator(".project.is-visible").count(), data.projects.length);
      } else {
        assert.equal(await page.locator("html").getAttribute("lang"), "en");
        assert.equal(await page.locator(".project").count(), data.projects.length);
        assert.ok((await page.locator(".hero__bio").textContent()).includes("Agent Security"));
      }
      assert.equal(await page.locator(".cursor").evaluate(node => getComputedStyle(node).animationName), "none");
      assert.equal(await page.locator(".project").first().evaluate(node => getComputedStyle(node).opacity), "1");
      await context.close();
    }
    console.log("PASS: EN/DE/中, metadata, persistence, URL/browser priority, class contract, reveal, 3 widths, no-JS/data/script, invalid data, blocked storage, no observer, reduced motion.");
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
