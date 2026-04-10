interface WaveDividerProps {
  fill?: string;
  flip?: boolean;
  className?: string;
  layered?: boolean;
}

function WaveDivider({
  fill = 'var(--surface)',
  flip = false,
  className = '',
  layered = false,
}: WaveDividerProps) {
  if (layered) {
    return (
      <div className="wave-divider-layered" aria-hidden="true">
        <svg
          className="wave-back"
          viewBox="0 0 1440 180"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,100 C320,180 620,40 960,100 C1160,140 1340,80 1440,90 L1440,180 L0,180 Z"
            fill="var(--accent)"
          />
        </svg>
        <svg
          className="wave-front"
          viewBox="0 0 1440 180"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,120 C280,60 560,160 840,110 C1080,70 1300,130 1440,100 L1440,180 L0,180 Z"
            fill="var(--surface)"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`wave-divider${flip ? ' wave-divider-flip' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,80 C240,130 480,10 720,60 C960,110 1200,20 1440,80 L1440,120 L0,120 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}

export default WaveDivider;
