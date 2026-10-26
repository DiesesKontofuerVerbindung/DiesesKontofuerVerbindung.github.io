# DESIGN.md — Einbaum homepage

This file is the visual contract for the site. The static prototype (`index.html` + `styles.css`) is the reference implementation. Whoever adds behaviour (i18n, data, deploy) should **add logic without changing the visual decisions below**. If something visual must change, change the token in `styles.css :root`, not individual rules.

## Approved refinement — 2026-10-26

The user selected the existing hands-and-leaves composition and requested longer
body copy. These scoped additions override the original no-image rule and
short-copy guidance; all other decisions below remain in force:

- `div.corner-art[aria-hidden="true"] > img` displays the selected artwork at the
  page's upper-right corner. Preserve the original source bytes and its muted
  botanical colors. The illustration is the only exception to the two-green
  palette; text, links and interface accents keep the existing tokens.
- Crop the composition through a layout container to show its upper-right
  branches and clasped hands. At desktop widths the entire container stays in
  the outer margin; narrow screens reserve a separate band above navigation.
  The artwork is static, decorative, pointer-transparent and never covers copy.
- The hero may contain three fuller paragraphs. Personal facts must remain
  sourced from the user; research questions are draft framing, not completed work.
- A project may add `p.project__detail` after `p.project__desc` and before the meta
  row, inside the existing whole-row link. The short description stays one sentence;
  the optional detail adds source-backed context in the body font.
- New sizing and spacing controls live in `styles.css :root`. Keep the white
  background, existing fonts, single cursor and original text palette.
- The user requested a research word constellation: `div.research-map` between
  the role line and bio, with `h2.research-map__focus` reading **AGENT SECURITY** in
  Noto Serif SC and six smaller related technical labels distributed around it.
  Use static, selectable text, existing colors and tokenized positions; keep all
  terms separated at 320px and wider. The labels indicate the research landscape,
  not completed work or claimed qualifications. No extra cursor or looping motion.

---

## 1. Principles

1. **White page, black text, a little green.** Green covers ≤ 10 % of what you see. Never use it for large fills.
2. **Typography does the work.** No images, no icons, no cards, no shadows.
3. **Terminal as seasoning.** Monospace only for small labels: `~/` prefixes, tags, years, the language switcher, contact links, footer. Body copy and titles are never monospace.
4. **One blinking cursor on the page**, after the role line in the hero. Do not add more.
5. **Quiet motion.** Hover feedback and a one-time fade-in. Nothing loops except the cursor.

---

## 2. Color tokens

| Token | Value | Use |
|---|---|---|
| `--c-bg` | `#ffffff` | Page background. Light mode only — there is **no dark mode**. |
| `--c-text` | `#0a0a0a` | Headings, body text |
| `--c-muted` | `#5c5c5c` | Role line, project descriptions |
| `--c-faint` | `#9a9a9a` | Tags, years, inactive languages, footer |
| `--c-line` | `#ececec` | Hairline dividers |
| `--c-accent` | `#10b981` | **Decoration only**: cursor, underlines, hover dots, selection, focus ring |
| `--c-accent-text` | `#047857` | **Green text**: links, `~/` and `>` prompts, active language, hovered tags/arrow |
| `--c-accent-wash` | `#ecfdf5` | Reserved for a pale green background if one is ever needed |

**Rule:** never set text in `--c-accent` (#10b981 is ~2.5:1 on white and fails contrast). Text that should look green uses `--c-accent-text` (~5.5:1).

---

## 3. Typography

| Role | Family | Weight | Size token |
|---|---|---|---|
| Name (h1) | Noto Serif SC | 600 | `--fs-display` (40–56px fluid) |
| Project title (h3) | Noto Serif SC | 600 | `--fs-title` (20px) |
| Body / bio | Noto Sans SC | 400, 500 for `<em>` | `--fs-body` (17px) |
| Project description | Noto Sans SC | 400 | `--fs-small` (15px) |
| Labels, tags, nav, footer | JetBrains Mono | 400, 500 for active lang | `--fs-mono` (13px) |

- Loaded from Google Fonts (one `<link>` in `<head>`). Noto SC fonts cover Latin, German umlauts/ß and Chinese, so all three languages render in the same family.
- Line-height: `--lh-tight` (1.15) for the name, `--lh-body` (1.7) for text.
- `hyphens: auto` is on `body` for long German compounds. **Keep `<html lang>` correct** (`en` / `de` / `zh`) when switching language — hyphenation and CJK line breaking depend on it.
- `<em>` is rendered as weight 500, not italic (CJK has no italic).

---

## 4. Layout & spacing

- Single centered column, content width `--w-content: 680px`, side gutter `--gutter` (16–24px).
- Spacing scale on a 4px base: `--s-1` … `--s-24`. Use tokens only.
- Vertical rhythm, top to bottom:

```
topbar          padding-top s-8
hero            padding s-24 top / s-16 bottom   (s-16 / s-12 under 480px)
  role          s-4 under name
  bio           s-8 under role, max-width 34em
  socials       s-8 under bio
section         padding s-8 top / s-16 bottom
  label         s-6 under
  project row   padding s-6 vertical, hairline above/below
footer          padding s-8 top / s-12 bottom
```

---

## 5. Components

Class names are part of the contract — keep them when generating markup from data.

### Top bar — `header.topbar.mono`
- Left: `<span class="prompt">~/</span>einbaum`
- Right: `nav > ul.lang > li > a`. Order **EN / DE / 中**. The active one has `aria-current="true"` (green, weight 500); others are faint. Separators are drawn by CSS, don't add them in markup.

### Hero — `section.hero`
- `h1.hero__name` — the name, nothing else.
- `p.hero__role.mono` — `<span class="prompt">&gt;</span>` + role text + `<span class="cursor" aria-hidden="true"></span>`. The cursor must stay the last child.
- `div.hero__bio` — 1–3 short `<p>`. Inline links use `a.link`.
- `ul.socials.mono` — 3–5 text links (`a.link`). No icons. A green dot appears in the left margin on hover.

### Inline link — `a.link`
Green text (`--c-accent-text`), and on hover a 1px `--c-accent` underline grows from left to right.

### Section label — `h2.section__label.mono`
`<span class="prompt">~/</span>name`. Lowercase, path-like (`~/projects`).

### Project row — `li.project > a.project__link`
```html
<li class="project reveal">
  <a class="project__link" href="…">
    <h3 class="project__title">Title</h3>
    <span class="project__arrow" aria-hidden="true">↗</span>
    <p class="project__desc">One sentence.</p>
    <div class="project__meta mono">
      <ul class="tags"><li>[python]</li><li>[pytorch]</li></ul>
      <span class="project__year">2026</span>
    </div>
  </a>
</li>
```
- The whole row is one link.
- Tags are lowercase and wrapped in square brackets, written in the markup: `[rust]`.
- Hover: a 2px green underline grows under the title, the arrow turns green and moves 3px up and to the right, and the tags turn green.
- Description should stay to one sentence (≤ ~110 chars in EN; German may run longer, wrapping is fine).

### Footer — `footer.footer.mono`
`© YEAR Einbaum · built with <span class="heart">♥</span>`

---

## 6. Motion

| What | Spec |
|---|---|
| Hover transitions | `--t-fast` 160ms, `--ease` |
| Cursor blink | 1.1s, `steps(1)` |
| Reveal on scroll | Elements with `.reveal` fade in and move up 12px over `--t-slow` (600ms), once. The IntersectionObserver script at the bottom of `index.html` does this. |
| Reduced motion | `prefers-reduced-motion: reduce` turns off all of the above. Keep this. |

Content is visible without JS, because the hiding only applies under the `.js` class on `<html>`. If you render content dynamically, add `.reveal` to new elements **and** observe them; otherwise leave `.reveal` off.

---

## 7. i18n hooks (for the implementer)

- Default language: **English**. Also offered: **Deutsch**, **中文**.
- Translatable nodes in the prototype carry `data-i18n="key"` (e.g. `hero.role`, `hero.bio`). Extend this pattern for the rest of the text; the mechanism is up to you (separate pages `/de/`, `/zh/`, or JSON + JS).
- When switching language: update `<html lang>`, move `aria-current="true"`, and update `<title>` and the meta description.
- The name "Einbaum", `~/` paths, tags and years are **not** translated.

---

## 8. Don'ts

- No dark mode, gradients, shadows, rounded cards or emoji.
- No extra accent colors. If you need a "warning" or "new" state, use weight or `--c-accent-text`, not a new color.
- No second blinking cursor, no typewriter effect on the name, no parallax.
- Don't put body copy in monospace or headings in sans.
- Don't hard-code colors or spacing in rules. Use tokens.
