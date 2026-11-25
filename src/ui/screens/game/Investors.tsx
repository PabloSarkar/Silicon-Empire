import { issueShares } from "../../../sim/actions";
import { calendarYear } from "../../../sim/calendar";
import { ledgerCosts, ledgerRevenue, shareIssueQuote, totalShares } from "../../../sim/finance";
import { KeyValue, ProgressBar, Section, TargetProgress } from "../../components/Widgets";
import { formatMoney, formatMoneyCents, formatNumber, formatPercent } from "../../format";
import { useGame, useStore } from "../../store";

export function Investors() {
  const game = useGame();
  const dispatch = useStore((s) => s.dispatch);
  const year = calendarYear(game.week);
  const ytd = ledgerRevenue(game.ledger) - ledgerCosts(game.ledger);
  const target = game.investors.expectation;
  const total = totalShares(game);
  const issue = shareIssueQuote(game);

  return (
    <div>
      <Section title="The board">
        <p className="muted">
          The board sets a net profit target each year. Beat it for a cash bonus and more goodwill; miss it and goodwill falls. If goodwill reaches
          zero, the board replaces you and the game ends.
        </p>
        <KeyValue
          rows={[
            ["Goodwill", <span className={`num ${game.investors.goodwill < 25 ? "bad" : ""}`}>{Math.round(game.investors.goodwill)} / 100</span>],
            [`${year} target (net profit)`, <span className="num">{formatMoney(target)}</span>],
            [`${year} profit so far (before tax)`, <span className={`num ${ytd < 0 ? "bad" : ""}`}>{formatMoney(ytd)}</span>],
          ]}
        />
        <TargetProgress profit={ytd} target={target} format={formatMoney} />
        <ProgressBar value={game.investors.goodwill} max={100} label="Goodwill" />
      </Section>

      <Section title="Shareholders">
        <table className="data-table compact">
          <thead>
            <tr>
              <th>Holder</th>
              <th>Shares</th>
              <th>Stake</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{game.ceo.name} (founder)</td>
              <td className="num">{formatNumber(game.investors.founderShares)}</td>
              <td className="num">{formatPercent(game.investors.founderShares / total, 1)}</td>
              <td className="num">{formatMoney(game.investors.founderShares * game.sharePrice)}</td>
            </tr>
            <tr>
              <td>Investors (the board)</td>
              <td className="num">{formatNumber(game.investors.investorShares)}</td>
              <td className="num">{formatPercent(game.investors.investorShares / total, 1)}</td>
              <td className="num">{formatMoney(game.investors.investorShares * game.sharePrice)}</td>
            </tr>
          </tbody>
        </table>
        <p>
          Share price: <strong className="num">{formatMoneyCents(game.sharePrice)}</strong>. Company value:{" "}
          <span className="num">{formatMoney(game.sharePrice * total)}</span>.
        </p>
        <p>
          <button
            disabled={game.investors.lastIssueYear === year}
            onClick={() =>
              window.confirm(`Sell ${formatNumber(issue.shares)} new shares for about ${formatMoney(issue.cash)}? Your stake shrinks and goodwill drops by 3.`) &&
              dispatch(issueShares)
            }
          >
            Issue new shares (raise {formatMoney(issue.cash)})
          </button>{" "}
          <span className="hint">Once per year. Needs goodwill of 20 or more.</span>
        </p>
      </Section>

      <Section title="Past years">
        {game.years.length === 0 ? (
          <p className="muted">The first review happens at the end of {year}.</p>
        ) : (
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Year</th>
                <th>Revenue</th>
                <th>Net profit</th>
                <th>Target</th>
                <th>Result</th>
                <th>Bonus</th>
                <th>Goodwill</th>
              </tr>
            </thead>
            <tbody>
              {[...game.years].reverse().map((y) => (
                <tr key={y.year}>
                  <td className="num">{y.year}</td>
                  <td className="num">{formatMoney(y.revenue)}</td>
                  <td className={`num ${y.netProfit < 0 ? "bad" : ""}`}>{formatMoney(y.netProfit)}</td>
                  <td className="num">{formatMoney(y.expectation)}</td>
                  <td className={y.met ? "ok" : "bad"}>{y.met ? "Beat target" : "Missed"}</td>
                  <td className="num">{y.reward ? formatMoney(y.reward) : "—"}</td>
                  <td className="num">{y.goodwillChange > 0 ? `+${y.goodwillChange}` : y.goodwillChange}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
