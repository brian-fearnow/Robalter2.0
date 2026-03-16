import type { AppState } from '../../hooks/useAppState';

interface BaseballResultsProps {
  appState: AppState;
}

export function BaseballResults({ appState }: BaseballResultsProps) {
  const { activePlayers, baseballStake, settings, computeBaseballTotals } = appState;
  const res = computeBaseballTotals();

  return (
    <div className="card result-seg-card">
      <h3>Baseball Points</h3>
      <div className="baseball-results-grid">
        <div className="bb-res-header">
          <span>Player</span><span>F9 / B9</span><span>Total</span><span>Payout</span>
        </div>
        {activePlayers.slice(0, 3).map((p, i) => (
          <div key={p.id} className="bb-res-row">
            <strong>{p.name || `Player ${i + 1}`}</strong>
            <span className="bb-res-split">{res.frontPoints[i]} / {res.backPoints[i]}</span>
            <span className="bb-res-total">{res.points[i]}</span>
            <strong className={res.payouts[i] >= 0 ? 'pos' : 'neg'}>
              {res.payouts[i] >= 0 ? `+$${res.payouts[i]}` : `-$${Math.abs(res.payouts[i])}`}
            </strong>
          </div>
        ))}
        <div className="bb-explanation">
          <p>Payouts: Differences in total points between each player pair x ${baseballStake}/pt.</p>
          {settings.useBaseballDoubleBackNine && (
            <p style={{ marginTop: '4px', color: 'var(--mackenzie-green)', fontWeight: '600' }}>
              * Back nine point totals are doubled in the final calculation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
