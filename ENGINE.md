# Markdown Archive — Site Engine

This branch contains the **site engine only**: an Astro + React + shadcn/ui
generator that turns a folder of Markdown into a polished documentation
site. Your content never lives here.

- **`main` branch** → Markdown content + assets only
- **`engine` branch** (this one) → the generator
- **`gh-pages` branch** → build output, published by GitHub Actions

## One-shot bootstrap (new project)

Scaffold a fresh archive repository anywhere:

```bash
curl -fsSL \
  https://raw.githubusercontent.com/SpreadSheets600/Operating-Systems-Programs/engine/install.sh \
  | bash -s -- my-new-archive
```

The installer creates `my-new-archive/` with a content-only `main`
branch, fetches this engine into `.engine/` (git-ignored), and wires up
the GitHub Actions workflow. Write Markdown, push `main`, done.

## Local development

Inside a scaffolded project (or a checkout where the engine sits in a
subfolder next to the content):

```bash
cd .engine          # or the engine checkout root
npm install
npm run dev         # live preview — reads content from ..
npm run build       # astro build + pagefind  -> dist/
```

The engine discovers its content root from `.contentdir`
(`dir=..`, optional `base=/repo-name`, `url=https://owner.github.io`)
or the `CONTENT_DIR` / `SITE_BASE` / `SITE_URL` environment variables.

## Layout of this branch

```
astro.config.mjs      Astro config; mirrors non-Markdown files into dist
src/content.config.ts Content collection: every *.md under CONTENT_DIR
src/lib/              Routing, tree building, link rewriting, config
src/components/       Header, FileTree, Toc, AssetGrid, Search palette
src/pages/            index, [...slug], 404
public/               favicon
install.sh            One-shot scaffolder for new archives
template/workflow.yml CI workflow copied into new projects
```

## Features

- Pure shadcn/ui neutral theme, light/dark/system, lucide icons
- Collapsible sidebar explorer (persisted) + mobile sheet drawer
- ⌘K full-text search (Pagefind index built at deploy time)
- Syntax-highlighted code panes with copy buttons (Shiki)
- Scroll-spy table of contents, rich asset preview cards,
  prev/next navigation, breadcrumbs, 404 page

## Reuse for other projects

Any GitHub repo whose `main` holds Markdown can adopt this engine:

1. Push this `engine` branch to your repo.
2. Copy `template/workflow.yml` to `.github/workflows/docs.yml`.
3. Enable GitHub Pages from the `gh-pages` branch.

No content changes required — relative `.md` links between documents are
rewritten automatically at build time.
