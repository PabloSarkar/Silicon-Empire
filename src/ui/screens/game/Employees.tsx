import { BASE_TAX_RATE, HIRING_FEE_WEEKS, SEVERANCE_WEEKS } from "../../../data/balance";
import { EMPLOYEE_TYPES, STATS, getEmployeeType } from "../../../data/employees";
import { fireEmployee, hireCandidate } from "../../../sim/actions";
import { calendarYear } from "../../../sim/calendar";
import { ceoStats, teamOutput, weeklySalaries } from "../../../sim/employees";
import type { Candidate, Employee } from "../../../sim/types";
import { KeyValue, Section } from "../../components/Widgets";
import { formatMoney, formatPercent } from "../../format";
import { useGame, useStore } from "../../store";
import { getArchetype } from "../../../data/archetypes";
import { ATTRACTS } from "../../../data/employees";

function StatCells({ person }: { person: Candidate }) {
  const def = getEmployeeType(person.type);
  return (
    <>
      {STATS.map((s) => (
        <td key={s.id} className={`num stat ${def.primary.includes(s.id) ? "stat-main" : ""}`}>
          {person.stats[s.id]}
        </td>
      ))}
    </>
  );
}

function StatHeaders() {
  return (
    <>
      {STATS.map((s) => (
        <th key={s.id} className="stat" title={`${s.name}: ${s.effect}`}>
          {s.short}
        </th>
      ))}
    </>
  );
}

export function Employees() {
  const game = useGame();
  const dispatch = useStore((s) => s.dispatch);
  const out = teamOutput(game, BASE_TAX_RATE);
  const attracted = ATTRACTS[game.ceo.archetype].map((t) => getEmployeeType(t).name).join(", ");

  function onFire(e: Employee) {
    if (window.confirm(`Let ${e.name} go? Severance is ${formatMoney(e.salary * SEVERANCE_WEEKS)} and the team's morale drops a little.`)) {
      dispatch((g) => fireEmployee(g, e.id));
    }
  }

  return (
    <div>
      <Section title="Team output">
        <div className="two-col">
          <KeyValue
            rows={[
              ["Research", `${out.researchPerWeek.toFixed(1)} points/week`],
              ["Design", `${out.designPerWeek.toFixed(1)} points/week`],
              ["Production quality", formatPercent(Math.min(1, out.production))],
              ["Marketing bonus", `+${formatPercent(out.marketing)}`],
            ]}
          />
          <KeyValue
            rows={[
              ["Contract win bonus", `+${formatPercent(out.negotiation)}`],
              ["Contract margin bonus", `+${formatPercent(out.contractMargin)}`],
              ["Retailer cut", formatPercent(out.retailCut)],
              ["Tax rate", formatPercent(out.taxRate)],
            ]}
          />
        </div>
        <p className="muted">
          Payroll: {formatMoney(weeklySalaries(game))} per week. The CEO ({getArchetype(game.ceo.archetype).name}) also works and is counted in the output.
          Your CEO attracts: {attracted}.
        </p>
      </Section>

      <Section title={`Staff (${game.employees.length})`}>
        <table className="data-table compact staff">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <StatHeaders />
              <th>Happy</th>
              <th>Salary/wk</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr className="row-ceo">
              <td>{game.ceo.name}</td>
              <td>CEO</td>
              {STATS.map((s) => (
                <td key={s.id} className="num stat">{ceoStats(game)[s.id]}</td>
              ))}
              <td />
              <td />
              <td />
            </tr>
            {game.employees.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>{getEmployeeType(e.type).name}</td>
                <StatCells person={e} />
                <td className={`num ${e.happiness < 40 ? "bad" : ""}`}>{Math.round(e.happiness)}</td>
                <td className="num">{formatMoney(e.salary)}</td>
                <td>
                  <button onClick={() => onFire(e)}>Fire</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Candidates">
        <p className="muted">
          New candidates arrive every few weeks (next group in {game.nextCandidatesWeek - game.week} weeks). Hiring costs {HIRING_FEE_WEEKS} weeks of salary up
          front. Year {calendarYear(game.week)} salaries.
        </p>
        <table className="data-table compact staff">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <StatHeaders />
              <th>Salary/wk</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {game.candidates.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{getEmployeeType(c.type).name}</td>
                <StatCells person={c} />
                <td className="num">{formatMoney(c.salary)}</td>
                <td>
                  <button onClick={() => dispatch((g) => hireCandidate(g, c.id))}>Hire ({formatMoney(c.salary * HIRING_FEE_WEEKS)})</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Roles">
        <table className="data-table compact">
          <tbody>
            {EMPLOYEE_TYPES.map((t) => (
              <tr key={t.id}>
                <th>{t.name}</th>
                <td>{t.role}</td>
                <td className="muted">Main stat: {t.primary.map((p) => STATS.find((s) => s.id === p)!.name).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
