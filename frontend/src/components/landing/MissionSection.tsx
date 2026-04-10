import { useScrollReveal } from '../../hooks/useScrollReveal';
import PhilippinesMap from './PhilippinesMap';

function MissionSection() {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section
      id="mission"
      className="mission-split reveal-section"
      aria-labelledby="mission-title"
      ref={ref}
    >
      <div className="mission-split-left">
        <PhilippinesMap />
      </div>
      <div className="mission-split-right">
        <span className="landing-eyebrow">Our Mission</span>
        <h2 id="mission-title" className="landing-heading">
          Every child deserves a chance to heal&nbsp;and&nbsp;thrive
        </h2>
        <p className="landing-lead">
          Havyn is a nonprofit organization dedicated to operating safe homes
          for girls in the Philippines who are survivors of sexual abuse and
          sex trafficking. We coordinate with local partners and
          international donors to fund protection, rehabilitation, education,
          health services, and reintegration.
        </p>
        <p className="landing-lead">
          Our network of safe houses spans the Philippine archipelago,
          providing around-the-clock care and a path toward a brighter
          future. Every donation directly supports a child on her journey
          from survival to strength.
        </p>
      </div>
    </section>
  );
}

export default MissionSection;
