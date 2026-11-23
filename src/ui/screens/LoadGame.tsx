import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { platform } from "../../platform";
import {
  exportSave,
  importSave,
  listSaves,
  loadGame,
  type BrokenSave,
  type SaveSummary,
} from "../../save/saveManager";
import { formatDate } from "../../sim/calendar";
import { formatRealTime } from "../format";
import { useStore } from "../store";

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function LoadGame() {
  const goTo = useStore((s) => s.goTo);
  const startLoadedGame = useStore((s) => s.startLoadedGame);

  const [saves, setSaves] = useState<SaveSummary[] | null>(null);
  const [broken, setBroken] = useState<BrokenSave[]>([]);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await listSaves(platform.saves);
      setSaves(result.saves);
      setBroken(result.broken);
    } catch (e) {
      setSaves([]);
      setError(`Could not read saves: ${message(e)}`);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onLoad(slot: string) {
    setError("");
    try {
      startLoadedGame(await loadGame(platform.saves, slot));
    } catch (e) {
      setError(message(e));
    }
  }

  async function onExport(slot: string) {
    setError("");
    try {
      const { filename, text } = await exportSave(platform.saves, slot);
      platform.files.exportText(filename, text);
    } catch (e) {
      setError(message(e));
    }
  }

  async function onDelete(save: SaveSummary) {
    const label = `${save.companyName} (${save.kind === "auto" ? "autosave" : "manual save"})`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setError("");
    try {
      await platform.saves.delete(save.slot);
      await refresh();
    } catch (e) {
      setError(message(e));
    }
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // Allow importing the same file again.
    if (!file) return;
    setError("");
    try {
      await importSave(platform.saves, await file.text());
      await refresh();
    } catch (err) {
      setError(`Import failed: ${message(err)}`);
    }
  }

  return (
    <div className="page">
      <div className="panel form-page wide">
        <h1>Load Game</h1>

        {error && <div className="error-box">{error}</div>}

        {saves === null ? (
          <p className="muted">Reading saves…</p>
        ) : saves.length === 0 ? (
          <p className="muted">No saved games yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>CEO</th>
                <th>In-game date</th>
                <th>Type</th>
                <th>Saved</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {saves.map((s) => (
                <tr key={s.slot}>
                  <td>{s.companyName}</td>
                  <td>{s.ceoName}</td>
                  <td className="num">{formatDate(s.week)}</td>
                  <td>{s.kind === "auto" ? "Autosave" : "Manual"}</td>
                  <td className="num">{formatRealTime(s.savedAt)}</td>
                  <td className="row-actions">
                    <button className="primary" onClick={() => onLoad(s.slot)}>
                      Load
                    </button>
                    <button onClick={() => onExport(s.slot)}>Export</button>
                    <button onClick={() => onDelete(s)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {broken.length > 0 && (
          <div className="error-box">
            {broken.length} save{broken.length > 1 ? "s" : ""} could not be read:
            <ul>
              {broken.map((b) => (
                <li key={b.slot}>
                  {b.slot}: {b.error}{" "}
                  <button
                    onClick={async () => {
                      await platform.saves.delete(b.slot);
                      await refresh();
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="form-actions">
          <button onClick={() => goTo("menu")}>Back</button>
          <span className="spacer" />
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            onChange={onImport}
            hidden
          />
          <button onClick={() => fileInput.current?.click()}>Import save file…</button>
        </div>
        <p className="hint">
          Saves are stored in this browser. Use Export to keep a copy or move it to another
          computer. Importing a save replaces the manual save of the same playthrough.
        </p>
      </div>
    </div>
  );
}
