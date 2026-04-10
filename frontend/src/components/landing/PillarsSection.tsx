import { useScrollReveal } from '../../hooks/useScrollReveal';

const PILLARS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="pillar-icon-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 11.5L12 5l8 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 10.5V19h10v-8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Caring',
    text: 'Home visitations and family assessments that ensure every girl has a safe environment and a clear path forward.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="pillar-icon-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 20s-6.5-4.2-8.7-8c-1.5-2.5-.6-5.8 2-7.2 2.1-1.2 4.5-.5 6 1.2 1.5-1.7 3.9-2.4 6-1.2 2.6 1.4 3.5 4.7 2 7.2C18.5 15.8 12 20 12 20z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Healing',
    text: 'Counseling sessions and therapeutic interventions that support emotional recovery and long-term wellbeing.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="pillar-icon-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 5h6.5c1.1 0 2 .9 2 2v12H6c-1.1 0-2-.9-2-2V5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M20 5h-6.5c-1.1 0-2 .9-2 2v12H18c1.1 0 2-.9 2-2V5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Teaching',
    text: 'Education programs from literacy to vocational skills that build confidence and open doors to independence.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="pillar-icon-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4v15M8 7h8M6 10l-2.5 4h5L6 10zm12 0-2.5 4h5L18 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Legal Services',
    text: 'Legal advocacy and referrals that protect the rights of every child and hold abusers accountable.',
  },
] as const;

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
