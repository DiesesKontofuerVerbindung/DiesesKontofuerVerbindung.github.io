/* Native, dependency-free enhancement. The checked-in English HTML is the fallback. */
(() => {
  "use strict";
  const supported = ["en", "de", "zh"];
  const storageKey = "einbaum.language";
  let site;

  function text(key, language) {
    return site.locales[language]?.[key] ?? site.locales.en[key];
  }

  function element(tag, className, content, key) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    if (key) node.dataset.i18n = key;
    return node;
  }

  function safeHref(value) {
    const url = new URL(value, document.baseURI);
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) {
      throw new Error("Unsupported link protocol");
    }
    return value;
  }

  function createBio(language) {
    const fragment = document.createDocumentFragment();
    for (const parts of text(site.profile.bioKey, language)) {
      const paragraph = element("p");
      for (const part of parts) {
        if (typeof part === "string") paragraph.append(part);
        else if (part.em !== undefined) paragraph.append(element("em", "", part.em));
        else {
          const link = element("a", "link", part.text);
          link.setAttribute("href", safeHref(part.href));
          paragraph.append(link);
        }
      }
      fragment.append(paragraph);
    }
    return fragment;
  }

  function createSocials(language) {
    const fragment = document.createDocumentFragment();
    for (const social of site.profile.socials) {
      const row = element("li");
      const link = element("a", "link", text(social.labelKey, language), social.labelKey);
      link.setAttribute("href", safeHref(social.href));
      row.append(link);
      fragment.append(row);
    }
    return fragment;
  }

  function createProjects(language) {
    const fragment = document.createDocumentFragment();
    for (const project of site.projects) {
      const row = element("li", "project reveal");
      row.dataset.project = project.id;
      const link = element("a", "project__link");
      link.setAttribute("href", safeHref(project.href));
      const arrow = element("span", "project__arrow", "↗");
      arrow.setAttribute("aria-hidden", "true");
      link.append(element("h3", "project__title", text(project.titleKey, language), project.titleKey), arrow,
        element("p", "project__desc", text(project.descriptionKey, language), project.descriptionKey));
      const meta = element("div", "project__meta mono");
      const tags = element("ul", "tags");
      for (const tag of project.tags ?? []) tags.append(element("li", "", `[${tag}]`));
      meta.append(tags);
      if (project.year) meta.append(element("span", "project__year", project.year));
      link.append(meta);
      row.append(link);
      fragment.append(row);
    }
    return fragment;
  }

  function render(language) {
    // Construct everything before touching the fallback, so invalid data leaves it intact.
    const bio = createBio(language);
    const socials = createSocials(language);
    const projects = createProjects(language);
    document.querySelector(".hero__name").textContent = site.profile.name;
    // The footer name is plain text too; never interpret profile data as HTML.
    document.querySelector("[data-profile-name]").textContent = site.profile.name;
    document.querySelector("[data-i18n='hero.role']").textContent = text(site.profile.roleKey, language);
    document.querySelector(".hero__bio").replaceChildren(bio);
    document.querySelector(".socials").replaceChildren(socials);
    window.homepageReveal.forget(document.querySelectorAll(".project.reveal"));
    document.querySelector(".projects").replaceChildren(projects);
    document.querySelector("nav").setAttribute("aria-label", text("nav.language", language));
    document.querySelector(".socials").setAttribute("aria-label", text("social.contact", language));
    document.querySelector("[data-i18n='footer.built']").textContent = text("footer.built", language);
    document.documentElement.lang = language;
    document.title = text("meta.title", language);
    document.querySelector("meta[name='description']").content = text("meta.description", language);
    document.querySelectorAll(".lang a").forEach(link => {
      if (link.hreflang === language) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    window.homepageReveal.observe(document.querySelectorAll(".project.reveal"));
  }

  function initialLanguage() {
    const requested = new URL(location.href).searchParams.get("lang");
    if (supported.includes(requested)) return requested;
    try {
      const saved = localStorage.getItem(storageKey);
      if (supported.includes(saved)) return saved;
    } catch { /* Storage may be disabled; language switching still works. */ }
    for (const preference of navigator.languages ?? [navigator.language]) {
      const language = preference.toLowerCase().split("-")[0];
      if (supported.includes(language)) return language;
    }
    return "en";
  }

  function remember(language) {
    try { localStorage.setItem(storageKey, language); } catch { /* Optional persistence. */ }
  }

  async function start() {
    try {
      const response = await fetch("data/site.json", { cache: "no-cache" });
      if (!response.ok) throw new Error(`Site data: HTTP ${response.status}`);
      site = await response.json();
      const language = initialLanguage();
      render(language);
      // Browser-derived defaults are not saved until the user makes an explicit choice.
      if (supported.includes(new URL(location.href).searchParams.get("lang"))) remember(language);
      document.querySelector(".lang").addEventListener("click", event => {
        const link = event.target.closest("a[hreflang]");
        if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        render(link.hreflang);
        remember(link.hreflang);
        try {
          const url = new URL(location.href);
          url.searchParams.set("lang", link.hreflang);
          history.replaceState(null, "", url);
        } catch { /* Sandboxed history must not prevent switching. */ }
      });
    } catch (error) {
      console.warn("Homepage enhancement unavailable; keeping English content.", error);
    }
  }
  start();
})();
