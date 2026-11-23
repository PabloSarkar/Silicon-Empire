// Platform adapter interfaces (D-008, README §5 rule 1).
// Game and UI code talk to these interfaces only. The pilot uses the browser
// implementations in ./browser.ts; the Steam build will swap in Electron
// implementations (files on disk, Steam Cloud, Steamworks achievements)
// without touching game code.

export interface SaveStorage {
  save(slot: string, data: string): Promise<void>;
  load(slot: string): Promise<string | null>;
  list(): Promise<string[]>;
  delete(slot: string): Promise<void>;
}

export interface SettingsStorage {
  load(): unknown;
  save(data: unknown): void;
}

export interface Achievements {
  unlock(id: string): void;
}

export interface FileExport {
  /** Offers a text file to the player (browser download, or a save dialog on desktop). */
  exportText(filename: string, text: string): void;
}

export interface Platform {
  saves: SaveStorage;
  settings: SettingsStorage;
  achievements: Achievements;
  files: FileExport;
}
