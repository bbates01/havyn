import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './DonorImpactPage.css';

function DonorImpactPage() {
  useEffect(() => {
    document.title = 'Donor Impact | Havyn';
  }, []);

  return (
    <div className="donor-impact-page">
      <section className="donor-impact-layout" aria-labelledby="donor-impact-title">
        <article className="donor-impact-left">
          <div className="donor-left-content">
            <h1 id="donor-impact-title">Your support changes lives</h1>
            <p className="donor-left-intro">
              Every gift helps Havyn provide safe shelter, counseling, education,
              and long-term care for girls healing from abuse and trafficking in the
              Philippines.
            </p>

            <section className="donor-copy-block" aria-labelledby="donor-glance-title">
              <h2 id="donor-glance-title">What Your Gift Makes Possible</h2>
              <p>
                With your help, one donation becomes many moments of care over
                time. From basic essentials to long-term reintegration planning,
                your generosity helps girls move from survival to strength. Below
                is a practical application of what even a one time donation would
                provide.
              </p>
              <h3 className="donor-inline-impact-title">What a $100 Gift Can Do</h3>
              <div className="donor-gift-cards-grid donor-inline-gift-grid">
                <article className="donor-gift-card fade-in-up delay-1">
                  <span className="donor-impact-icon" aria-hidden="true">
                    <svg className="donor-impact-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 9.5L12 5l9 4.5-9 4.5L3 9.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      <path d="M7.5 12.1V15c0 2 2.1 3.5 4.5 3.5s4.5-1.5 4.5-3.5v-2.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <h3>Education</h3>
                  <p>1 year of learning materials for one child.</p>
                </article>

                <article className="donor-gift-card fade-in-up delay-2">
                  <span className="donor-impact-icon" aria-hidden="true">
                    <svg className="donor-impact-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 9h12M7.5 9V7.5c0-1.4 1.1-2.5 2.5-2.5h4c1.4 0 2.5 1.1 2.5 2.5V9M5.5 9h13l-1 10h-11z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3>Food</h3>
                  <p>110 meals provided for the safehouse.</p>
                </article>

                <article className="donor-gift-card fade-in-up delay-3">
                  <span className="donor-impact-icon" aria-hidden="true">
                    <svg className="donor-impact-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 11.5L12 5l8 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7 10.5V19h10v-8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3>Housing</h3>
                  <p>1 year of safe stay in our safehouse.</p>
                </article>

                <article className="donor-gift-card fade-in-up delay-4">
                  <span className="donor-impact-icon" aria-hidden="true">
                    <svg className="donor-impact-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 20s-6.5-4.2-8.7-8c-1.5-2.5-.6-5.8 2-7.2 2.1-1.2 4.5-.5 6 1.2 1.5-1.7 3.9-2.4 6-1.2 2.6 1.4 3.5 4.7 2 7.2C18.5 15.8 12 20 12 20z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3>Counseling</h3>
                  <p>4-6 trauma-informed sessions focused on healing and trust.</p>
                </article>
              </div>
              <div className="donor-gift-actions">
                <Link to="/login" className="donor-cta-primary">
                  Donate through Havyn
                </Link>
              </div>
            </section>

            <section className="donor-copy-block" aria-labelledby="donor-support-goes-title">
              <h2 id="donor-support-goes-title">Where Your Support Goes</h2>
              <p>
                Donations are directed toward safe shelter, counseling and healing,
                education and skills, and reintegration support. These four areas
                work together so each child receives immediate care and a path
                forward.
              </p>
              <h3 className="donor-inline-impact-title">Your Impact at a Glance</h3>
              <div className="donor-impact-cards-grid donor-inline-impact-grid">
                <article className="donor-impact-card fade-in-up delay-1">
                  <span className="donor-impact-icon" aria-hidden="true">
                    <svg className="donor-impact-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
                      <path d="M5.5 19c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="donor-impact-number">150+</span>
                  <span className="donor-impact-label">Girls supported each year</span>
                </article>

                <article className="donor-impact-card fade-in-up delay-2">
                  <span className="donor-impact-icon" aria-hidden="true">
                    <svg className="donor-impact-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 11.5L12 5l8 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7 10.5V19h10v-8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="donor-impact-number">6</span>
                  <span className="donor-impact-label">Safe homes across the Philippines</span>
                </article>

                <article className="donor-impact-card fade-in-up delay-3">
                  <span className="donor-impact-icon" aria-hidden="true">
                    <svg className="donor-impact-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 20s-6.5-4.2-8.7-8c-1.5-2.5-.6-5.8 2-7.2 2.1-1.2 4.5-.5 6 1.2 1.5-1.7 3.9-2.4 6-1.2 2.6 1.4 3.5 4.7 2 7.2C18.5 15.8 12 20 12 20z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="donor-impact-number">92%</span>
                  <span className="donor-impact-label">Funds invested in programs and care</span>
                </article>

                <article className="donor-impact-card fade-in-up delay-4">
                  <span className="donor-impact-icon" aria-hidden="true">
                    <svg className="donor-impact-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 9.5L12 5l9 4.5-9 4.5L3 9.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      <path d="M7.5 12.1V15c0 2 2.1 3.5 4.5 3.5s4.5-1.5 4.5-3.5v-2.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="donor-impact-number">100+</span>
                  <span className="donor-impact-label">Girls receiving education support</span>
                </article>
              </div>
            </section>

            <div className="donor-left-actions">
              <Link to="/login" className="donor-cta-primary">
                Donate through Havyn
              </Link>
              <Link to="/" className="donor-cta-secondary">
                Back to home
              </Link>
            </div>

            <p className="donor-page-footnote" role="note">
              Illustrative figures for demonstration purposes.
            </p>
          </div>
        </article>

        <aside className="donor-impact-right" aria-label="Photo of a girl at the beach" />
      </section>

    </div>
  );
}

export default DonorImpactPage;
