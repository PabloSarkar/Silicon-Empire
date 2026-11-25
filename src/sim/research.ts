// Research progress (README §2.4).

import { yearOf } from "../data/market";
import { getResearchNode, prerequisiteOf, researchPointCost } from "../data/research";
import { addEvent, unlockAchievement } from "./events";
import type { GameState } from "./types";

export type ResearchStatus = "done" | "current" | "available" | "lockedYear" | "lockedPrereq";

export function researchStatus(s: GameState, id: string): ResearchStatus {
  if (s.research.completed.includes(id)) return "done";
  if (s.research.current === id) return "current";
  const prereq = prerequisiteOf(id);
  if (prereq && !s.research.completed.includes(prereq)) return "lockedPrereq";
  if (getResearchNode(id).year > Math.floor(yearOf(s.week))) return "lockedYear";
  return "available";
}

export function progressResearch(s: GameState, points: number): void {
  const id = s.research.current;
  if (!id) return;
  const node = getResearchNode(id);
  const progress = (s.research.progress[id] ?? 0) + points;
  if (progress >= researchPointCost(node)) {
    s.research.completed.push(id);
    delete s.research.progress[id];
    s.research.current = null;
    addEvent(s, `Research complete: ${node.name}.`, true);
    unlockAchievement(s, "first_research");
  } else {
    s.research.progress[id] = progress;
  }
}

export function progressDesign(s: GameState, points: number): void {
  for (const p of s.products) {
    if (p.status !== "development") continue;
    p.designProgress += points;
    if (p.designProgress >= p.stats.designPoints) {
      p.designProgress = p.stats.designPoints;
      p.status = "ready";
      p.completedWeek = s.week;
      addEvent(s, `Design finished: ${p.spec.name}. Order production from a foundry, then launch it.`, true);
      unlockAchievement(s, "first_cpu_designed");
    }
  }
}
