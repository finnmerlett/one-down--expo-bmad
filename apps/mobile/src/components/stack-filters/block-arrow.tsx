import Svg, { Path } from 'react-native-svg';

// v1.5 block arrows (spec §2 "Arrows"): outlined block arrows on a 4-unit
// shaft / 11-unit head, drawn in the label's own ink so they read as part of
// the word. Paths lifted verbatim from the design file's icon masks.
const RIGHT_PATH =
  'M3.7 10h7.1V6.5a1.15 1.15 0 0 1 1.87-.9l6.3 5.5a1.15 1.15 0 0 1 0 1.8l-6.3 5.5a1.15 1.15 0 0 1-1.87-.9V14H3.7A1.45 1.45 0 0 1 3.7 10z';
const DOWN_PATH =
  'M4 5.5h8.5a1.5 1.5 0 0 1 1.5 1.5v5.35h2.9a1.15 1.15 0 0 1 .84 1.93l-4.87 5.34a1.15 1.15 0 0 1-1.7 0L6.3 14.28A1.15 1.15 0 0 1 7.14 12.35H10V9.5H4a2 2 0 0 1 0-4z';

export function BlockArrow({
  direction,
  size = 15,
  color,
}: {
  direction: 'right' | 'down';
  size?: number;
  /** Ink colour — pass the resolved hex/rgb of the neighbouring label. */
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={direction === 'right' ? RIGHT_PATH : DOWN_PATH}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
