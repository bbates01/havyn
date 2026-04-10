import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';

function HeroSection() {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section className="hero reveal-section" ref={ref} aria-labelledby="hero-title">
      <div className="hero-overlay" aria-hidden="true" />
      <div className="hero-content">
        <h1 id="hero-title" className="hero-title">
          Safe Homes in the Philippines.
          <br />
          Brighter Futures for Every Girl.
        </h1>
        <p className="hero-desc">
          Havyn protects and empowers girls in the Philippines who are survivors
          of abuse and trafficking&mdash;providing safety, healing, education,
          and a path toward a new beginning.
        </p>
        <div className="hero-actions">
          <Link to="/login" className="hero-btn-primary">
            Donate Now
          </Link>
          <a href="#mission" className="hero-btn-secondary">
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
