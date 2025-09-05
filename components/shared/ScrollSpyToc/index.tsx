"use client";

import React from "react";

export interface TocItem {
  id: string;
  label: string;
}

export interface ScrollSpyTocProps extends React.ComponentPropsWithoutRef<'nav'> {
  items: TocItem[];
  /** Pixels to offset for sticky header when determining active section */
  offset?: number;
}

function cx(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function ScrollSpyToc({ items, className, offset = 120, ...rest }: ScrollSpyTocProps) {
  const [activeId, setActiveId] = React.useState<string | undefined>(items[0]?.id);

  React.useEffect(() => {
    const handler = () => {
      const scrollPos = window.scrollY + offset + 1;
      let current: string | undefined = items[0]?.id;

      for (const it of items) {
        const el = document.getElementById(it.id);
        if (!el) continue;
        const top = el.offsetTop;
        if (top <= scrollPos) {
          current = it.id;
        }
      }
      if (current !== activeId) setActiveId(current);
    };

    handler();
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [items, offset, activeId]);

  return (
    <nav aria-label="On this page" className={cx(className)} {...rest}>
      <h3 className="text-sm font-semibold text-foreground">On this page</h3>
      <ul className="mt-4 space-y-2">
        {items.map((it) => {
          const isActive = it.id === activeId;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                className={cx(
                  "block py-1 text-sm transition-colors",
                  isActive ? "text-foreground font-medium" : "text-foreground/60 hover:text-foreground"
                )}
                aria-current={isActive ? "true" : undefined}
              >
                {it.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
