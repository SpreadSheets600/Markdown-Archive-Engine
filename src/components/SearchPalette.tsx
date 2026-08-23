import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { FileText, FolderOpen, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BASE } from "@/lib/routes";

/**
 * ⌘K palette backed by a Pagefind index generated at build time.
 * Pagefind ships zero search payload until the dialog is opened.
 */
export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const pagefindRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || pagefindRef.current) return;
    import(`${BASE}/pagefind/pagefind.js`)
      .then((pf) => pf.default({ basePath: `${BASE}/pagefind/` }))
      .then((pf) => (pagefindRef.current = pf))
      .catch(() => (pagefindRef.current = false));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const pf = pagefindRef.current;
      if (!query.trim() || !pf) {
        setResults([]);
        return;
      }
      const search = await pf.search(query);
      const hits = await Promise.all(
        search.results.slice(0, 10).map((r) => r.data()),
      );
      if (!cancelled)
        setResults(
          hits.map((hit) => ({
            url: hit.url.startsWith(BASE) ? hit.url : `${BASE}${hit.url}`,
            title: hit.meta?.title ?? "Untitled",
            excerpt: hit.excerpt_text ?? hit.excerpt ?? "",
            crumb: hit.meta?.crumb ?? new URL(hit.url, "http://x").pathname,
          })),
        );
    };
    // Small debounce keeps typing smooth while indexing locally.
    const t = setTimeout(run, 90);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby={undefined} className="overflow-hidden p-0">
        <DialogTitle className="sr-only">Search the archive</DialogTitle>
        <Command shouldFilter={false} className="divide-y divide-border">
          <div className="flex items-center gap-2.5 px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search documents…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {pagefindRef.current === false
                ? "Search index unavailable."
                : query.trim()
                  ? "No matching documents."
                  : "Type to search every lab record."}
            </Command.Empty>
            {results.map((r) => (
              <Command.Item
                key={r.url}
                value={`${r.title} ${r.crumb}`}
                onSelect={() => (window.location.href = r.url)}
                asChild
              >
                <a
                  href={r.url}
                  className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-sm outline-none data-[selected=true]:bg-accent"
                >
                  {r.crumb.includes("/") ? (
                    <FolderOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span
                      className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground [&_mark]:rounded [&_mark]:bg-accent [&_mark]:px-0.5 [&_mark]:text-accent-foreground"
                      dangerouslySetInnerHTML={{ __html: r.excerpt }}
                    />
                  </span>
                </a>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default SearchPalette;
