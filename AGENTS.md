# AGENTS.md — Playbook for AI Coding Agents

This file is written for autonomous coding agents (Claude Code, Codex,
Cursor, Copilot Workspace, …) that maintain **markdown-archive-engine**
and the content repositories built on it. It encodes everything learned
while building and debugging the engine so you don't rediscover it.

Read this file top-to-bottom before making changes. Follow the
verification checklist before declaring any task done.

---

## 1. System architecture

There are always (at least) two repositories:

| Repo | Branch | Contains |
| --- | --- | --- |
| Content repo (e.g. `Operating-Systems-Programs`) | `main` | Markdown, images, PDFs — nothing else |
| Content repo | `gh-pages` | Build output; written only by CI |
| This engine (`markdown-archive-engine`) | `main` (+ tags `vX.Y.Z`) | Astro site generator |

Data flow on every push to a content repo's `main`:

1. CI checks out the content repo at workspace root.
2. CI checks out this engine into `engine/` (pin `ref:` to a tag in
   production).
3. CI writes `engine/.contentdir` (`dir=..`, `base=/<repo-name>`,
   `url=https://<owner>.github.io`).
4. `npm ci && npm run build` inside `engine/` → `engine/dist/`.
5. `dist/` is force-pushed to the content repo's `gh-pages`.

**Rule:** never commit generated output to `main` of either repo. The
only artifact that lands on a branch is `gh-pages`, produced by CI.

---

## 2. Engine repo map

```
astro.config.mjs          RESOLVED_BASE resolution, Shiki themes, static mirror
src/content.config.ts     glob loader over CONTENT_DIR/**/*.md
src/lib/config.ts         CONTENT_DIR / SITE_BASE / SITE_URL resolution (.contentdir)
src/lib/routes.js         routeForDoc(), withBase(), BASE constant
src/lib/tree.ts           builds the sidebar tree from collection entries
src/lib/assets.js         non-Markdown asset discovery for AssetGrid
src/lib/rehype-md-links.mjs  rewrites .md links → site routes (anchors preserved)
src/components/FileTree.astro   recursive <details> explorer (HTML string builder)
src/components/Header.astro     navbar + search triggers (#search-trigger,
                                #search-trigger-mobile dispatch archive:open-search)
src/components/SearchPalette.tsx cmdk dialog; lazy-loads Pagefind at runtime
src/components/Toc.astro        scroll-spy table of contents
src/layouts/Base.astro          theme boot script, mobile drawer logic, copy buttons
src/styles/global.css           tokens, prose styles, code-block CSS (see §5)
install.sh                      scaffolder for new content repos
template/workflow.yml           canonical CI workflow
```

---

## 3. Local development loop

```bash
# one-time: engine sits next to content
git clone https://github.com/SpreadSheets600/markdown-archive-engine .engine
cd .engine && npm install

printf 'dir=..\nbase=/Operating-Systems-Programs\nurl=https://spreadsheets600.github.io\n' > .contentdir

npm run build            # astro build && pagefind --site dist
npm run preview          # or serve dist/ behind the base path
```

**Gotcha:** `SITE_BASE` must be simulated when testing locally. Serving
`dist/` at `/` while pages were built with `base=/repo` breaks asset URLs.
Either symlink `dist` under the base path:

```bash
mkdir -p /tmp/www && ln -s "$PWD/dist" /tmp/www/Operating-Systems-Programs
python3 -m http.server 4326 --directory /tmp/www
```

or rebuild with `SITE_BASE= npx astro build` for root-relative serving.

---

## 4. Known pitfalls (each of these caused a real production bug)

### 4.1 Pagefind ≥ 1.4 has no default export
```ts
// WRONG — undefined at runtime, Vite also wraps it in __vitePreload
const pf = (await import("/pagefind/pagefind.js")).default;

// RIGHT — named exports, native import
const pf = await import(/* @vite-ignore */ `${BASE}/pagefind/pagefind.js`);
const options = await pf.options({ basePath: BASE });
const res = await pf.search(query);
await pf.options({ basePath: BASE }); // once, before first search()
```
Keep `@vite-ignore` on the dynamic import or the preload wrapper rewrites
the URL and the module fails to load. Always deploy via `npm run build`
so the `pagefind --site dist` step runs — a bare `astro build` produces a
site where search reports "index unavailable".

### 4.2 Shiki dual-theme output shape (light theme "loses" highlighting)
Astro emits light colors as **inline `color:` styles** plus only a
`--shiki-dark` variable on each span, with classes
`github-light github-dark`. Therefore:

- Light mode needs **no CSS overrides** — inline styles are correct.
- Dark mode switches via:
  ```css
  .dark .doc-prose .astro-code { background-color: var(--shiki-dark-bg,#24292e) !important; }
  .dark .doc-prose .astro-code span {
    color: var(--shiki-dark) !important;
    font-weight: var(--shiki-dark-font-weight, inherit);
  }
  ```
- Never write `color: var(--shiki-light)` overrides — that variable is
  not emitted, and `!important` on an empty var wipes all token colors.

### 4.3 Tailwind v4 `translate` property vs inline `transform`
TW4's `-translate-x-full` compiles to the standalone CSS `translate`
property. Inline `el.style.transform = "translateX(0)"` does NOT override
it — both apply and compose, so panels stay hidden. Drive drawer/dialog
positioning through data attributes + CSS instead:

```css
[data-drawer-panel] { translate: -100% 0; transition: translate .25s ease; }
[data-drawer-panel][data-open] { translate: 0 0; }
```

### 4.4 The readme route
The root README's collection id is the bare string `"readme"` and must
map to `/`. The regex needs to match with *or without* a leading slash:

```js
stem.replace(/(^|\/)readme$/i, "")   // ✓ handles "readme" and "notes/readme"
```

A regression here surfaces as a homepage link to `/repo/readme` → 404.

### 4.5 Base path is single-sourced
`RESOLVED_BASE` in `astro.config.mjs` flows to Astro `base`, the
rehype-md-links plugin, and client code (via injected constant). Never
hardcode `/repo-name` anywhere else. All internal hrefs go through
`withBase()`.

### 4.6 Radix Dialog portals escape Astro islands' scope
SearchPalette renders into a portal at `<body>` end. Any global CSS it
needs must live in `global.css` (or be carried by TW utilities), not in
scoped component styles.

---

## 5. Conventions

- **Icons:** lucide only (`lucide-react`; inline lucide SVG paths in
  `.astro` templates). No emoji-as-icons, no other icon sets.
- **Color:** pure shadcn/ui neutral tokens (`background`, `foreground`,
  `muted`, `border`, …). No bespoke palette colors in components.
- **Code blocks:** `white-space: pre` (never wrap), ligatures off,
  copy button shown on pane hover via CSS, right padding reserved so the
  button never covers text.
- **Search UI:** borderless input row, result rows show title → clamped
  excerpt with `<mark>` highlights → mono path line.
- **Content repos:** docs live in their README/MIGRATING.md; keep them in
  sync when engine behavior changes (e.g., we removed the `$` prompt —
  update the docs the same release).

---

## 6. Verification checklist (run before every push)

Build must pass with zero errors and index the full corpus:

```bash
cd .engine && rm -rf dist .astro
SITE_BASE=/Operating-Systems-Programs npx astro build   # or your repo's base
npx pagefind --site dist      # expect "Indexed N pages", N = doc count
```

Then drive a real browser (Playwright/Puppeteer). Minimum assertions:

1. Homepage loads; no console errors; no failed requests.
2. Sidebar link to README navigates to `/` (not `/readme`).
3. Click header search button → dialog opens.
4. Type a known term → results render (wait ≥ 2–3 s for the wasm index).
5. Press Enter on a result → lands on that document (HTTP 200).
6. Ctrl/Cmd+K opens the palette.
7. Desktop: sidebar collapse toggle works.
8. Mobile viewport (≤ 768 px): hamburger opens sheet; panel visibly
   slides in (`x == 0`); its search button opens the palette.
9. Both themes: open any code block, confirm multiple distinct computed
   token colors (e.g. `getComputedStyle(span).color`) in light AND dark.
10. Multi-line fenced blocks render one line per visual row, no wrapping.

Suggested harness: headless Chromium + `localStorage['archive-theme']`
for theme forcing. Keep the script next to you while iterating; rerun
after every change.

---

## 7. Migration recipes

### 7.1 Migrate an existing Markdown repo to the engine
1. Ensure `main` contains only content (move tooling elsewhere or delete;
   add `.gitignore` for `.engine/`, `dist/`, `.astro/`).
2. Copy `template/workflow.yml` → `.github/workflows/docs.yml`.
3. Root `README.md` becomes the homepage — give it one `#` heading and
   curate links/index tables there.
4. Push `main`; enable Pages from `gh-pages`. Done — links rewrite
   automatically, assets get preview cards, search indexes everything.

### 7.2 Upgrade a content repo to a new engine version
1. Read this file's §4 against the new tag; check `git log vX..vY` for
   behavior changes.
2. Update the pinned `ref:` in the content repo's workflow (or leave
   floating on `main` during development).
3. Re-run the CI workflow manually (`workflow_dispatch`) and verify with
   §6's checklist against the live URL before moving on.

### 7.3 Release a new engine version (maintainers/agents)
1. Make fixes in small, logical commits ("batch pushes").
2. Bump/verify docs: this file, `README.md`, and any affected content-repo
   docs.
3. Tag: `git tag vX.Y.Z && git push origin main vX.Y.Z`.
4. Trigger dependent content repos' workflows and verify live.

---

## 8. Debugging discipline

When production misbehaves:

1. **Reproduce locally first** — same build command, same base path
   simulation (§3). Most "deploy bugs" are base-path mismatches.
2. **Inspect emitted HTML**, not just rendered pixels: `grep` the built
   files for hrefs/classes/style attributes. Several bugs (§4.2, §4.4)
   are invisible in screenshots but obvious in markup.
3. **Check computed styles** in the browser for CSS-variable failures —
   an invalid `var()` silently falls back to inheritance.
4. One hypothesis per fix; verify with the §6 checklist after each.
