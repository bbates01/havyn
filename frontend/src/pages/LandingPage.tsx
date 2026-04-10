import HeroSection from '../components/landing/HeroSection';
import WaveDivider from '../components/landing/WaveDivider';
import MissionSection from '../components/landing/MissionSection';
import StatsSection from '../components/landing/StatsSection';
import PillarsSection from '../components/landing/PillarsSection';
import './LandingPage.css';

function LandingPage() {
  return (
    <>
      <HeroSection />
      <WaveDivider layered />
      <MissionSection />
      <StatsSection />
      <WaveDivider fill="var(--green-soft, #f0f5f1)" className="wave-on-warm" />
      <PillarsSection />
    </>
  );
}

export default LandingPage;
