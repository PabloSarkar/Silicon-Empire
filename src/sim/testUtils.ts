// Helpers shared by tests. Not used by the game.
import { createNewGame, type NewGameParams } from "./game";
import type { GameState } from "./types";

export const params: NewGameParams = {
  archetype: "technical",
  logo: { shape: "hexagon", primaryColor: "#112233", secondaryColor: "#ffffff", font: "mono", text: "ab" },
  companyName: "  Test Semiconductor ",
  ceoName: "Ada",
};

export function newGame(seed = 7): GameState {
  return createNewGame(params, { id: "g1", seed });
}
