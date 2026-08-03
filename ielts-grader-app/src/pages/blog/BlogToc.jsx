import { useEffect, useMemo, useState } from 'react';

function slugifyHeading(text = '') {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

/** Extract H2 headings from markdown body for sticky on-page nav. */
export function extractH2Headings(content = '') {
  const headings = [];
  const re = /^##\s+(.+)$/gm;
  let match;
  while ((match = re.exec(content)) !== null) {
    const title = match[1].trim();
    if (!title) continue;
    // Skip the in-guide TOC section itself when present
    if (/^in this guide$/i.test(title)) continue;
    headings.push({ id: slugifyHeading(title), title });
  }
  return headings;
}

export default function BlogToc({ headings = [] }) {
  const ids = useMemo(() => headings.map((h) => h.id), [headings]);
  const [activeId, setActiveId] = useState(ids[0] || '');

  useEffect(() => {
    if (!ids.length) return undefined;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  if (!headings.length) return null;

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-28">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] mb-4">
          On this page
        </p>
        <nav className="flex flex-col gap-0.5 border-l border-[#E5E7EB]">
          {headings.map((h) => {
            const active = activeId === h.id;
            return (
              <a
                key={h.id}
                href={`#${h.id}`}
                className={`pl-4 py-1.5 text-[13px] leading-snug no-underline transition-colors border-l-2 -ml-px ${
                  active
                    ? 'border-[#3B82F6] text-[#1a1f36] font-semibold'
                    : 'border-transparent text-[#6B7280] hover:text-[#1a1f36]'
                }`}
              >
                {h.title}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
