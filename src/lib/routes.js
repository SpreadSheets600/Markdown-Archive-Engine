/**
 * Client-safe route helpers (no astro:content imports).
 */

/** Site base path, injected by Astro from the resolved config. */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const withBase = (p) => `${BASE}${p}`;

/**
 * Route for a content-collection id. The glob loader strips the `.md`
 * extension and slugifies, so ids look like "10-08-2026/readme".
 * README files become their folder's index:
 *   "readme"            -> "/"
 *   "03-08-2026/readme" -> "/03-08-2026"
 *   "migrating"         -> "/migrating"
 */
export function routeForDoc(id) {
  const stem = id.replace(/\.(?:md|markdown)$/i, "");
  if (/(^|\/)readme$/i.test(stem)) {
    const dir = stem.replace(/\/readme$/i, "").replace(/\/+$/, "");
    return dir ? `/${dir}` : "/";
  }
  return `/${stem.replace(/\/+$/, "")}`;
}

/** Short display name for a document id. */
export function labelForId(id) {
  const stem = id.replace(/\.(?:md|markdown)$/i, "");
  if (/^readme$/i.test(stem)) return "Home";
  const parts = stem.split("/").filter(Boolean);
  const last = parts.at(-1);
  return /^(?:readme)$/i.test(last ?? "")
    ? (parts.at(-2) ?? "Home")
    : (last ?? id);
}

export const HOME_ID = "readme";
