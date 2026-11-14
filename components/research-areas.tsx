import { Fingerprint, ScanLine, TerminalSquare } from 'lucide-react';
import { researchAreas } from '@/lib/research';
export function ResearchAreas() {
  return (
    <div className="research-grid">
      {researchAreas.map((area, i) => {
        const Icon = [Fingerprint, ScanLine, TerminalSquare][i];
        return (
          <div className={`research-card tone-${area.tone}`} key={area.title}>
            <div className="research-card-top">
              <span className="work-icon">
                <Icon size={24} strokeWidth={1.7} />
              </span>
              <span className="category-label">{area.label}</span>
            </div>
            <h3>{area.title}</h3>
            <p>{area.description}</p>
            <div className="tags">
              {area.topics.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
