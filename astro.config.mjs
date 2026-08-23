import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getContentDir, getSiteBase, getSiteUrl, TOOLING_DIRS, TOOLING_FILES } from "./src/lib/content-dir.mjs";

const src = fileURLToPath(new URL("./src", import.meta.url));
const CONTENT_DIR = getContentDir();
// Single source of truth for the site base path.
const RESOLVED_BASE =
  process.env.SITE_BASE ||
  getSiteBase() ||
  "/Operating-Systems-Programs";

/**
 * Everything that is not Markdown and not tooling is treated as an
 * asset: it is copied verbatim into the build output so relative
 * links inside documents (images, PDFs, datasets, ...) keep working.
 */
async function walkAssets(dir, relative = "", acc = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const rel = path.posix.join(relative, entry.name);
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!TOOLING_DIRS.has(entry.name)) await walkAssets(abs, rel, acc);
    } else if (!TOOLING_FILES.has(entry.name) && !/\.md$/i.test(entry.name)) {
      acc.push({ relative: rel, absolute: abs });
    }
  }
  return acc;
}

/**
 * Copies every repository asset into the build output so documents can
 * reference images / PDFs / any file format with plain relative links.
 */
function mirrorAssets() {
  return {
    name: "mirror-assets",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const assets = await walkAssets(CONTENT_DIR);
        for (const asset of assets) {
          const target = path.join(dir.pathname, decodeURI(asset.relative));
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.copyFile(asset.absolute, target);
        }
        logger.info(`Mirrored ${assets.length} asset(s) into the build.`);
      },
    },
  };
}

export default defineConfig({
  site: getSiteUrl() || undefined,
  // GitHub Pages serves project pages from a sub-path: /<repo-name>/
  base: RESOLVED_BASE,
  trailingSlash: "never",
  integrations: [react(), mirrorAssets()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": src,
      },
    },
  },
  markdown: {
    rehypePlugins: [
      (await import("./src/lib/rehype-md-links.mjs")).rehypeMdLinks({ base: RESOLVED_BASE }),
    ],
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  },
});
