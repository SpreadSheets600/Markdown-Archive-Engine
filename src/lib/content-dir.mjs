import fs from "node:fs";
import path from "node:path";

/**
 * Engine configuration, resolved from (in priority order):
 *   1. Environment variables (CONTENT_DIR, SITE_BASE, SITE_URL)
 *   2. A `.contentdir` file in the engine directory, written by
 *      install.sh / CI. Format - one directive per line:
 *          dir=/path/to/content     (or a bare path line)
 *          base=/repo-name          (GitHub Pages sub-path)
 *          url=https://owner.github.io
 *   3. Defaults (engine checked out at the repo root).
 */

let parsed;

function parseMarkerFile(cwd) {
  const out = { dir: ".", base: undefined, url: undefined };
  try {
    const raw = fs.readFileSync(path.resolve(cwd, ".contentdir"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const m = t.match(/^(dir|base|url)\s*=\s*(.+)$/);
      if (!m) {
        out.dir = t;
      } else if (m[1] === "dir") {
        out.dir = m[2].trim();
      } else if (m[1] === "base") {
        out.base = m[2].trim();
      } else {
        out.url = m[2].trim();
      }
    }
  } catch {}
  return out;
}

function load() {
  if (!parsed) parsed = parseMarkerFile(process.cwd());
  return parsed;
}

export function getContentDir() {
  const cfg = load();
  return path.resolve(cfg.dir || ".");
}

export function getSiteBase() {
  return process.env.SITE_BASE || load().base;
}

export function getSiteUrl() {
  return process.env.SITE_URL || load().url;
}

/** Directories that belong to the engine / tooling, never to content. */
export const TOOLING_DIRS = new Set([
  ".github",
  ".astro",
  ".engine",
  "node_modules",
  "dist",
  "public",
  "src",
  "scripts",
  "template",
  "engine",
]);

export const TOOLING_FILES = new Set([
  ".gitignore",
  "astro.config.mjs",
  "install.sh",
  "package-lock.json",
  "package.json",
  "tsconfig.json",
  ".contentdir",
]);

/** Files that belong to this branch's docs, never to site content. */
export const TOOLING_MARKDOWN = new Set(["ENGINE.md"]);
