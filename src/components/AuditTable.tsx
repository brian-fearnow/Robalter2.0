import type { HoleAuditEntry, IndHoleAuditEntry } from '../types';

interface AuditTableProps {
  entries: HoleAuditEntry[] | IndHoleAuditEntry[];
  label1: string;
  label2: string;
  isPressAudit?: boolean;
  isIndependent?: boolean;
}

export function AuditTable({ entries, label1, label2, isPressAudit = false, isIndependent = false }: AuditTableProps) {
  return (
    <div className={`audit-table${isPressAudit ? ' press-audit' : ''}`}>
      <div className="audit-header">
        <span>H</span>
        <span>{label1}</span>
        <span>{label2}</span>
        <span>+/-</span>
      </div>
      {entries.map(h => {
        if (isIndependent) {
          const entry = h as IndHoleAuditEntry;
          return (
            <div key={entry.hole} className="audit-row">
              <span>{entry.hole}</span>
              <span>{entry.p1Gross === entry.p1Net ? entry.p1Net : `${entry.p1Gross}/${entry.p1Net}`}</span>
              <span>{entry.p2Gross === entry.p2Net ? entry.p2Net : `${entry.p2Gross}/${entry.p2Net}`}</span>
              <strong>{entry.running === 0 ? 'AS' : entry.running > 0 ? `+${entry.running}` : entry.running}</strong>
            </div>
          );
        } else {
          const entry = h as HoleAuditEntry;
          return (
            <div key={entry.hole} className="audit-row">
              <span>{entry.hole}</span>
              <span>{entry.t1Gross === entry.t1Net ? entry.t1Net : `${entry.t1Gross}/${entry.t1Net}`}</span>
              <span>{entry.t2Gross === entry.t2Net ? entry.t2Net : `${entry.t2Gross}/${entry.t2Net}`}</span>
              <strong>
                {entry.running === 0 ? 'AS' : entry.running > 0 ? `+${entry.running}` : entry.running}
                {entry.isTieBreaker ? ' (TB)' : ''}
              </strong>
            </div>
          );
        }
      })}
    </div>
  );
}
