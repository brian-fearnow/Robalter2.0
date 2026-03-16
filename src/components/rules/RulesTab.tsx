import { Sliders, Check, X } from 'lucide-react';
import type { AppState } from '../../hooks/useAppState';

interface RulesTabProps {
  appState: AppState;
}

export function RulesTab({ appState }: RulesTabProps) {
  const {
    gameMode,
    settings, setSettings,
    selectedCourse,
    independentMatches,
    isLakeSelected,
    getTeamNamesByIds,
    updateIndependentMatch,
  } = appState;

  return (
    <div className="rules-view">
      <div
        className={`card ${isLakeSelected ? 'lake-theme' : ''}`}
        style={{ border: isLakeSelected ? '2px solid var(--olympic-red)' : '2px solid var(--mackenzie-green)' }}
      >
        <h3>
          {gameMode === 'wheel' ? 'The Wheel Rules' :
            gameMode === 'sixes' ? 'Sixes Rules' :
              gameMode === 'four-ball' ? 'Four Ball Rules' :
                gameMode === 'baseball' ? 'Baseball Rules' :
                  'Independent Match Rules'}
        </h3>
        <div className="rules-content">
          {gameMode === 'independent' ? (
            <section>
              <h4>Independent Matches Only</h4>
              <p>In this mode, there is no main team game. Players compete only in the independent matches you set up on the Setup tab.</p>
            </section>
          ) : gameMode === 'baseball' ? (
            <section>
              <h4>Baseball (3 Players)</h4>
              <p>On each hole, 9 points are distributed among 3 players based on net scores:</p>
              <ul>
                <li><strong>Distinct scores:</strong> 5, 3, 1 points</li>
                <li><strong>One winner, two tie for 2nd:</strong> 5, 2, 2 points</li>
                <li><strong>Two winners tie, one 3rd:</strong> 4, 4, 1 points</li>
                <li><strong>Three-way tie:</strong> 3, 3, 3 points</li>
              </ul>
              {settings.useBaseballBirdieRule && (
                <p style={{ marginTop: '8px', color: 'var(--mackenzie-green)', fontWeight: '600' }}>
                  Birdie Rule: If winner is {settings.baseballBirdieRuleType === 'gross' ? 'Gross Birdie or better' : 'Net Birdie or better'} and both others are Net Bogey or worse, winner receives all 9 points.
                </p>
              )}
            </section>
          ) : gameMode === 'wheel' ? (
            <>
              <section>
                <h4>The Wheel (5 Players)</h4>
                <p>One pair is "On the Wheel" for 6 holes. They play 3 matches simultaneously against all other 2-player combinations of the remaining 3 players.</p>
              </section>
              <section>
                <h4>Rotation</h4>
                <p>Every player must be on the wheel at least once, and no more than twice during the round.</p>
              </section>
            </>
          ) : gameMode === 'sixes' ? (
            <section>
              <h4>Sixes (4 Players)</h4>
              <p>Players compete in three distinct 6-hole matches with rotating partners. Each match is a separate bet.</p>
            </section>
          ) : (
            <section>
              <h4>Four Ball (4 Players)</h4>
              <p>Two teams of two players compete in an 18-hole match in which the lowest net score from each team is used to determine the winner of each hole.</p>
            </section>
          )}

          <section>
            <h4>Baseline Strokes</h4>
            <p>The best player in the group establishes the 0-stroke baseline. All other players receive strokes relative to this baseline.</p>
          </section>

          {gameMode === 'baseball' && (
            <section>
              <h4>Baseball Allocation</h4>
              <p>Total relative strokes are divided by 3 for each six-hole segment (similar to Sixes). A half stroke wins a point if net scores are otherwise tied.</p>
            </section>
          )}

          {gameMode !== 'four-ball' && gameMode !== 'baseball' && settings.strokeAllocation === 'divided' ? (
            <section>
              <h4>Sixes Allocation (Divided)</h4>
              <p>Total relative strokes are divided by 3 for each six-hole match.</p>
              <ul>
                {settings.remainderLogic === 'standard' ? (
                  <li>If the remainder is less than .5, strokes are rounded down. If .5 or greater, the player receives an extra <strong>half stroke (\u00BD)</strong>.</li>
                ) : (
                  <li>Any remainder (even small) results in an extra <strong>half stroke (\u00BD)</strong> for that segment.</li>
                )}
              </ul>
            </section>
          ) : (gameMode !== 'four-ball' && gameMode !== 'baseball' && (
            <section>
              <h4>Stroke Allocation (Handicap Ranking)</h4>
              <p>Strokes are applied across all 18 holes based on their handicap ranking (1-18).</p>
            </section>
          ))}

          <section>
            <h4>Betting & Tied Holes</h4>
            <p>
              {gameMode === 'baseball'
                ? 'Payouts are calculated based on the difference in total points between each pair of players.'
                : `A half stroke (1/2) wins a hole if the competitors are otherwise tied on that hole. Otherwise standard better ball scoring applies. ${settings.useSecondBallTieBreaker ? `If the match is still tied after the ${gameMode === 'four-ball' ? '9th or 18th' : 'final'} hole, the second lowest net score (2nd ball) is used as a tie-breaker.` : ''}`}
            </p>
          </section>

          {gameMode !== 'baseball' && (
            <section>
              <h4>Auto-Presses</h4>
              <p>
                {settings.useAutoPress
                  ? `A new press bet is automatically created whenever a team goes ${settings.autoPressTrigger === '2-down' ? '2-down' : 'closed out'} on the main bet or any existing press bet.`
                  : 'Automatic presses are disabled. You can manually add a press on the Results tab for any match.'}
              </p>
            </section>
          )}
        </div>
      </div>

      {/* Settings Card */}
      <div className="card settings-card">
        <h3><Sliders size={14} /> GAME SETTINGS</h3>
        <div className="settings-grid">
          {gameMode === 'baseball' && (
            <>
              <div className="setting-control-row">
                <div className="setting-info">
                  <strong>Birdie Rule</strong>
                  <p>Winner gets 9 pts if winner is Birdie or better and others are Bogey or worse</p>
                </div>
                <button
                  className={`checkbox-btn ${settings.useBaseballBirdieRule ? 'checked' : ''}`}
                  onClick={() => setSettings(s => ({ ...s, useBaseballBirdieRule: !s.useBaseballBirdieRule }))}
                >
                  {settings.useBaseballBirdieRule ? <Check size={16} /> : <X size={16} />}
                </button>
              </div>
              {settings.useBaseballBirdieRule && (
                <div className="setting-control-row">
                  <div className="setting-info">
                    <strong>Birdie Rule Type</strong>
                    <p>Rule enforced based on {settings.baseballBirdieRuleType} winning score</p>
                  </div>
                  <div className="toggle-switch-container">
                    <button
                      className={settings.baseballBirdieRuleType === 'gross' ? 'active' : ''}
                      onClick={() => setSettings(s => ({ ...s, baseballBirdieRuleType: 'gross' }))}
                    >Gross</button>
                    <button
                      className={settings.baseballBirdieRuleType === 'net' ? 'active' : ''}
                      onClick={() => setSettings(s => ({ ...s, baseballBirdieRuleType: 'net' }))}
                    >Net</button>
                  </div>
                </div>
              )}
              <div className="setting-control-row">
                <div className="setting-info">
                  <strong>Double Back Nine</strong>
                  <p>Points on holes 10-18 are worth double</p>
                </div>
                <button
                  className={`checkbox-btn ${settings.useBaseballDoubleBackNine ? 'checked' : ''}`}
                  onClick={() => setSettings(s => ({ ...s, useBaseballDoubleBackNine: !s.useBaseballDoubleBackNine }))}
                >
                  {settings.useBaseballDoubleBackNine ? <Check size={16} /> : <X size={16} />}
                </button>
              </div>
            </>
          )}

          {gameMode !== 'four-ball' && gameMode !== 'baseball' && (
            <div className="setting-control-row">
              <div className="setting-info">
                <strong>Stroke Allocation</strong>
                <p>{settings.strokeAllocation === 'divided' ? 'Spread Evenly' : 'As They Fall'}</p>
              </div>
              <div className="toggle-switch-container">
                <button
                  className={settings.strokeAllocation === 'divided' ? 'active' : ''}
                  onClick={() => setSettings(s => ({ ...s, strokeAllocation: 'divided' }))}
                >Spread Evenly</button>
                <button
                  className={settings.strokeAllocation === 'handicap' ? 'active' : ''}
                  onClick={() => setSettings(s => ({ ...s, strokeAllocation: 'handicap' }))}
                >As They Fall</button>
              </div>
            </div>
          )}

          {settings.strokeAllocation === 'divided' && gameMode !== 'four-ball' && gameMode !== 'baseball' && (
            <div className="setting-control-row">
              <div className="setting-info">
                <strong>Half Strokes</strong>
                <p>Only if remainder &gt; .5</p>
              </div>
              <button
                className={`checkbox-btn ${settings.remainderLogic === 'standard' ? 'checked' : ''}`}
                onClick={() => setSettings(s => ({ ...s, remainderLogic: s.remainderLogic === 'standard' ? 'alwaysHalf' : 'standard' }))}
              >
                {settings.remainderLogic === 'standard' ? <Check size={16} /> : <X size={16} />}
              </button>
            </div>
          )}

          {gameMode !== 'baseball' && (
            <div className="setting-control-row">
              <div className="setting-info">
                <strong>Second Ball Tie-Breaker</strong>
                <p>{gameMode === 'four-ball' ? 'Use 2nd ball on 9th and 18th holes if still tied' : 'Use 2nd ball on 6th hole if still tied'}</p>
              </div>
              <button
                className={`checkbox-btn ${settings.useSecondBallTieBreaker ? 'checked' : ''}`}
                onClick={() => setSettings(s => ({ ...s, useSecondBallTieBreaker: !s.useSecondBallTieBreaker }))}
              >
                {settings.useSecondBallTieBreaker ? <Check size={16} /> : <X size={16} />}
              </button>
            </div>
          )}

          {gameMode !== 'baseball' && (
            <div className="setting-control-row">
              <div className="setting-info">
                <strong>Auto-Press</strong>
                <p>Enable automatic press bets</p>
              </div>
              <button
                className={`checkbox-btn ${settings.useAutoPress ? 'checked' : ''}`}
                onClick={() => setSettings(s => ({ ...s, useAutoPress: !s.useAutoPress }))}
              >
                {settings.useAutoPress ? <Check size={16} /> : <X size={16} />}
              </button>
            </div>
          )}

          {gameMode !== 'baseball' && settings.useAutoPress && (
            <div className="setting-control-row">
              <div className="setting-info">
                <strong>Auto-Press Trigger</strong>
                <p>Start new press when main bet is {settings.autoPressTrigger === '2-down' ? '2-down' : 'closed out'}</p>
              </div>
              <div className="toggle-switch-container">
                <button
                  className={settings.autoPressTrigger === '2-down' ? 'active' : ''}
                  onClick={() => setSettings(s => ({ ...s, autoPressTrigger: '2-down' }))}
                >2-Down</button>
                <button
                  className={settings.autoPressTrigger === 'closed-out' ? 'active' : ''}
                  onClick={() => setSettings(s => ({ ...s, autoPressTrigger: 'closed-out' }))}
                >Closed Out</button>
              </div>
            </div>
          )}

          {independentMatches.length > 0 && (
            <div className="independent-match-presses-settings">
              <h4 className="settings-sub-header">Independent Match Auto-Press</h4>
              {independentMatches.map(match => (
                <div key={match.id} className="im-auto-press-settings-group">
                  <div className="setting-control-row nested">
                    <div className="setting-info">
                      <strong>{getTeamNamesByIds([match.player1Id])} vs {getTeamNamesByIds([match.player2Id])}</strong>
                      <p>Auto-press enabled</p>
                    </div>
                    <button
                      className={`checkbox-btn ${match.useAutoPress ? 'checked' : ''}`}
                      onClick={() => updateIndependentMatch(match.id, 'useAutoPress', !match.useAutoPress)}
                    >
                      {match.useAutoPress ? <Check size={16} /> : <X size={16} />}
                    </button>
                  </div>
                  {match.useAutoPress && (
                    <div className="setting-control-row nested">
                      <div className="setting-info">
                        <p>Trigger: {match.autoPressTrigger === 'closed-out' ? 'Closed Out' : '2-Down'}</p>
                      </div>
                      <div className="toggle-switch-container">
                        <button
                          className={(match.autoPressTrigger || '2-down') === '2-down' ? 'active' : ''}
                          onClick={() => updateIndependentMatch(match.id, 'autoPressTrigger', '2-down')}
                        >2-Down</button>
                        <button
                          className={match.autoPressTrigger === 'closed-out' ? 'active' : ''}
                          onClick={() => updateIndependentMatch(match.id, 'autoPressTrigger', 'closed-out')}
                        >Closed Out</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Suppress unused variable warning */}
          {selectedCourse && null}
        </div>
      </div>
    </div>
  );
}
