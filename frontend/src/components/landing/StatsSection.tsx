import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const STATS = [
  {
    key: 'houses',
    number: '9',
    desc: 'Safe houses across the Philippines',
    icon: (
      <svg viewBox="0 0 24 24" className="stat-icon-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 11.5L12 5l8 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 10.5V19h10v-8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'girls',
    number: '60',
    desc: 'Girls currently in our care',
    icon: (
      <svg viewBox="0 0 24 24" className="stat-icon-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
        <path d="M6.5 20c.4-3.5 2.8-5.5 5.5-5.5S17.1 16.5 17.5 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'donors',
    number: '61',
    desc: 'Donors worldwide',
    icon: (
      <svg viewBox="0 0 24 24" className="stat-icon-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

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
              <Link to="/donor" className="btn-hero-primary">
                See Donor Impact
              </Link>
            </div>
          </div>

          <div className="stats-list">
            {STATS.map((s) => (
              <div className="stat-item stagger-item" key={s.key}>
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
