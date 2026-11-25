import { useMemo, useState } from "react";
import { BASE_TAX_RATE, HOT_TEMP_C, MAX_SAFE_TEMP_C } from "../../../data/balance";
import { FABS, getClient } from "../../../data/market";
import { getResearchNode, type SocketNode } from "../../../data/research";
import { cancelDesign, startDesign } from "../../../sim/actions";
import { meetsContract } from "../../../sim/contracts";
import { bestDesign, evaluateDesign, NAME_MAX, techFrom, validateSpec, type DesignProfile } from "../../../sim/cpu";
import { teamOutput } from "../../../sim/employees";
import { bestPerfOnMarket } from "../../../sim/market";
import { fabSupportsNode } from "../../../sim/production";
import type { CpuSpec, GameState } from "../../../sim/types";
import { Check, KeyValue, ProgressBar, Section } from "../../components/Widgets";
import {
  formatClock,
  formatMoney,
  formatMoneyCents,
  formatNumber,
  formatPercent,
  formatPerf,
  formatTransistors,
} from "../../format";
import { useGame, useStore } from "../../store";

const PROFILES: { label: string; profile: DesignProfile }[] = [
  { label: "Budget", profile: { clockFrac: 0.6, coreFrac: 0.25 } },
  { label: "Mainstream", profile: { clockFrac: 0.85, coreFrac: 0.5 } },
  { label: "Enthusiast", profile: { clockFrac: 1, coreFrac: 1 } },
];

function defaultName(game: GameState): string {
  const prefix = game.company.logo.text || "X";
  return `${prefix}-${(game.products.length + 1) * 100}`;
}

export function Designer() {
  const game = useGame();
  const dispatch = useStore((s) => s.dispatch);
  const tech = useMemo(() => techFrom(game.research.completed), [game.research.completed]);
  const [spec, setSpec] = useState<CpuSpec>(
    () => bestDesign(game.research.completed, PROFILES[1].profile, defaultName(game)).spec,
  );

  const developing = game.products.find((p) => p.status === "development");
  const out = teamOutput(game, BASE_TAX_RATE);

  // Keep the spec valid when research changes (e.g. ids no longer chosen).
  const stats = evaluateDesign(spec, tech);
  const errors = validateSpec(spec, game.research.completed);
  const socket = getResearchNode(spec.socketId) as SocketNode;
  const fabs = FABS.filter((f) => fabSupportsNode(f, spec.nodeId, game.week));
  const cheapestUnit = fabs.length ? Math.min(...fabs.map((f) => stats.rawUnitCost * f.priceMult)) : null;
  const designWeeks = Math.ceil(stats.designPoints / Math.max(0.1, out.designPerWeek));
  const marketBest = bestPerfOnMarket(game);
  const relevant = game.contracts.filter((c) => c.status === "open" || c.status === "active" || c.status === "bidding");

  function update(patch: Partial<CpuSpec>) {
    setSpec((s) => ({ ...s, ...patch }));
  }

  function toggleFeature(id: string) {
    setSpec((s) => ({
      ...s,
      features: s.features.includes(id) ? s.features.filter((f) => f !== id) : [...s.features, id],
    }));
  }

  function applyProfile(profile: DesignProfile) {
    setSpec(bestDesign(game.research.completed, profile, spec.name).spec);
  }

  return (
    <div>
      {developing && (
        <Section title="In development">
          <p>
            <strong>{developing.spec.name}</strong>: {formatNumber(developing.designProgress)} of{" "}
            {formatNumber(developing.stats.designPoints)} design points. About{" "}
            {Math.ceil((developing.stats.designPoints - developing.designProgress) / Math.max(0.1, out.designPerWeek))}{" "}
            weeks left at {out.designPerWeek.toFixed(1)} points per week.
          </p>
          <ProgressBar value={developing.designProgress} max={developing.stats.designPoints} />
          <p>
            <button onClick={() => window.confirm(`Cancel ${developing.spec.name}? The mask cost is not refunded.`) && dispatch((g) => cancelDesign(g, developing.id))}>
              Cancel design
            </button>
          </p>
          <p className="muted">Your team can develop one chip at a time. You can plan the next one below.</p>
        </Section>
      )}

      <Section
        title="Design a CPU"
        actions={
          <span className="inline-actions">
            Fill with best design for:
            {PROFILES.map((p) => (
              <button key={p.label} onClick={() => applyProfile(p.profile)}>
                {p.label}
              </button>
            ))}
          </span>
        }
      >
        <div className="designer">
          <div className="form-grid">
            <label htmlFor="d-name">Name</label>
            <input id="d-name" type="text" maxLength={NAME_MAX} value={spec.name} onChange={(e) => update({ name: e.target.value })} />

            <label htmlFor="d-node">Process</label>
            <select id="d-node" value={spec.nodeId} onChange={(e) => update({ nodeId: e.target.value })}>
              {tech.processes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                  {FABS.some((f) => fabSupportsNode(f, n.id, game.week)) ? "" : " (no foundry offers it yet)"}
                </option>
              ))}
            </select>

            <label htmlFor="d-width">Architecture</label>
            <select id="d-width" value={spec.widthId} onChange={(e) => update({ widthId: e.target.value })}>
              {tech.widths.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>

            <span>Features</span>
            <div>
              {tech.features.length === 0 && <span className="muted">None researched yet.</span>}
              {tech.features.map((f) => (
                <label key={f.id} className="checkbox-line">
                  <input type="checkbox" checked={spec.features.includes(f.id)} onChange={() => toggleFeature(f.id)} />
                  {f.name} <span className="muted">(+{Math.round((f.ipcMult - 1) * 100)}% per clock, ×{f.transistorMult} transistors)</span>
                </label>
              ))}
            </div>

            <label htmlFor="d-socket">Socket</label>
            <select id="d-socket" value={spec.socketId} onChange={(e) => update({ socketId: e.target.value })}>
              {tech.sockets.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} (max {n.maxPowerW} W)
                </option>
              ))}
            </select>

            <label htmlFor="d-cores">Cores</label>
            <div>
              <input
                id="d-cores"
                type="number"
                className="short-num"
                min={1}
                max={tech.maxCores}
                value={spec.cores}
                onChange={(e) => update({ cores: Math.max(1, Math.min(tech.maxCores, Math.round(Number(e.target.value) || 1))) })}
              />
              <span className="hint"> Max {tech.maxCores} (research multi-core designs for more).</span>
            </div>

            <label htmlFor="d-clock">Clock</label>
            <div className="slider-row">
              <input
                id="d-clock"
                type="range"
                min={1}
                max={tech.maxClockMHz}
                step={tech.maxClockMHz > 200 ? 10 : 1}
                value={spec.clockMHz}
                onChange={(e) => update({ clockMHz: Number(e.target.value) })}
              />
              <span className="num">{formatClock(spec.clockMHz)}</span>
              <span className="hint">max {formatClock(tech.maxClockMHz)}</span>
            </div>
          </div>

          <div>
            <KeyValue
              rows={[
                ["Performance", <span className="num">{formatPerf(stats.perf)} <span className="muted">(best on market: {formatPerf(marketBest)})</span></span>],
                ["Power", <span className={`num ${stats.powerW > socket.maxPowerW ? "bad" : ""}`}>{stats.powerW.toFixed(1)} W <span className="muted">(socket max {socket.maxPowerW} W)</span></span>],
                ["Temperature", <span className={`num ${stats.tempC > MAX_SAFE_TEMP_C ? "bad" : stats.tempC > HOT_TEMP_C ? "warn" : ""}`}>{Math.round(stats.tempC)} °C <span className="muted">(hot above {HOT_TEMP_C}, unstable above {MAX_SAFE_TEMP_C})</span></span>],
                ["Transistors", <span className="num">{formatTransistors(stats.transistorsM)}</span>],
                ["Die area", <span className="num">{stats.dieAreaMm2.toFixed(1)} mm²</span>],
                ["Yield", <span className="num">{formatPercent(stats.yield)}</span>],
                ["Unit cost", <span className="num">{cheapestUnit === null ? "No foundry offers this process yet" : `from ${formatMoneyCents(cheapestUnit)}`}</span>],
                ["Design work", <span className="num">{formatNumber(stats.designPoints)} points (about {designWeeks} weeks)</span>],
                ["Masks and tooling", <span className="num">{formatMoney(stats.maskCost)}</span>],
              ]}
            />
          </div>
        </div>

        {errors.length > 0 && (
          <div className="error-box">
            {errors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}
        <p>
          <button
            className="primary"
            disabled={errors.length > 0 || Boolean(developing)}
            onClick={() => {
              if (dispatch((g) => startDesign(g, spec))) {
                // Suggest a fresh name for the next design.
                setSpec((s) => ({ ...s, name: `${game.company.logo.text || "X"}-${(game.products.length + 2) * 100}` }));
              }
            }}
          >
            Start design ({formatMoney(stats.maskCost)})
          </button>
          {developing && <span className="hint"> Finish or cancel {developing.spec.name} first.</span>}
        </p>
      </Section>

      <Section title="Contract check">
        {relevant.length === 0 ? (
          <p className="muted">No open or active contracts.</p>
        ) : (
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Client</th>
                <th>Status</th>
                <th>Performance</th>
                <th>Power</th>
                <th>Temperature</th>
              </tr>
            </thead>
            <tbody>
              {relevant.map((c) => {
                const m = meetsContract(stats, c);
                return (
                  <tr key={c.id}>
                    <td>{getClient(c.clientId).name}</td>
                    <td>{c.status === "open" ? "Offer" : c.status === "bidding" ? "Bid placed" : "Won"}</td>
                    <td>
                      <Check ok={m.perf} /> <span className="muted num">≥ {formatPerf(c.minPerf)}</span>
                    </td>
                    <td>
                      <Check ok={m.power} /> <span className="muted num">≤ {c.maxPowerW} W</span>
                    </td>
                    <td>
                      <Check ok={m.temp} /> <span className="muted num">≤ {c.maxTempC} °C</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
