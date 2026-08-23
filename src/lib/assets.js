import fs from "node:fs/promises";
import path from "node:path";
import { getContentDir, TOOLING_DIRS, TOOLING_FILES } from "@/lib/content-dir.mjs";

/**
 * Walks the repository and returns every publishable asset
 * (anything that is not Markdown and not tooling).
 * Used at build time by AssetGrid.
 */
export async function listAssets() {
  const walk = async (dir, relative = "", acc = []) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const rel = path.posix.join(relative, entry.name);
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!TOOLING_DIRS.has(entry.name)) await walk(abs, rel, acc);
      } else if (!TOOLING_FILES.has(entry.name) && !/\.md$/i.test(entry.name)) {
        const stat = await fs.stat(abs);
        acc.push({
          path: rel,
          name: entry.name,
          ext: path.posix.extname(entry.name).replace(/^\./, ""),
          bytes: stat.size,
        });
      }
    }
    return acc;
  };
  return walk(getContentDir());
}

/**
 * Maps slugified content-collection ids to the real on-disk filenames,
 * e.g. { "migrating": "MIGRATING.md", "10-08-2026/readme": "README.md" }.
 */
export async function listMarkdownNames() {
  const map = new Map();
  const root = getContentDir();
  const walk = async (dir, relative = "") => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const rel = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) {
        if (!TOOLING_DIRS.has(entry.name)) await walk(path.join(dir, entry.name), rel);
      } else if (/\.md$/i.test(entry.name) && !TOOLING_FILES.has(entry.name)) {
        const id = rel
          .replace(/\.(md|markdown)$/i, "")
          .toLowerCase();
        // Ids match on the slugified stem; store by folder + stem.
        const key = id.split("/").pop();
        map.set(`${rel.includes("/") ? rel.replace(/[^/]+$/, "").toLowerCase() : ""}${key}`, entry.name);
      }
    }
    return map;
  };
  return walk(getContentDir());
}
