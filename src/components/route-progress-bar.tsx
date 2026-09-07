"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A slim progress bar fixed to the top of the viewport that gives visual
 * feedback the instant a navigation starts (link click) and finishes it
 * once the new route has actually rendered.
 *
 * This is what most of the app was missing: pages transition without any
 * spinner/indicator, so a click looks like nothing happened until the
 * next page suddenly appears.
 */
function RouteProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    clearTimers();
    setVisible(true);
    setProgress(12);
    tickRef.current = setInterval(() => {
      setProgress((p) => (p >= 88 ? p : p + (88 - p) * 0.15 + 1));
    }, 180);
  }, [clearTimers]);

  const finish = useCallback(() => {
    if (!runningRef.current) return;
    runningRef.current = false;
    clearTimers();
    setProgress(100);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
  }, [clearTimers]);

  // Kick off the bar the moment the user clicks an internal link,
  // before Next.js has even started fetching/rendering the next route.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const currentSearch = searchParams?.toString();
      const samePlace =
        url.pathname === pathname &&
        url.search.replace(/^\?/, "") === (currentSearch || "");
      if (samePlace) return;

      start();
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname, searchParams, start]);

  // The route (or query string) actually changed -> navigation is done.
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => clearTimers, [clearTimers]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 shadow-[0_0_8px_rgba(37,99,235,0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function RouteProgressBar() {
  // useSearchParams needs a Suspense boundary around it in the App Router.
  return (
    <Suspense fallback={null}>
      <RouteProgressBarInner />
    </Suspense>
  );
}
