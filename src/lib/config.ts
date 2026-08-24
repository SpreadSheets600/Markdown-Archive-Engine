import fs from "node:fs";
import path from "node:path";
import { getContentDir, getSiteUrl, getSiteBase } from "./content-dir.mjs";

/**
 * Central site configuration.
 *
 * The archive's identity is derived from the content root's README.md -
 * the first `#` heading becomes the site title and the first paragraph
 * becomes the description - so every content repository automatically
 * gets its own branding. Override with SITE_NAME / SITE_TAGLINE env
 * vars or a `name=` directive in `.contentdir`.
 */

const FALLBACK = {
  title: "Markdown Archive",
  description: "A Markdown-first documentation archive.",
};

function readReadmeIdentity() {
  try {
    const raw = fs.readFileSync(path.join(getContentDir(), "README.md"), "utf8");
    const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
    const h1 = body.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim();
    const firstPara =
      body
        .split(/\r?\n\s*\r?\n/)
        .map((p) => p.replace(/\s+/g, " ").trim())
        .find((p) => p && !p.startsWith("#") && !p.startsWith("|")) ?? undefined;
    return { h1, description: firstPara };
  } catch {
    return {};
  }
}

function markerName() {
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), ".contentdir"), "utf8");
    return raw.match(/^name\s*=\s*(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const identity = readReadmeIdentity();

/** GitHub repo link derived from the deployment URL (owner.github.io/repo). */
function deriveRepoUrl() {
  const base = getSiteBase()?.replace(/^\//, "") ?? "";
  const url = getSiteUrl()?.replace(/\/$/, "") ?? "";
  const m = url.match(/^https:\/\/([^.]*)\.github\.io$/);
  if (m && base && !["", "*"].includes(base)) {
    return `https://github.com/${m[1]}/${base}`;
  }
  return undefined;
}

export const SITE = {
  title: process.env.SITE_NAME || markerName() || identity.h1 || FALLBACK.title,
  tagline: process.env.SITE_TAGLINE || identity.description || FALLBACK.description,
  description: identity.description || FALLBACK.description,
  /** Repository shown in the header link. */
  repo: deriveRepoUrl(),
} as const;
