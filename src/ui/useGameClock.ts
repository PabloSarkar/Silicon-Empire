import { useEffect } from "react";
import { MS_PER_WEEK_AT_1X, useStore, type Speed } from "./store";

/**
 * Continuous simulation (D-010): while unpaused, advances one in-game week
 * every MS_PER_WEEK_AT_1X / speed milliseconds.
 */
export function useGameClock() {
  const paused = useStore((s) => s.paused);
  const speed = useStore((s) => s.speed);
  const hasGame = useStore((s) => s.game !== null);
  const advanceWeek = useStore((s) => s.advanceWeek);

  useEffect(() => {
    if (paused || !hasGame) return;
    const id = window.setInterval(advanceWeek, MS_PER_WEEK_AT_1X / speed);
    return () => window.clearInterval(id);
  }, [paused, speed, hasGame, advanceWeek]);

  // Optionally pause when the tab is hidden, so time doesn't pass unseen.
  useEffect(() => {
    function onVisibility() {
      const { settings, setPaused } = useStore.getState();
      if (document.hidden && settings.pauseWhenHidden) setPaused(true);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
}

/** Space = pause/resume, 1–3 = speed (README §5 rule 5). */
export function useClockShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      // Don't hijack keys while the player is typing or using a form control.
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const { togglePause, setSpeed } = useStore.getState();
      if (e.code === "Space") {
        e.preventDefault(); // Stop the page scrolling or a focused button activating.
        togglePause();
      } else if (e.key === "1" || e.key === "2" || e.key === "3") {
        setSpeed(Number(e.key) as Speed);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
