import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';

function CtaSection() {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section className="cta-band reveal-section" ref={ref}>
      <div className="cta-overlay" aria-hidden="true" />
      <div className="cta-content">
        <span className="cta-eyebrow">Make a Difference Today</span>
        <h2>Every Gift Changes a Life</h2>
        <Link to="/login" className="hero-btn-primary">
          Become a Donor
        </Link>
      </div>
    </section>
  );
}

export default CtaSection;
