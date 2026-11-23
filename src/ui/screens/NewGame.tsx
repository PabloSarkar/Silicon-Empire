import { useState, type FormEvent } from "react";
import { ARCHETYPES } from "../../data/archetypes";
import {
  LOGO_TEXT_MAX_LENGTH,
  NAME_MAX_LENGTH,
  initialsFor,
  validateNewGame,
  type NewGameErrors,
} from "../../sim/game";
import type { CeoArchetypeId, Logo, LogoFont, LogoShape } from "../../sim/types";
import { LogoMark } from "../components/LogoMark";
import { useStore } from "../store";

const SHAPES: { value: LogoShape; label: string }[] = [
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
  { value: "diamond", label: "Diamond" },
  { value: "hexagon", label: "Hexagon" },
  { value: "triangle", label: "Triangle" },
];

const FONTS: { value: LogoFont; label: string }[] = [
  { value: "sans", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Monospace" },
];

// Order follows the spec (README §2.2): archetype, logo, company name, CEO name.
export function NewGame() {
  const goTo = useStore((s) => s.goTo);
  const startNewGame = useStore((s) => s.startNewGame);

  const [archetype, setArchetype] = useState<CeoArchetypeId>("research");
  const [companyName, setCompanyName] = useState("");
  const [ceoName, setCeoName] = useState("");
  const [logo, setLogo] = useState<Logo>({
    shape: "square",
    primaryColor: "#1f3a5f",
    secondaryColor: "#ffffff",
    font: "sans",
    text: "",
  });
  // Logo text follows the company initials until the player edits it.
  const [logoTextEdited, setLogoTextEdited] = useState(false);
  // Errors appear after the first Start Game attempt, then update live as the player types.
  const [submitted, setSubmitted] = useState(false);

  const effectiveLogo: Logo = logoTextEdited ? logo : { ...logo, text: initialsFor(companyName) };
  const params = { archetype, logo: effectiveLogo, companyName, ceoName };
  const errors: NewGameErrors = submitted ? validateNewGame(params) : {};
  const previewLogo: Logo = effectiveLogo.text ? effectiveLogo : { ...effectiveLogo, text: "?" };

  function updateLogo(patch: Partial<Logo>) {
    setLogo((l) => ({ ...l, ...patch }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateNewGame(params)).length === 0) startNewGame(params);
  }

  return (
    <div className="page">
      <form className="panel form-page" onSubmit={onSubmit} noValidate>
        <h1>New Game</h1>

        <fieldset>
          <legend>1. CEO Archetype</legend>
          <div className="archetype-list">
            {ARCHETYPES.map((a) => (
              <label key={a.id} className={`archetype ${archetype === a.id ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="archetype"
                  value={a.id}
                  checked={archetype === a.id}
                  onChange={() => setArchetype(a.id)}
                />
                <span className="archetype-body">
                  <strong>{a.name}</strong>
                  <ul>
                    {a.effects.map((effect) => (
                      <li key={effect}>{effect}</li>
                    ))}
                  </ul>
                  <span className="muted">Attracts: {a.attracts}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>2. Logo</legend>
          <div className="logo-editor">
            <div className="logo-preview">
              <LogoMark logo={previewLogo} size={96} />
            </div>
            <div className="form-grid">
              <label htmlFor="logo-shape">Shape</label>
              <select
                id="logo-shape"
                value={logo.shape}
                onChange={(e) => updateLogo({ shape: e.target.value as LogoShape })}
              >
                {SHAPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <label htmlFor="logo-primary">Shape colour</label>
              <input
                id="logo-primary"
                type="color"
                value={logo.primaryColor}
                onChange={(e) => updateLogo({ primaryColor: e.target.value })}
              />

              <label htmlFor="logo-secondary">Text colour</label>
              <input
                id="logo-secondary"
                type="color"
                value={logo.secondaryColor}
                onChange={(e) => updateLogo({ secondaryColor: e.target.value })}
              />

              <label htmlFor="logo-font">Font</label>
              <select
                id="logo-font"
                value={logo.font}
                onChange={(e) => updateLogo({ font: e.target.value as LogoFont })}
              >
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>

              <label htmlFor="logo-text">Text</label>
              <div>
                <input
                  id="logo-text"
                  type="text"
                  className="short"
                  maxLength={LOGO_TEXT_MAX_LENGTH}
                  value={effectiveLogo.text}
                  onChange={(e) => {
                    setLogoTextEdited(true);
                    updateLogo({ text: e.target.value.toUpperCase() });
                  }}
                />
                <span className="hint"> 1–{LOGO_TEXT_MAX_LENGTH} characters. Defaults to the company initials.</span>
                {errors.logoText && <div className="error">{errors.logoText}</div>}
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>3. Company Name</legend>
          <input
            type="text"
            aria-label="Company name"
            maxLength={NAME_MAX_LENGTH}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoComplete="off"
          />
          {errors.companyName && <div className="error">{errors.companyName}</div>}
        </fieldset>

        <fieldset>
          <legend>4. CEO Name</legend>
          <input
            type="text"
            aria-label="CEO name"
            maxLength={NAME_MAX_LENGTH}
            value={ceoName}
            onChange={(e) => setCeoName(e.target.value)}
            autoComplete="off"
          />
          {errors.ceoName && <div className="error">{errors.ceoName}</div>}
        </fieldset>

        <div className="form-actions">
          <button type="button" onClick={() => goTo("menu")}>
            Back
          </button>
          <button type="submit" className="primary">
            Start Game
          </button>
        </div>
      </form>
    </div>
  );
}
