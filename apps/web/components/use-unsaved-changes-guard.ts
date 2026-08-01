"use client";

import { useEffect, useRef, useState } from "react";

type PendingExit = { type: "LINK"; href: string } | { type: "BACK" };

export function useUnsavedChangesGuard(isDirty: boolean) {
  const [pendingExit, setPendingExit] = useState<PendingExit | null>(null);
  const isDirtyRef = useRef(isDirty);
  const bypassRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    function preventUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function interceptLink(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.href === window.location.href
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setPendingExit({ type: "LINK", href: anchor.href });
    }

    window.addEventListener("beforeunload", preventUnload);
    document.addEventListener("click", interceptLink, true);
    return () => {
      window.removeEventListener("beforeunload", preventUnload);
      document.removeEventListener("click", interceptLink, true);
    };
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    window.history.pushState(
      { ...window.history.state, unsavedChangesGuard: true },
      "",
      window.location.href,
    );

    function interceptBack() {
      if (bypassRef.current || !isDirtyRef.current) return;
      window.history.pushState(
        { ...window.history.state, unsavedChangesGuard: true },
        "",
        window.location.href,
      );
      setPendingExit({ type: "BACK" });
    }

    window.addEventListener("popstate", interceptBack);
    return () => window.removeEventListener("popstate", interceptBack);
  }, [isDirty]);

  function confirmExit() {
    if (!pendingExit) return;
    const target = pendingExit;
    setPendingExit(null);
    bypassRef.current = true;
    if (target.type === "LINK") {
      window.location.assign(target.href);
    } else {
      window.history.go(-2);
    }
  }

  function cancelExit() {
    setPendingExit(null);
  }

  return {
    dialogOpen: Boolean(pendingExit),
    confirmExit,
    cancelExit,
  };
}
