import { UserMinus, UserPlus } from 'lucide-react';
import type { Player, Partner } from '../../types';

interface PlayerEntryProps {
  player: Player;
  playerIndex: number;
  partners: Partner[];
  teeOptions: { name: string }[];
  onUpdatePlayer: (id: string, field: 'name' | 'index' | 'tee', value: string) => void;
  onClearPlayer: (id: string) => void;
  onAddPartner: (player: Player) => void;
  onLoadPartner: (playerId: string, partner: Partner) => void;
  activePlayers: Player[];
}

export function PlayerEntry({
  player,
  playerIndex,
  partners,
  teeOptions,
  onUpdatePlayer,
  onClearPlayer,
  onAddPartner,
  onLoadPartner,
  activePlayers,
}: PlayerEntryProps) {
  return (
    <div className="player-entry-row-group">
      <div className="player-entry-row">
        <input
          placeholder={`Player ${playerIndex + 1}`}
          value={player.name}
          onChange={e => onUpdatePlayer(player.id, 'name', e.target.value)}
        />
        <input
          placeholder="Idx"
          value={player.indexInput}
          onChange={e => onUpdatePlayer(player.id, 'index', e.target.value)}
        />
        <select
          value={player.selectedTeeIndex}
          onChange={e => onUpdatePlayer(player.id, 'tee', e.target.value)}
        >
          {teeOptions.map((t, idx) => (
            <option key={idx} value={idx}>{t.name}</option>
          ))}
        </select>
        <button className="icon-btn clear-player" onClick={() => onClearPlayer(player.id)}>
          <UserMinus size={14} />
        </button>
        <button className="icon-btn save-partner" onClick={() => onAddPartner(player)}>
          <UserPlus size={14} />
        </button>
      </div>
      {partners.length > 0 && !player.name && (
        <div className="partner-quick-load">
          <select
            onChange={e => {
              const pt = partners.find(pt => pt.name === e.target.value);
              if (pt) onLoadPartner(player.id, pt);
            }}
            defaultValue=""
          >
            <option value="" disabled>Load Partner...</option>
            {partners.map(pt => (
              <option
                key={pt.name}
                value={pt.name}
                disabled={activePlayers.some(ap => ap.name === pt.name)}
              >
                {pt.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
