import { useCallback, useRef, useState } from 'react';

const LOCATIONS = [
  { id: 'manila',    cx: '46.0%', cy: '41.2%', label: 'Manila' },
  { id: 'angeles',   cx: '44.8%', cy: '37.2%', label: 'Angeles City' },
  { id: 'cebu',      cx: '61.2%', cy: '63.8%', label: 'Cebu City' },
  { id: 'iloilo',    cx: '53.5%', cy: '60.2%', label: 'Iloilo' },
  { id: 'davao',     cx: '73.5%', cy: '79.9%', label: 'Davao' },
  { id: 'zamboanga', cx: '57.8%', cy: '77.3%', label: 'Zamboanga' },
];

const GLOW_RADIUS_PX = 48;

function PhilippinesMap() {
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [nearbyDots, setNearbyDots] = useState<Set<string>>(new Set());

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const mapWrap = mapWrapRef.current;
    if (!mapWrap) return;

    const rect = mapWrap.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const nextNearbyDots = new Set<string>();

    for (const loc of LOCATIONS) {
      const dotX = (parseFloat(loc.cx) / 100) * rect.width;
      const dotY = (parseFloat(loc.cy) / 100) * rect.height;
      const dx = mouseX - dotX;
      const dy = mouseY - dotY;
      const distance = Math.hypot(dx, dy);

      if (distance <= GLOW_RADIUS_PX) {
        nextNearbyDots.add(loc.id);
      }
    }

    setNearbyDots(nextNearbyDots);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setNearbyDots(new Set());
  }, []);

  return (
    <div className="ph-map-col">
      <div
        ref={mapWrapRef}
        className="ph-map-wrap"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src="/images/phillipines.svg"
          alt="Map of the Philippines showing Havyn safe house regions"
          className="ph-map-img"
        />
        {LOCATIONS.map((loc) => (
          <span
            key={loc.id}
            className={`ph-dot${nearbyDots.has(loc.id) ? ' ph-dot-near' : ''}`}
            style={{ left: loc.cx, top: loc.cy }}
            aria-label={loc.label}
          />
        ))}
      </div>
    </div>
  );
}

export default PhilippinesMap;
