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
    res.setHeader("Content-Type", file.endsWith(".png") ? "image/png" : file.endsWith(".js") ? "application/javascript" : file.endsWith(".json") ? "application/json" : file.endsWith(".css") ? "text/css" : "text/html; charset=utf-8");
    res.end(bytes);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({ locale: "en-US" });
    if (process.env.ALLOW_WEB_FONTS !== "1") {
      await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
    }
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    async function checkLanguage(language) {
      await page.waitForFunction(lang => document.documentElement.lang === lang && document.querySelector(".hero__role").textContent.includes("Agent Security"), language);
      if (process.env.ALLOW_WEB_FONTS === "1") await page.evaluate(() => document.fonts.ready);
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
      assert.equal(await page.locator(".hero__bio a.link").count(), data.locales[language]["hero.bio"].flat().filter(part => typeof part === "object" && part.href).length);
      assert.ok((await page.locator(".hero__bio").textContent()).includes("KIT"));
      assert.equal(await page.locator(".hero__bio p").count(), 3);
      assert.equal(await page.locator(".research-map").getAttribute("aria-label"), data.locales[language]["research.label"]);
      assert.equal(await page.locator(".research-map__focus").innerText(), data.research.focus);
      assert.deepEqual(await page.locator(".research-map__topic").allTextContents(), data.research.topics);
      assert.ok((await page.locator(".research-map__focus").evaluate(node => getComputedStyle(node).fontFamily)).includes("Noto Serif SC"));
      const mapBounds = await page.locator(".research-map").boundingBox();
      assert.ok(mapBounds.width <= 512.5 && mapBounds.height <= 192.5, "Research composition must stay compact");
      const termBounds = await page.locator(".research-map__focus, .research-map__topic").evaluateAll(nodes => nodes.map(node => {
        const bounds = node.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
      }));
      for (const [first, second] of [[1, 2], [3, 6], [4, 5]]) {
        assert.ok(Math.abs(termBounds[first].top - termBounds[second].top) < 0.5, "Editorial side notes must share baselines");
      }
      assert.ok(Math.abs((termBounds[0].left + termBounds[0].right) / 2 - (mapBounds.x + mapBounds.width / 2)) < 0.5, "Research headline must stay horizontally centered");
      for (let index = 0; index < termBounds.length; index++) {
        const term = termBounds[index];
        assert.ok(term.left >= mapBounds.x && term.right <= mapBounds.x + mapBounds.width + 0.5, "Research term overflows horizontally");
        assert.ok(term.top >= mapBounds.y && term.bottom <= mapBounds.y + mapBounds.height + 0.5, "Research term overflows vertically");
        for (const other of termBounds.slice(index + 1)) {
          assert.ok(term.right <= other.left || other.right <= term.left || term.bottom <= other.top || other.bottom <= term.top, "Research labels overlap");
        }
      }
      assert.equal(await page.locator(".socials a[href='mailto:einbaumvon@gmail.com']").innerText(), "Gmail");
      assert.equal(await page.locator(".socials a").first().getAttribute("href"), "https://github.com/DiesesKontofuerVerbindung");
      assert.equal(await page.locator(".corner-art").getAttribute("aria-hidden"), "true");
      assert.equal(await page.locator(".corner-art img").getAttribute("alt"), "");
      await page.waitForFunction(() => {
        const image = document.querySelector(".corner-art img");
        return image.complete && image.naturalWidth === 1800 && image.naturalHeight === 1100;
      });
      const ornament = await page.locator(".corner-art").evaluate(node => ({
        pointerEvents: getComputedStyle(node).pointerEvents,
        animation: getComputedStyle(node).animationName
      }));
      assert.equal(ornament.pointerEvents, "none");
      assert.equal(ornament.animation, "none");
      const artBounds = await page.locator(".corner-art").boundingBox();
      const navBounds = await page.locator("nav").boundingBox();
      const bioBounds = await page.locator(".hero__bio").boundingBox();
      if (page.viewportSize().width >= 1200) {
        assert.ok(artBounds.x >= navBounds.x + navBounds.width);
        assert.ok(artBounds.x >= bioBounds.x + bioBounds.width);
      } else {
        assert.ok(artBounds.y + artBounds.height <= navBounds.y);
      }
      assert.equal(await page.locator("nav").getAttribute("aria-label"), data.locales[language]["nav.language"]);
      assert.equal(await page.locator(".socials").getAttribute("aria-label"), data.locales[language]["social.contact"]);
      for (let index = 0; index < data.projects.length; index++) {
        const project = data.projects[index];
        const row = page.locator(".project").nth(index);
        assert.equal(await row.locator(":scope > a.project__link").count(), 1);
        assert.equal(await row.locator(".project__title").innerText(), data.locales[language][project.titleKey]);
        assert.equal(await row.locator(".project__desc").innerText(), data.locales[language][project.descriptionKey]);
        if (project.detailKey) assert.equal(await row.locator(".project__detail").innerText(), data.locales[language][project.detailKey]);
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
    for (const width of [320, 360, 768, 1200, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const language of ["en", "de", "zh"]) {
        await page.locator(`.lang a[hreflang=${language}]`).click();
        await checkLanguage(language);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${language}/${width} overflows`);
        if (process.env.SCREENSHOT_DIR && [360, 1440].includes(width)) {
          fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
          await page.waitForFunction(() => [...document.querySelectorAll(".project")].every(node => Number(getComputedStyle(node).opacity) >= 0.999));
          await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `${language}-${width}.png`), fullPage: true });
          if (language === "en" && width === 1440) {
            await page.locator(".research-map").screenshot({ path: path.join(process.env.SCREENSHOT_DIR, "research-map.png") });
          }
        }
      }
    }
    if (process.env.ALLOW_WEB_FONTS === "1") {
      assert.ok(await page.evaluate(() => [...document.fonts].some(font => font.family.includes("Noto Serif SC") && font.status === "loaded")), "Noto Serif SC did not load");
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
        assert.equal(await page.locator(".research-map__focus").innerText(), data.research.focus);
        assert.equal(await page.locator(".research-map__topic").count(), 6);
      }
      assert.equal(await page.locator(".cursor").evaluate(node => getComputedStyle(node).animationName), "none");
      assert.equal(await page.locator(".project").first().evaluate(node => getComputedStyle(node).opacity), "1");
      await context.close();
    }
    console.log("PASS: EN/DE/中, metadata, persistence, URL/browser priority, class contract, reveal, corner illustration, 5 widths, no-JS/data/script, invalid data, blocked storage, no observer, reduced motion.");
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
