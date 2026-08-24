import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { getContentDir, TOOLING_DIRS, TOOLING_FILES, TOOLING_MARKDOWN } from "@/lib/content-dir.mjs";

const contentDir = getContentDir();
const ignoreDirs = [
  ...TOOLING_DIRS,
  ...TOOLING_FILES,
  ...TOOLING_MARKDOWN,
].map((d) => `!${d}`);

/**
 * The archive is Markdown-first: every .md file in the repository root
 * (at any depth) is a document. README.md files act as the index of
 * their folder, and the root README.md becomes the homepage - it doubles
 * as the GitHub repository README.
 */
const docs = defineCollection({
  loader: glob({
    pattern: ["**/*.md", ...ignoreDirs],
    base: contentDir,
  }),
  // All metadata is derived from the Markdown itself; nothing extra to author.
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const collections = { docs };
