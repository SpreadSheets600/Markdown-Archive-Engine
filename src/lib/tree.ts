/**
 * Explorer tree node types shared by the sidebar.
 */
export interface DocLeaf {
  name: string;
  doc: { id: string; [k: string]: unknown };
}

export interface AssetLeaf {
  name: string;
  /** Repository-root-relative path. */
  path: string;
}

export interface TreeNode {
  name: string;
  folders: Map<string, TreeNode>;
  docs: DocLeaf[];
  assets: AssetLeaf[];
}

export interface SortedNode {
  name: string;
  folders: SortedNode[];
  docs: DocLeaf[];
  assets: AssetLeaf[];
}

/** Folder-index documents are ids ending in "readme". */
export const isReadme = (name: string) => /^readme$/i.test(name);

const natural = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });

export function sortTree(node: TreeNode): SortedNode {
  const folders = [...node.folders.values()]
    .sort((a, b) => natural(a.name, b.name))
    .map((child) => ({ name: child.name, ...sortTree(child) }));
  const docs = [...node.docs].sort((a, b) => {
    if (isReadme(a.name)) return -1;
    if (isReadme(b.name)) return 1;
    return natural(a.name, b.name);
  });
  const assets = [...node.assets].sort((a, b) => natural(a.name, b.name));
  return { folders, docs, assets };
}
