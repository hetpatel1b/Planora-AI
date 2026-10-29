"use client";

import * as React from "react";
import { CopilotChatCard } from "@/components/copilot/copilot-chat-card";
import { Sparkles } from "lucide-react";

export interface FloatingCopilotDrawerProps {
  eventId: string;
  eventName: string;
  eventDate?: string | null;
  /** Optional controlled open state */
  isOpen?: boolean;
  /** Optional callback fired when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function FloatingCopilotDrawer({
  eventId,
  eventName,
  eventDate,
  isOpen: controlledIsOpen,
  onOpenChange,
}: FloatingCopilotDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setIsOpen = React.useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setInternalIsOpen(open);
      }
      onOpenChange?.(open);
    },
    [isControlled, onOpenChange]
  );

  const launcherRef = React.useRef<HTMLButtonElement>(null);
  const drawerRef = React.useRef<HTMLDivElement>(null);

  // Focus management & Escape key handling
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent background body scroll when open on mobile
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      // Auto-focus drawer on open
      setTimeout(() => {
        drawerRef.current?.focus();
      }, 50);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, setIsOpen]);

  // Focus restoration to launcher when drawer closes
  const prevIsOpen = React.useRef(isOpen);
  React.useEffect(() => {
    if (prevIsOpen.current && !isOpen) {
      launcherRef.current?.focus();
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  // Tab key trap inside drawer
  const handleTrapTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !drawerRef.current) return;
    const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  return (
    <>
      {/* Floating Bottom-Right Launcher Button */}
      <aside
        aria-label="AI Copilot Assistant"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 pb-[env(safe-area-inset-bottom,0px)] pr-[env(safe-area-inset-right,0px)]"
      >
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls="copilot-drawer-panel"
          aria-label={`Open AI Copilot for ${eventName}`}
          className="group flex h-12 items-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-white shadow-lg shadow-violet-600/30 hover:shadow-violet-600/45 hover:scale-102 active:scale-98 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-violet-400 focus-visible:ring-offset-2 min-h-[44px] min-w-[44px]"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-white shadow-2xs group-hover:rotate-12 transition-transform duration-200">
            <Sparkles className="size-4 animate-pulse" aria-hidden="true" />
          </div>
          <span className="font-semibold text-xs tracking-wide pr-1">
            Ask Copilot
          </span>
          <span className="sr-only">Open conversational planning assistant</span>
        </button>
      </aside>

      {/* Accessible Slide-Over Drawer & Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
          />

          {/* Drawer Panel */}
          <div
            ref={drawerRef}
            id="copilot-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`Planora AI Copilot — ${eventName}`}
            tabIndex={-1}
            onKeyDown={handleTrapTab}
            className="fixed inset-y-0 right-0 z-50 flex h-dvh max-h-dvh h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-200 sm:w-[440px] md:w-[480px] sm:max-w-[440px] md:max-w-[480px] dark:border-slate-800 dark:bg-slate-900 focus-visible:outline-none animate-in slide-in-from-right overflow-hidden"
          >
            <CopilotChatCard
              eventId={eventId}
              eventName={eventName}
              eventDate={eventDate}
              inDrawer={true}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
