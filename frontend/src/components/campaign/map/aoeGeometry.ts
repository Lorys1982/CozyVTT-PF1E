/**
 * aoeGeometry.ts
 * Grid snapping for area-of-effect templates.
 *
 * AoE shapes used to be anchored at the *centre of the hovered square*, so a
 * 10 ft cube on a 5 ft grid — exactly two squares across — straddled four
 * squares by half a square in each direction instead of covering two cleanly.
 * The same offset skewed lines and cones.
 *
 * The rule that fixes it is the parity rule familiar from grid play: a span an
 * **even** number of squares wide has its edges on grid lines when it is
 * centred on a grid *intersection*, and an **odd** span does when it is centred
 * on a square *centre*. Snapping each axis by the parity of the span across it
 * puts every edge on a grid line.
 *
 * All coordinates here are **map pixels with a top-left origin**, matching
 * coords.ts — grid lines fall on exact multiples of `gridSize`, so no
 * bottom-left flip is involved.
 */

export interface Pt {
  x: number;
  y: number;
}

/** Snap a coordinate to the nearest grid line. */
export function snapToGridLine(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/** Snap a coordinate to the nearest square centre. */
export function snapToSquareCentre(value: number, gridSize: number): number {
  return (Math.floor(value / gridSize) + 0.5) * gridSize;
}

/**
 * Snap one axis so a span of `squares` squares centred on the result has both
 * its edges on grid lines.
 *
 * A fractional span (a 7.5 ft effect on a 5 ft grid) cannot align either way,
 * so it falls back to the square centre — a stable anchor that at least keeps
 * the shape under the cursor instead of drifting.
 */
export function snapSpanCentre(value: number, gridSize: number, squares: number): number {
  if (!Number.isInteger(squares)) return snapToSquareCentre(value, gridSize);
  return squares % 2 === 0
    ? snapToGridLine(value, gridSize)
    : snapToSquareCentre(value, gridSize);
}

/** How many grid squares a distance in feet covers. */
export function squaresFor(feet: number, feetPerSquare: number): number {
  if (!Number.isFinite(feetPerSquare) || feetPerSquare <= 0) return 0;
  return feet / feetPerSquare;
}

/**
 * The axis-aligned square a cube template covers.
 *
 * Cubes are deliberately **not** rotated. A rotated square cannot line up with
 * a square grid, and on a grid a cube occupies whole squares — so this snaps to
 * cover exactly `sideSquares × sideSquares` of them, centred near the cursor.
 *
 * Returns the top-left corner and side length in map pixels.
 */
export function cubeRect(
  cursor: Pt,
  gridSize: number,
  sideSquares: number
): { x: number; y: number; size: number } {
  const size = sideSquares * gridSize;
  const cx = snapSpanCentre(cursor.x, gridSize, sideSquares);
  const cy = snapSpanCentre(cursor.y, gridSize, sideSquares);
  return { x: cx - size / 2, y: cy - size / 2, size };
}

/**
 * Which axis a direction mostly runs along.
 *
 * A line's length and width snap by different rules, so the two axes are
 * treated differently — and which is which depends on where the line points.
 * At a diagonal neither answer is more correct, so the dominant axis is used as
 * a stable tie-break.
 */
export function dominantAxis(angleRad: number): 'x' | 'y' {
  return Math.abs(Math.cos(angleRad)) >= Math.abs(Math.sin(angleRad)) ? 'x' : 'y';
}

/**
 * The origin of a line template.
 *
 * A line starts at a point and runs outwards, so along its length it should
 * begin on a grid line. Across its width it is centred, so that axis snaps by
 * the parity of the width. At the cardinal angles this makes a 20 ft × 5 ft
 * line cover exactly four squares by one.
 */
export function lineOrigin(
  cursor: Pt,
  gridSize: number,
  widthSquares: number,
  angleRad: number
): Pt {
  const alongX = dominantAxis(angleRad) === 'x';
  return {
    x: alongX
      ? snapToGridLine(cursor.x, gridSize)
      : snapSpanCentre(cursor.x, gridSize, widthSquares),
    y: alongX
      ? snapSpanCentre(cursor.y, gridSize, widthSquares)
      : snapToGridLine(cursor.y, gridSize),
  };
}

/**
 * Which of the eight 45° sectors a direction falls in.
 *
 * 0 = right, 1 = down-right, 2 = down, 3 = down-left, 4 = left, 5 = up-left,
 * 6 = up, 7 = up-right — with y increasing downwards, as map pixels do. Even
 * sectors are cardinal, odd ones diagonal, so a direction within 22.5° of an
 * axis counts as cardinal.
 */
export function directionOctant(angleRad: number): number {
  const octant = Math.round(angleRad / (Math.PI / 4));
  return ((octant % 8) + 8) % 8;
}

/**
 * The apex of a cone template.
 *
 * A cone emerges from a point on the edge of its square, so where that point
 * sits depends on which way the cone is aimed:
 *
 *  - pointing left or right → the midpoint of a **vertical** edge
 *  - pointing up or down    → the midpoint of a **horizontal** edge
 *  - pointing diagonally    → the **corner**, which is the point the cone
 *                             actually leaves the square through
 *
 * Each case makes the cone leave its square symmetrically. The apex used to sit
 * on the nearest grid intersection whatever the direction, which put a cone
 * aimed along an axis half a square off centre.
 *
 * This looks like `lineOrigin` but deliberately does not share its
 * `dominantAxis` split: that classifier has only two outcomes, and a cone needs
 * three. Collapsing them would silently drop the diagonal case.
 */
export function coneApex(cursor: Pt, gridSize: number, angleRad: number): Pt {
  const octant = directionOctant(angleRad);

  // Diagonal — both axes on grid lines, i.e. the corner.
  if (octant % 2 === 1) {
    return {
      x: snapToGridLine(cursor.x, gridSize),
      y: snapToGridLine(cursor.y, gridSize),
    };
  }

  // Cardinal — a grid line along the axis the cone runs, the square centre
  // across it, which is the midpoint of that edge.
  const horizontal = octant === 0 || octant === 4;
  return {
    x: horizontal
      ? snapToGridLine(cursor.x, gridSize)
      : snapToSquareCentre(cursor.x, gridSize),
    y: horizontal
      ? snapToSquareCentre(cursor.y, gridSize)
      : snapToGridLine(cursor.y, gridSize),
  };
}

// Sphere and cylinder have no entry here on purpose. They keep the square-centre
// anchor they have always used: a circle does not tile squares whatever it is
// centred on, and that placement was not part of the reported misalignment.
