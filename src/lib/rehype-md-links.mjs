import path from "node:path";
import { getContentDir, getSiteBase } from "./content-dir.mjs";

/**
 * Rewrites links inside Markdown so the whole archive works from a
 * GitHub Pages sub-path:
 *
 *   `[Link](03-08-2026/README.md)` -> `/Operating-Systems-Programs/03-08-2026`
 *   `![shot](img/x.png)`           -> `/Operating-Systems-Programs/03-08/img/x.png`
 *   `[Guide](../MIGRATING.md)`     -> `/Operating-Systems-Programs/MIGRATING`
 *
 * Absolute URLs, protocol links and hash links pass through untouched.
 */

function routeForDoc(id) {
  if (/^readme\.md$/i.test(id)) return "/";
  const stripped = id
    .replace(/\/readme\.md$/i, "")
    .replace(/\.md$/i, "")
    .replace(/\/+$/, "");
  return `/${stripped}`.replace(/\/+$/, "") || "/";
}

function normalize(p) {
  const parts = [];
  for (const part of p.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== "." && part !== "") parts.push(part);
  }
  return parts.join("/");
}

function rewriteHref(href, docId) {
  const [, linkPath = "", suffix = ""] = href.match(/^([^?#]*)([\s\S]*)$/) ?? [];
  if (!linkPath || /^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i.test(linkPath)) {
    // Site-absolute links still need the Pages sub-path.
    const base = getSiteBase();
    if (base && linkPath.startsWith("/") && !(base === "/" || linkPath.startsWith(`${base}/`)))
      return `${base}${href}`;
    return href;
  }
  const dir = docId.includes("/") ? docId.replace(/[^/]+$/, "") : "";
  const resolved = normalize(`${dir}${decodeURI(linkPath)}`);
  const base = getSiteBase();
  const prefix = !base || base === "/" ? "" : base;
  if (/\.md$/i.test(resolved))
    return `${prefix}${routeForDoc(resolved)}${suffix}`;
  // Any other file format: served verbatim next to its document.
  return `${prefix}/${resolved}${suffix}`;
}

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
    return;
  }
  visit(node);
  if (node.children) walk(node.children, visit);
}

/** @type {import('unified').Plugin<[{ base?: string }]>} */
export function rehypeMdLinks({ base: configuredBase } = {}) {
  const SITE_BASE = configuredBase ?? getSiteBase();
  return (tree, file) => {
    const abs = file?.history?.[0];
    if (!abs) return;
    const docId = path
      .relative(getContentDir(), abs)
      .split(path.sep)
      .join("/");
    walk(tree, (node) => {
      const url = node.type === "element" ? node.properties?.href : null;
      const src =
        node.type === "element" ? node.properties?.src : null;
      if (typeof url === "string")
        node.properties.href = rewriteHref(url, docId);
      if (typeof src === "string")
        node.properties.src = rewriteHref(src, docId);
      // Videos referenced through <source> inside markdown html
      if (node.type === "element" && typeof node.properties?.srcset === "string")
        node.properties.srcset = rewriteHref(node.properties.srcset, docId);
    });
  };
}
