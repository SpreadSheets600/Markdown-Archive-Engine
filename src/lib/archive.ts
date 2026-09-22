import { getCollection } from "astro:content";
import { routeForDoc } from "@/lib/routes";
import { listAssets, listDirNames, listMarkdownNames } from "@/lib/assets";
import { folderKey } from "@/lib/tree";

/**
 * Builds the explorer tree shown in the sidebar, styled after tree(1).
 * Includes every document AND every raw asset (C files, images, PDFs…),
 * so folders without a document still show up. Server-side only.
 */
export async function buildTree() {
  const [docs, assets] = await Promise.all([
    getCollection("docs"),
    listAssets(),
  ]);
  // Content-collection ids are slugified; recover the real on-disk
  // filenames so the explorer shows e.g. "MIGRATING.md", not "migrating.md".
  const realNames = await listMarkdownNames();
  // Doc folder segments are slugified ("assignment-1") while asset folder
  // segments keep on-disk casing ("Assignment 1"). Merge both through
  // folderKey and display the real directory name, otherwise every folder
  // appears twice in the sidebar.
  const realDirs = await listDirNames();
  const root = { name: "", folders: new Map(), docs: [], assets: [] };
  const nodeAt = (parts) => {
    let node = root;
    const slugAcc = [];
    for (const part of parts) {
      const key = folderKey(part);
      slugAcc.push(key);
      if (!node.folders.has(key)) {
        const real = realDirs.get(slugAcc.join("/"));
        node.folders.set(key, {
          name: real ? real.split("/").pop() : part,
          folders: new Map(),
          docs: [],
          assets: [],
        });
      }
      node = node.folders.get(key);
    }
    return node;
  };

  for (const doc of [...docs].sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  )) {
    const parts = doc.id.split("/");
    const name = parts.pop();
    nodeAt(parts).docs.push({
      name: realNames.get(doc.id.toLowerCase()) ?? name,
      doc,
    });
  }

  for (const asset of [...assets].sort((a, b) =>
    a.path.localeCompare(b.path, undefined, { numeric: true }),
  )) {
    const parts = asset.path.split("/");
    const name = parts.pop();
    nodeAt(parts).assets.push({ name, path: asset.path });
  }

  return root;
}
