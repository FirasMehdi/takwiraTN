/**
 * Aerial-view pitch illustration used wherever a terrain has no real photo
 * yet. Original artwork (inline SVG), not a stock photo — no licensing to
 * track, no external request, themes with the rest of the brand.
 */
export function TerrainIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 120"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      <rect width="200" height="120" fill="#1B7A43" />
      <rect x="4" y="4" width="192" height="112" fill="#2E9C5C" fillOpacity="0.5" />

      {/* Mowing stripes */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={4 + i * 38.4}
          y="4"
          width="19.2"
          height="112"
          fill="#FFFFFF"
          fillOpacity={i % 2 === 0 ? 0.05 : 0}
        />
      ))}

      {/* Pitch markings */}
      <rect x="14" y="14" width="172" height="92" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <line x1="100" y1="14" x2="100" y2="106" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="100" cy="60" r="16" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <circle cx="100" cy="60" r="1.5" fill="#FFFFFF" />
      <rect x="14" y="38" width="18" height="44" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <rect x="168" y="38" width="18" height="44" stroke="#FFFFFF" strokeWidth="2" fill="none" />

      {/* Ball accent */}
      <circle cx="100" cy="60" r="5" fill="#F5B301" />
    </svg>
  );
}
