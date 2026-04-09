import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './DonorImpactPage.css';

function DonorImpactPage() {
  useEffect(() => {
    document.title = 'Donor Impact | Havyn';
  }, []);

  return (
    <div className="donor-impact-page">
      <section className="donor-hero" aria-labelledby="donor-impact-title">
        <h1 id="donor-impact-title">Your support changes lives</h1>
        <p>
          Every gift helps Havyn provide safe shelter, counseling, education,
          and long-term care for girls healing from abuse and trafficking in the
          Philippines.
        </p>
      </section>

      <section className="donor-section" aria-labelledby="impact-at-a-glance">
        <h2 id="impact-at-a-glance" className="donor-section-heading">
          Impact at a glance
        </h2>
        <p className="donor-section-intro">
          Together with donors and partners, we scale protection and restorative
          programs where they are needed most. The figures below are
          illustrative aggregates for our programs and may vary by reporting
          period.
        </p>
        <p className="donor-section-note" role="note">
          Illustrative figures for demonstration purposes.
        </p>
        <div className="donor-stats-grid">
          <div className="donor-stat-card">
            <span className="donor-stat-number">150+</span>
            <span className="donor-stat-label">Girls supported annually</span>
          </div>
          <div className="donor-stat-card">
            <span className="donor-stat-number">6</span>
            <span className="donor-stat-label">
              Safe homes &amp; partner sites
            </span>
          </div>
          <div className="donor-stat-card">
            <span className="donor-stat-number">92%</span>
            <span className="donor-stat-label">
              Of funds to programs &amp; care
            </span>
          </div>
        </div>
      </section>

      <section className="donor-section" aria-labelledby="where-support-goes">
        <h2 id="where-support-goes" className="donor-section-heading">
          Where your support goes
        </h2>
        <p className="donor-section-intro">
          Donations are directed toward the daily work of healing, learning, and
          building independence in a trauma-informed environment.
        </p>
        <div className="donor-pillars-grid">
          <div className="donor-pillar-card">
            <h3>Safe shelter</h3>
            <p>
              Nutritious meals, secure housing, and 24/7 care so every resident
              has stability while she heals.
            </p>
          </div>
          <div className="donor-pillar-card">
            <h3>Counseling &amp; healing</h3>
            <p>
              Licensed counseling, group support, and activities designed to
              restore confidence and emotional well-being.
            </p>
          </div>
          <div className="donor-pillar-card">
            <h3>Education &amp; skills</h3>
            <p>
              Tutoring, literacy, vocational training, and school reintegration
              to open doors for the future.
            </p>
          </div>
          <div className="donor-pillar-card">
            <h3>Reintegration</h3>
            <p>
              Family reunification when safe, transition planning, and follow-up
              so girls are supported beyond the home.
            </p>
          </div>
        </div>

        <div className="donor-cta">
          <Link to="/login" className="donor-cta-primary">
            Donate through Havyn
          </Link>
          <Link to="/" className="donor-cta-secondary">
            Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}

export default DonorImpactPage;
