import { useEffect } from 'react';
import './AboutPage.css';

function AboutPage() {
  useEffect(() => {
    document.title = 'About | Havyn';
  }, []);

  return (
    <div className="about-page">
      <section className="about-section about-section-who" aria-labelledby="about-who-title">
        <div className="about-container about-who-grid">
          <div className="about-copy">
            <span className="about-label">Who We Are</span>
            <h2 id="about-who-title">
              A registered nonprofit built for the girls who need us most
            </h2>
            <p>
              Lighthouse Sanctuary is a 501(c)(3) organization (EIN 81-3220618)
              created to meet the needs of child survivors of sexual abuse and sex
              trafficking in the Philippines. We provide a safe haven and
              professional rehabilitation services so children can successfully
              reintegrate back into family life and society.
            </p>
            <p>
              There is a great need for residential shelters in the Philippines
              for children trapped in abuse or sexually trafficked. Lighthouse
              Sanctuary has stepped up to fill that need, serving female survivors
              between the ages of 8 and 18.
            </p>
          </div>

          <aside className="about-badge-column" aria-label="Organization registration details">
            <article className="about-badge-card">
              <span>501(c)(3) Registered Nonprofit</span>
            </article>
            <article className="about-badge-card">
              <span>EIN: 81-3220618</span>
            </article>
          </aside>
        </div>
      </section>

      <section className="about-section about-section-do" aria-labelledby="about-do-title">
        <div className="about-container">
          <span className="about-label">What We Do</span>
          <h2 id="about-do-title">From rescue to reintegration</h2>
          <p className="about-subtext">
            Every child in our care receives a full continuum of support.
          </p>

          <div className="about-cards-grid">
            <article className="about-program-card">
              <span className="about-program-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="about-program-icon-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3.5L4.5 6.3v5.2c0 4.4 2.8 7.9 7.5 9 4.7-1.1 7.5-4.6 7.5-9V6.3L12 3.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </span>
              <h3>Safe Shelter</h3>
              <p>
                Two residential homes housing up to 20 children each, providing
                security, daily needs, and a nurturing environment.
              </p>
            </article>

            <article className="about-program-card">
              <span className="about-program-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="about-program-icon-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 20s-6.5-4.2-8.7-8c-1.5-2.5-.6-5.8 2-7.2 2.1-1.2 4.5-.5 6 1.2 1.5-1.7 3.9-2.4 6-1.2 2.6 1.4 3.5 4.7 2 7.2C18.5 15.8 12 20 12 20z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </span>
              <h3>Counseling &amp; Healing</h3>
              <p>
                Professional counseling and medical services tailored to each
                child&apos;s trauma history and recovery needs.
              </p>
            </article>

            <article className="about-program-card">
              <span className="about-program-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="about-program-icon-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6.8L12 3l9 3.8-9 3.8-9-3.8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M7 10.1V14c0 2.1 2.2 3.8 5 3.8s5-1.7 5-3.8v-3.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <h3>Education</h3>
              <p>
                Individualized education plans so every child continues learning
                and building skills for her future.
              </p>
            </article>

            <article className="about-program-card">
              <span className="about-program-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="about-program-icon-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 11.5L12 5l8 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 10.5V19h10v-8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h3>Family Reintegration</h3>
              <p>
                Coordination with the DSWD to place children safely with birth,
                foster, or adoptive families - supported by family counseling
                throughout the transition.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="about-section about-section-process" aria-labelledby="about-process-title">
        <div className="about-container">
          <span className="about-label">The Process</span>
          <h2 id="about-process-title">How a child enters our care</h2>

          <div className="about-steps" role="list">
            <article className="about-step" role="listitem">
              <div className="about-step-number">1</div>
              <h3>Rescue</h3>
              <p>
                Children are rescued by local police or anti-trafficking agents.
              </p>
            </article>

            <article className="about-step" role="listitem">
              <div className="about-step-number">2</div>
              <h3>Referral</h3>
              <p>
                Cases are referred through the Department of Social Welfare and
                Development (DSWD) to Lighthouse Sanctuary.
              </p>
            </article>

            <article className="about-step" role="listitem">
              <div className="about-step-number">3</div>
              <h3>Transition</h3>
              <p>
                Our social workers help each child settle into her new home and
                begin her healing journey.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
