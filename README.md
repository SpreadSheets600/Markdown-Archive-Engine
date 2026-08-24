# Markdown Archive Engine

A content-agnostic site engine that turns any folder of Markdown into a
polished documentation website - Astro + React + shadcn/ui, with a
file-tree explorer, ⌘K full-text search, syntax-highlighted code panes,
and light/dark theming.

**Your content never lives here.** This repository is the generator;
content repositories hold Markdown + assets on their `main` branch and
consume this engine at build time via GitHub Actions.

```
content repo (main)  ──build──▶  gh-pages branch  ──▶  GitHub Pages
        ▲                                │
        └──── checks out this engine ────┘
```

## Quick start (new project)

One command scaffolds a complete, deploy-ready archive repository:

```bash
curl -fsSL \
  https://raw.githubusercontent.com/SpreadSheets600/markdown-archive-engine/main/install.sh \
  | bash -s -- my-new-archive
```

The installer creates `my-new-archive/` containing:

- a **content-only `main` branch** (starter README, `.gitignore`, CI workflow)
- the engine fetched into an ignored `.engine/` folder for local preview
- a GitHub Actions workflow that builds and publishes to Pages on every push

Then:

```bash
cd my-new-archive
git init -b main && git add -A && git commit -m "init"
git remote add origin git@github.com:<you>/my-new-archive.git
git push -u origin main          # site builds automatically
# enable GitHub Pages → Source: "Deploy from a branch" → gh-pages
```

## Local development

Inside a scaffolded project (or any checkout where the engine sits in a
subfolder next to your Markdown):

```bash
cd .engine
npm install
npm run dev      # live preview - reads content from ..
npm run build    # astro build + pagefind index → dist/
npm run preview  # serve the built output
```

### Content root resolution

The engine finds your Markdown through, in order of precedence:

1. `CONTENT_DIR` / `SITE_BASE` / `SITE_URL` environment variables
2. a `.contentdir` marker file inside the engine checkout:

   ```ini
   dir=..                                  # path to content, relative to engine
   base=/my-new-archive                    # URL base path (repo name for project pages)
   url=https://you.github.io               # origin (omit trailing slash)
   ```

3. defaults (engine's own parent directory)

`base` must be set for project sites (`/<repo-name>`); leave it empty or
set `/` for user/org sites served at the domain root.

## Using an existing repository

Any GitHub repo whose `main` holds Markdown can adopt the engine without
the installer:

1. Copy [`template/workflow.yml`](template/workflow.yml) into your repo as
   `.github/workflows/docs.yml`.
2. Enable GitHub Pages from the `gh-pages` branch.

That's it - the workflow checks out this repository directly. Pin `ref:`
to a tag (e.g. `v1`) to freeze the engine version. No content changes are
required: relative `.md` links between documents are rewritten to site
routes automatically at build time, anchors included.

## What you get

| Feature | Notes |
| --- | --- |
| File-tree explorer | Collapsible sidebar, persisted state, active-page highlight; sheet drawer on mobile |
| Full-text search | Pagefind index built at deploy time; ⌘K / Ctrl+K, header & mobile buttons, highlighted excerpts |
| Code blocks | Shiki dual-theme highlighting (github-light / github-dark), copy buttons, no line wrapping |
| Theming | Pure shadcn/ui neutral palette, light/dark/system toggle, Phosphor icons only |
| Navigation | Scroll-spy TOC, breadcrumbs, prev/next links, custom 404 |
| Assets | Images/PDFs/archives copied into the tree as rich preview cards |
| Homepage | The root `README.md` renders as `/`; it doubles as the repo README |

### Content rules

- Root `README.md` = homepage (and GitHub README).
- Every other `*.md` gets its own page mirroring its folder path.
- Link between documents with normal Markdown paths:
  `[notes](notes/sorting.md)` or `[section](notes/sorting.md#complexity)`.
- Fenced code blocks support any Shiki language tag.
- Tables, images, lists, blockquotes, inline code are fully styled by the
  theme (`src/styles/global.css`).

## Repository layout

```
astro.config.mjs        Astro config; mirrors non-Markdown files into dist
src/content.config.ts   Content collection over every *.md in CONTENT_DIR
src/lib/                Routing, tree building, md-link rewriting, config
src/components/         Header, FileTree, Toc, AssetGrid, SearchPalette…
src/layouts/Base.astro  Shell: theme boot script, drawer, copy-button wiring
src/styles/global.css   Design tokens + prose/code-block styles
public/                 Favicon
install.sh              One-shot scaffolder for new archives
template/workflow.yml   CI workflow copied into new projects
AGENTS.md               Playbook for AI coding agents working on this repo
```

## Configuration reference

| Variable | Purpose | Example |
| --- | --- | --- |
| `CONTENT_DIR` | Absolute/relative path to the Markdown root | `..` |
| `SITE_BASE` | Base path baked into all routes/links | `/my-new-archive` |
| `SITE_URL` | Deployment origin, used for canonical URLs/sitemap | `https://you.github.io` |

## Troubleshooting

**404 on every page after deploying** - `base` doesn't match the repo
name, or Pages serves from the wrong branch. Re-check `.contentdir` /
workflow env and Pages settings.

**Search says "index unavailable"** - the deploy ran `astro build`
without the Pagefind step. Always deploy with `npm run build` (it chains
`pagefind --site dist`).

**Links break when I move a file** - update the Markdown links pointing
at it; routes mirror folder structure exactly.

**Local dev shows old content** - the engine caches Astro's content
layer; delete `.astro/` and restart `npm run dev`.

## Versioning & releases

The engine tags releases (`v1.0.0`, `v1.0.2`, …). Content workflows can
pin `ref:` to a tag or major (`v1`) so engine updates never surprise a
live site. See `AGENTS.md` for the release procedure.

## License

MIT - see [LICENSE](LICENSE).
