import { Dashboard } from "./screens/Dashboard";
import { LoadGame } from "./screens/LoadGame";
import { MainMenu } from "./screens/MainMenu";
import { NewGame } from "./screens/NewGame";
import { Settings } from "./screens/Settings";
import { useStore } from "./store";

export function App() {
  const screen = useStore((s) => s.screen);
  switch (screen) {
    case "menu":
      return <MainMenu />;
    case "newGame":
      return <NewGame />;
    case "loadGame":
      return <LoadGame />;
    case "settings":
      return <Settings />;
    case "game":
      return <Dashboard />;
  }
}
