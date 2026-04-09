import { Link } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="hero-band">
        <h1>Safe Homes. Brighter Futures.</h1>
        <p>
          Havyn protects and empowers girls in the Philippines who are survivors
          of abuse and trafficking &mdash; providing safety, healing, education,
          and a path toward a new beginning.
        </p>
        <div className="hero-actions">
          <Link to="/login" className="btn-hero-primary">
            Donate Now
          </Link>
          <a href="#mission" className="btn-hero-secondary">
            Learn More
          </a>
        </div>
      </section>

      {/* ── Mission ── */}
      <section id="mission" className="landing-section mission-section">
        <h2 className="section-heading">Our Mission</h2>
        <p className="section-body">
          Havyn is a nonprofit organization dedicated to operating safe homes for
          girls in the Philippines who are survivors of sexual abuse and sex
          trafficking. We coordinate with local partners and international donors
          to fund protection, rehabilitation, education, health services, and
          reintegration &mdash; because every child deserves a chance to heal and
          thrive.
        </p>
      </section>

      {/* ── Impact Stats ── */}
      <section className="landing-section">
        <h2 className="section-heading">Our Impact</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">150+</span>
            <span className="stat-label">Girls Supported</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">6</span>
            <span className="stat-label">Safe Houses</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">78%</span>
            <span className="stat-label">Reintegration Success</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">500+</span>
            <span className="stat-label">Donors Worldwide</span>
          </div>
        </div>
      </section>

      {/* ── How We Help ── */}
      <section className="landing-section how-we-help-section">
        <h2 className="section-heading">How We Help</h2>
        <div className="pillars-grid">
          <div className="pillar-card">
            <div className="pillar-icon">&#x1F3E0;</div>
            <h3>Caring</h3>
            <p>
              Home visitations and family assessments that ensure every girl has a
              safe environment and a clear path forward.
            </p>
          </div>
          <div className="pillar-card">
            <div className="pillar-icon">&#x1F49C;</div>
            <h3>Healing</h3>
            <p>
              Counseling sessions and therapeutic interventions that support
              emotional recovery and long-term wellbeing.
            </p>
          </div>
          <div className="pillar-card">
            <div className="pillar-icon">&#x1F4DA;</div>
            <h3>Teaching</h3>
            <p>
              Education programs from literacy to vocational skills that build
              confidence and open doors to independence.
            </p>
          </div>
          <div className="pillar-card">
            <div className="pillar-icon">&#x2696;&#xFE0F;</div>
            <h3>Legal Services</h3>
            <p>
              Legal advocacy and referrals that protect the rights of every child
              and hold abusers accountable.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-banner">
        <h2>Every Gift Changes a Life</h2>
        <p>
          Join hundreds of supporters who are making safe homes possible. Your
          contribution funds protection, healing, and hope for girls who need it
          most.
        </p>
        <Link to="/login" className="btn-hero-primary">
          Become a Donor
        </Link>
      </section>
    </>
  );
}

export default LandingPage;
