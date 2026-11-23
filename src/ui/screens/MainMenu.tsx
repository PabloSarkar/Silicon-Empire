import { useStore } from "../store";

export function MainMenu() {
  const goTo = useStore((s) => s.goTo);
  const openSettings = useStore((s) => s.openSettings);

  return (
    <div className="center-page">
      <div className="panel menu-panel">
        <h1 className="game-title">Silicon Empire</h1>
        <p className="muted">A hardware tycoon simulation. Pilot build {__APP_VERSION__}.</p>
        <div className="menu-buttons">
          <button className="primary" onClick={() => goTo("newGame")}>
            New Game
          </button>
          <button onClick={() => goTo("loadGame")}>Load Game</button>
          <button onClick={openSettings}>Settings</button>
        </div>
      </div>
    </div>
  );
}
