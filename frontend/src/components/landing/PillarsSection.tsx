import { useScrollReveal } from '../../hooks/useScrollReveal';

const PILLARS = [
  {
    icon: '🏠',
    title: 'Caring',
    text: 'Home visitations and family assessments that ensure every girl has a safe environment and a clear path forward.',
  },
  {
    icon: '💜',
    title: 'Healing',
    text: 'Counseling sessions and therapeutic interventions that support emotional recovery and long-term wellbeing.',
  },
  {
    icon: '📚',
    title: 'Teaching',
    text: 'Education programs from literacy to vocational skills that build confidence and open doors to independence.',
  },
  {
    icon: '⚖️',
    title: 'Legal Services',
    text: 'Legal advocacy and referrals that protect the rights of every child and hold abusers accountable.',
  },
];

function PillarsSection() {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section
      className="landing-section landing-section-green reveal-section"
      aria-labelledby="pillars-title"
      ref={ref}
    >
      <div className="landing-container">
        <span className="landing-eyebrow landing-eyebrow-center">How We Help</span>
        <h2 id="pillars-title" className="landing-heading landing-heading-center">
          Four pillars of support
        </h2>

        <div className="pillars-grid">
          {PILLARS.map((p) => (
            <div className="pillar-card stagger-item" key={p.title}>
              <div className="pillar-icon" aria-hidden="true">
                {p.icon}
              </div>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PillarsSection;
