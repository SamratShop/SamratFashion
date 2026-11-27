"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SlidersHorizontal, X } from "lucide-react";

interface ShopMobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeFiltersCount: number;
  onClearAll: () => void;
  children: React.ReactNode;
}

export function ShopMobileFilterDrawer({
  isOpen,
  onClose,
  activeFiltersCount,
  onClearAll,
  children,
}: ShopMobileFilterDrawerProps) {
  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Escape key closes mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex lg:hidden">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Drawer sheet sliding in from the left */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-heading"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative w-full max-w-xs bg-surface-container-lowest h-full shadow-2xl flex flex-col z-10"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <h2
                  id="mobile-filter-heading"
                  className="font-headline-sm text-sm font-bold uppercase tracking-wider text-on-surface"
                >
                  Filter Drops
                </h2>
                {activeFiltersCount > 0 && (
                  <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-on-primary text-[10px] font-mono font-bold leading-none">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-md active:scale-95 transition-transform"
                aria-label="Close filters drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Filters Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {children}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-outline-variant/20 flex gap-2.5 bg-surface-container-low/50">
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="flex-1 py-2.5 border border-outline-variant/60 rounded-lg font-mono text-xs font-bold uppercase tracking-wider text-on-surface hover:bg-surface-container active:scale-95 transition-all"
                >
                  Reset All
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-neutral-900 text-white rounded-lg font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 active:scale-95 transition-all shadow-xs"
              >
                View Drops
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
