import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "@phosphor-icons/react";

type Theme = "light" | "dark" | "system";

const apply = (theme: Theme) => {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
};

/** Three-state theme control; the boot script in Base.astro sets the class before paint. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(
      (localStorage.getItem("archive-theme") as Theme | null) ?? "dark",
    );
  }, []);

  const pick = (next: Theme) => {
    setTheme(next);
    localStorage.setItem("archive-theme", next);
    apply(next);
  };

  const options: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => pick(value)}
          className={`rounded-md p-1.5 transition-colors ${
            theme === value
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

export default ThemeToggle;
