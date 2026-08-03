import { useEffect, useState } from 'react';

/** Thin reading-progress bar fixed under the sticky navbar. */
export default function BlogReadingProgress({ targetRef }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = targetRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) {
        setProgress(rect.bottom <= window.innerHeight ? 100 : 0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress((scrolled / total) * 100);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetRef]);

  return (
    <div
      className="fixed top-[64px] md:top-[72px] left-0 right-0 z-40 h-[2px] bg-transparent pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-[#3B82F6] origin-left transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
