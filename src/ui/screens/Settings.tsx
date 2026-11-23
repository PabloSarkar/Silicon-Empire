import { AUTOSAVE_OPTIONS, DEFAULT_SETTINGS, type AutosaveInterval } from "../settings";
import { useStore } from "../store";

export function Settings() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const closeSettings = useStore((s) => s.closeSettings);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }

  return (
    <div className="page">
      <div className="panel form-page">
        <h1>Settings</h1>

        <fieldset>
          <legend>Gameplay</legend>
          <div className="form-grid">
            <label htmlFor="autosave">Autosave</label>
            <select
              id="autosave"
              value={settings.autosaveWeeks}
              onChange={(e) =>
                updateSettings({ autosaveWeeks: Number(e.target.value) as AutosaveInterval })
              }
            >
              {AUTOSAVE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <label htmlFor="pause-hidden">Pause when tab is hidden</label>
            <input
              id="pause-hidden"
              type="checkbox"
              checked={settings.pauseWhenHidden}
              onChange={(e) => updateSettings({ pauseWhenHidden: e.target.checked })}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend>Display</legend>
          <button type="button" onClick={toggleFullscreen}>
            Toggle fullscreen
          </button>
        </fieldset>

        <fieldset>
          <legend>Keyboard</legend>
          <table className="data-table compact">
            <tbody>
              <tr>
                <td><kbd>Space</kbd></td>
                <td>Pause / resume</td>
              </tr>
              <tr>
                <td><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></td>
                <td>Set speed to 1×, 2×, 3×</td>
              </tr>
            </tbody>
          </table>
        </fieldset>

        <div className="form-actions">
          <button onClick={closeSettings}>Back</button>
          <span className="spacer" />
          <button onClick={() => updateSettings(DEFAULT_SETTINGS)}>Reset to defaults</button>
        </div>
      </div>
    </div>
  );
}
