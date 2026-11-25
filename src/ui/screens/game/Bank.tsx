import { useState } from "react";
import { BANKRUPTCY_WEEKS, BASE_TAX_RATE, LOAN_TERMS_YEARS, MAX_LOANS } from "../../../data/balance";
import { repayLoan, takeLoan } from "../../../sim/actions";
import { calendarYear, formatDate } from "../../../sim/calendar";
import { teamOutput } from "../../../sim/employees";
import {
  EXPENSE_LABELS,
  ledgerCosts,
  ledgerRevenue,
  loanQuote,
  maxLoanAmount,
  totalDebt,
  type ExpenseKey,
} from "../../../sim/finance";
import type { Ledger } from "../../../sim/types";
import { KeyValue, LineChart, Section } from "../../components/Widgets";
import { formatMoney, formatMoneyCents, formatMoneyShort, formatPercent } from "../../format";
import { useGame, useStore } from "../../store";

function IncomeStatement({ current, previous, year }: { current: Ledger; previous: Ledger | null; year: number }) {
  const rows: { label: string; get: (l: Ledger) => number; strong?: boolean }[] = [
    { label: "Chip sales (after retailer cut)", get: (l) => l.salesRevenue },
    { label: "Contracts", get: (l) => l.contractRevenue },
    { label: "Total revenue", get: ledgerRevenue, strong: true },
    ...(Object.keys(EXPENSE_LABELS) as ExpenseKey[]).map((k) => ({ label: EXPENSE_LABELS[k], get: (l: Ledger) => -l[k] })),
    { label: "Net profit", get: (l) => ledgerRevenue(l) - ledgerCosts(l) - l.tax, strong: true },
  ];
  return (
    <table className="data-table compact">
      <thead>
        <tr>
          <th />
          <th>{year} so far</th>
          {previous && <th>{year - 1}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className={r.strong ? "row-strong" : ""}>
            <td>{r.label}</td>
            <td className={`num ${r.get(current) < 0 ? "bad" : ""}`}>{formatMoney(r.get(current))}</td>
            {previous && <td className={`num ${r.get(previous) < 0 ? "bad" : ""}`}>{formatMoney(r.get(previous))}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Bank() {
  const game = useGame();
  const dispatch = useStore((s) => s.dispatch);
  const max = maxLoanAmount(game);
  const [amount, setAmount] = useState(Math.min(100_000, max));
  const [term, setTerm] = useState<number>(2);
  const quote = loanQuote(game, amount, term);
  const out = teamOutput(game, BASE_TAX_RATE);
  const year = calendarYear(game.week);

  return (
    <div>
      <Section title="Credit">
        <KeyValue
          rows={[
            ["Credit score", <span className="num">{Math.round(game.bank.creditScore)} <span className="muted">(300–850)</span></span>],
            ["Cash", <span className={`num ${game.company.cash < 0 ? "bad" : ""}`}>{formatMoney(game.company.cash)}</span>],
            ["Debt", <span className="num">{formatMoney(totalDebt(game))}</span>],
            ["Bank will lend up to", <span className="num">{formatMoney(max)}</span>],
          ]}
        />
        <p className="muted">
          Paying loans on time raises your score; taking a loan lowers it, and longer loans lower it more. Negative cash hurts it every week, and{" "}
          {BANKRUPTCY_WEEKS} weeks of negative cash means bankruptcy. Finance staff slowly improve the score.
        </p>
      </Section>

      <Section title="Loans">
        {game.bank.loans.length === 0 ? (
          <p className="muted">No loans.</p>
        ) : (
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Taken</th>
                <th>Borrowed</th>
                <th>Still owed</th>
                <th>APR</th>
                <th>Weekly payment</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {game.bank.loans.map((l) => (
                <tr key={l.id}>
                  <td className="num">{formatDate(l.takenWeek)}</td>
                  <td className="num">{formatMoney(l.principal)}</td>
                  <td className="num">{formatMoney(l.balance)}</td>
                  <td className="num">{l.aprPct}%</td>
                  <td className="num">{formatMoneyCents(l.weeklyPayment)}</td>
                  <td>
                    <button onClick={() => dispatch((g) => repayLoan(g, l.id))}>Repay now</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h4>New loan</h4>
        <div className="form-grid">
          <label htmlFor="loan-amount">Amount</label>
          <input
            id="loan-amount"
            type="number"
            className="mid-num"
            min={1000}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          />
          <label htmlFor="loan-term">Term</label>
          <select id="loan-term" value={term} onChange={(e) => setTerm(Number(e.target.value))}>
            {LOAN_TERMS_YEARS.map((t) => (
              <option key={t} value={t}>
                {t} year{t > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
        <KeyValue
          rows={[
            ["Interest rate", `${quote.aprPct}% APR`],
            ["Weekly payment", formatMoneyCents(quote.weeklyPayment)],
            ["Total repaid", formatMoney(quote.totalRepaid)],
            ["Credit score change", `−${quote.scoreHit}`],
          ]}
        />
        <p>
          <button className="primary" disabled={game.bank.loans.length >= MAX_LOANS} onClick={() => dispatch((g) => takeLoan(g, amount, term))}>
            Take loan
          </button>{" "}
          <span className="hint">Up to {MAX_LOANS} loans at once.</span>
        </p>
      </Section>

      <Section title="Finances">
        <IncomeStatement current={game.ledger} previous={game.lastLedger} year={year} />
        <p className="muted">
          Tax ({formatPercent(out.taxRate)} after Tax Specialists) is charged on the year's profit at year end. Loan repayments are not costs; only
          interest is.
        </p>
        <h4>Cash</h4>
        <LineChart points={game.history.map((h) => ({ x: h.week, y: h.cash }))} format={formatMoneyShort} />
        <h4>Share price</h4>
        <LineChart points={game.history.map((h) => ({ x: h.week, y: h.sharePrice }))} format={(y) => formatMoneyCents(y)} />
      </Section>
    </div>
  );
}
