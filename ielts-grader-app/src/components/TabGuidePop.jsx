import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const AUTO_DISMISS_MS = 10000;

/**
 * Low-friction first-visit coachmark under a tab bar.
 * Auto-hides after 10s, or when parent dismisses (X / tab click).
 * No backdrop and no scroll-dismiss — Lenis/layout scroll must not kill it.
 */
export default function TabGuidePop({
  visible,
  title = 'Explore the tabs',
  body = 'There are more sections to explore beyond Overview.',
  onDismiss,
}) {
  const dismissedRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const finish = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDismissRef.current?.();
  };

  useEffect(() => {
    if (!visible) {
      dismissedRef.current = false;
      return undefined;
    }
    dismissedRef.current = false;
    const timer = window.setTimeout(() => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      onDismissRef.current?.();
    }, AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
          className="relative z-[120] px-2 md:px-3 pb-3 pointer-events-auto"
          role="status"
          aria-live="polite"
        >
          <div className="relative bg-[#101828] text-white rounded-[12px] shadow-[0_8px_28px_rgba(16,24,40,0.22)] px-3.5 py-3 max-w-[400px]">
            <div
              className="absolute -top-1.5 left-6 w-3 h-3 bg-[#101828] rotate-45 rounded-[2px]"
              aria-hidden
            />
            <div className="flex items-start gap-2 relative">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold leading-snug">{title}</p>
                <p className="text-[12px] text-white/75 mt-0.5 leading-snug">{body}</p>
              </div>
              <button
                type="button"
                onClick={finish}
                className="shrink-0 p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
