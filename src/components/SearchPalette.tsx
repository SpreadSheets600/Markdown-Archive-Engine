import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CircleNotch,
  FileText,
  FolderOpen,
} from "@phosphor-icons/react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { BASE } from "@/lib/routes";

/**
 * ⌘K palette backed by a Pagefind index generated at build time.
 * Pagefind ships zero search payload until the dialog is opened.
 * Composed from the shadcn/ui Command primitives (ui/command.tsx).
 */
export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
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
    const onOpen = () => setOpen(true);
    window.addEventListener("archive:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("archive:open-search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open || pagefindRef.current) return;
    // @vite-ignore keeps this a native runtime import - Vite's preload
    // wrapper mangles fully-dynamic URLs like this one.
    import(/* @vite-ignore */ `${BASE}/pagefind/pagefind.js`)
      .then(async (pf) => {
        // Pagefind >=1.4 exports named API (no default export).
        await pf.options?.({ basePath: `${BASE}/pagefind/` });
        pagefindRef.current = pf;
      })
      .catch((err) => {
        console.warn("Pagefind failed to load:", err);
        pagefindRef.current = false;
      });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setLoading(false);
      return;
    }
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const pf = pagefindRef.current;
      if (!query.trim() || !pf) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    // Small debounce keeps typing smooth while indexing locally.
    const t = setTimeout(run, 90);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const indexUnavailable = pagefindRef.current === false;

  return (
    <CommandDialog
      title="Search the archive"
      open={open}
      onOpenChange={setOpen}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Type a command or search..."
      />
      <CommandList className="max-h-80">
        <CommandEmpty>
          {indexUnavailable ? (
            "Search index unavailable."
          ) : loading ? (
            <span className="inline-flex items-center gap-1.5">
              <CircleNotch className="size-4 animate-spin" />
              Searching...
            </span>
          ) : query.trim() ? (
            "No results found."
          ) : (
            "Type to search every lab record."
          )}
        </CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading={loading ? "Documents - searching..." : "Documents"}>
            {results.map((r) => (
              <CommandItem
                key={r.url}
                value={`${r.title} ${r.crumb}`}
                onSelect={() => (window.location.href = r.url)}
                asChild
              >
                <a href={r.url}>
                  {r.crumb.includes("/") ? (
                    <FolderOpen className="mt-0.5" aria-hidden="true" />
                  ) : (
                    <FileText className="mt-0.5" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.title}</span>
                    {r.excerpt ? (
                      <span
                        className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground [&_mark]:rounded [&_mark]:bg-accent [&_mark]:px-0.5 [&_mark]:font-medium [&_mark]:text-accent-foreground"
                        dangerouslySetInnerHTML={{ __html: r.excerpt }}
                      />
                    ) : null}
                    <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground/70">
                      {r.crumb}
                    </span>
                  </span>
                  <ArrowRight className="opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
                </a>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      {/* Footer hints, shadcn search-dialog style */}
      <div className="flex items-center gap-3 border-t px-4 py-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <kbd className="rounded border bg-muted px-1 font-mono">↑↓</kbd>
          Navigate
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="rounded border bg-muted px-1 font-mono">↵</kbd>
          Open
        </span>
        <CommandShortcut>ESC to close</CommandShortcut>
      </div>
    </CommandDialog>
  );
}

export default SearchPalette;
