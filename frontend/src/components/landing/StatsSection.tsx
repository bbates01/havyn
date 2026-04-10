import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const STATS = [
  { icon: '🏠', number: '6', desc: 'Safe houses across the Philippines' },
  { icon: '👧', number: '150+', desc: 'Girls currently in our care' },
  { icon: '📈', number: '78%', desc: 'Successful reintegration rate' },
  { icon: '🌍', number: '500+', desc: 'Donors worldwide' },
];

function StatsSection() {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section
      className="landing-section landing-section-warm reveal-section"
      aria-labelledby="stats-title"
      ref={ref}
    >
      <div className="landing-container">
        <div className="stats-layout">
          <div className="stats-text">
            <span className="landing-eyebrow">Our Impact</span>
            <h2 id="stats-title" className="landing-heading">
              Measurable change, one&nbsp;girl at&nbsp;a&nbsp;time
            </h2>
            <p className="landing-lead">
              Every number represents a real child whose life has been
              transformed through safety, education, and compassionate care.
            </p>
            <div className="stats-actions">
              <Link to="/donor-impact" className="hero-btn-primary">
                See Donor Impact
              </Link>
            </div>
          </div>

          <div className="stats-list">
            {STATS.map((s) => (
              <div className="stat-item stagger-item" key={s.number}>
                <div className="stat-icon" aria-hidden="true">
                  {s.icon}
                </div>
                <div>
                  <span className="stat-number">{s.number}</span>
                  <span className="stat-desc">{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default StatsSection;
