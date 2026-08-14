import { CARD, LAVENDER, LIGHT, SKY, WHITE } from "../../constants/colors";
import { RADIUS_MAX, RADIUS_MIN, RADIUS_STEP } from "../../data/users";

/** Labelled stops. Deliberately uneven — the near end is worth finer marks. */
const TICKS = [0.5, 1, 2, 3, 4, 5];

/** Width of the drawn thumb, in px. The native input's thumb is sized to match. */
const THUMB = 24;

/**
 * Where a value's centre sits along the track.
 *
 * A thumb can't hang off either end, so its centre travels between THUMB/2 and
 * (width − THUMB/2), not 0 and width. Every mark has to use this same inset or
 * it drifts out of step with the thumb — and because the ticks are unevenly
 * spaced in value, spreading them evenly across the row (what `justify-between`
 * does) puts every interior label under the wrong point on the track.
 */
function centerAt(value: number) {
  const ratio = (value - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN);
  return `calc(${ratio * 100}% + ${(0.5 - ratio) * THUMB}px)`;
}

export function RadiusSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (miles: number) => void;
}) {
  return (
    <div>
      <div className="relative mb-3">
        {/* Track */}
        <div className="h-3 rounded-full w-full" style={{ background: CARD }} />
        {/* Filled portion, stopping under the thumb's centre */}
        <div className="absolute top-0 left-0 h-3 rounded-full pointer-events-none"
          style={{ width: centerAt(value), background: `linear-gradient(90deg, ${SKY}, ${LAVENDER})` }} />
        {/* Thumb */}
        <div className="absolute top-1/2 rounded-full pointer-events-none"
          style={{
            width: THUMB, height: THUMB,
            left: centerAt(value),
            transform: "translate(-50%, -50%)",
            background: WHITE,
            border: `3px solid ${SKY}`,
            boxShadow: `0 2px 8px ${SKY}50`,
          }} />
        {/* Invisible native input overlaid for pointer and keyboard control */}
        <input
          type="range"
          min={RADIUS_MIN} max={RADIUS_MAX} step={RADIUS_STEP}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label="Alert radius in miles"
          className="radius-slider absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: "100%" }}
        />
      </div>

      {/* Tick marks + labels, pinned to their true positions on the track above */}
      <div className="relative h-7">
        {TICKS.map((v) => (
          <div key={v} className="absolute top-0 flex flex-col items-center gap-1"
            style={{ left: centerAt(v), transform: "translateX(-50%)" }}>
            <div className="w-0.5 h-1.5 rounded-full" style={{ background: value >= v ? SKY : LIGHT }} />
            <span className="text-xs font-bold" style={{ color: value === v ? SKY : LIGHT }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
