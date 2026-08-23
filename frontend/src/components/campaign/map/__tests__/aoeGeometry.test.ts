import { describe, it, expect } from 'vitest';
import {
  coneApex,
  cubeRect,
  directionOctant,
  dominantAxis,
  lineOrigin,
  snapSpanCentre,
  snapToGridLine,
  snapToSquareCentre,
  squaresFor,
} from '../aoeGeometry';

const GRID = 50; // map pixels per square, matching the test instance's maps

/** True when a coordinate sits exactly on a grid line. */
const onGridLine = (v: number) => Math.abs(v / GRID - Math.round(v / GRID)) < 1e-9;

describe('squaresFor', () => {
  it('converts feet to squares', () => {
    expect(squaresFor(10, 5)).toBe(2);
    expect(squaresFor(20, 5)).toBe(4);
    expect(squaresFor(15, 5)).toBe(3);
  });

  it('handles a non-standard grid scale', () => {
    expect(squaresFor(10, 10)).toBe(1);
    expect(squaresFor(10, 2.5)).toBe(4);
  });

  it('is 0 rather than Infinity for a nonsensical scale', () => {
    expect(squaresFor(10, 0)).toBe(0);
  });
});

describe('snapping primitives', () => {
  it('snaps to the nearest grid line', () => {
    expect(snapToGridLine(24, GRID)).toBe(0);
    expect(snapToGridLine(26, GRID)).toBe(50);
    expect(snapToGridLine(74, GRID)).toBe(50);
  });

  it('snaps to the containing square centre', () => {
    expect(snapToSquareCentre(10, GRID)).toBe(25);
    expect(snapToSquareCentre(49, GRID)).toBe(25);
    expect(snapToSquareCentre(51, GRID)).toBe(75);
  });

  // The parity rule the whole fix rests on.
  it('centres an even span on a grid line', () => {
    expect(snapSpanCentre(60, GRID, 2)).toBe(50);
    expect(snapSpanCentre(60, GRID, 4)).toBe(50);
  });

  it('centres an odd span on a square centre', () => {
    expect(snapSpanCentre(60, GRID, 1)).toBe(75);
    expect(snapSpanCentre(60, GRID, 3)).toBe(75);
  });

  it('falls back to the square centre for a fractional span', () => {
    expect(snapSpanCentre(60, GRID, 1.5)).toBe(75);
  });
});

describe('cubeRect', () => {
  // The reported bug: a 10 ft cube on a 5 ft grid is exactly two squares, but
  // it was drawn from a square centre and so straddled four.
  it('covers exactly two squares for a 10 ft cube on a 5 ft grid', () => {
    const rect = cubeRect({ x: 137, y: 88 }, GRID, squaresFor(10, 5));

    expect(rect.size).toBe(2 * GRID);
    expect(onGridLine(rect.x)).toBe(true);
    expect(onGridLine(rect.y)).toBe(true);
  });

  it('puts every edge on a grid line, whatever the cursor position', () => {
    for (const side of [1, 2, 3, 4, 6]) {
      for (const cursor of [0, 7, 24, 25, 26, 49, 51, 99, 137, 260]) {
        const rect = cubeRect({ x: cursor, y: cursor }, GRID, side);

        expect(onGridLine(rect.x)).toBe(true);
        expect(onGridLine(rect.y)).toBe(true);
        expect(onGridLine(rect.x + rect.size)).toBe(true);
        expect(onGridLine(rect.y + rect.size)).toBe(true);
      }
    }
  });

  it('stays centred on the square under the cursor for an odd span', () => {
    // A 15 ft cube is three squares: it should cover the hovered square plus
    // one either side, not shift off to a corner.
    const rect = cubeRect({ x: 60, y: 60 }, GRID, 3);

    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.size).toBe(150);
  });

  it('picks the nearer intersection for an even span', () => {
    expect(cubeRect({ x: 60, y: 60 }, GRID, 2).x).toBe(0);   // nearest line is 50
    expect(cubeRect({ x: 90, y: 90 }, GRID, 2).x).toBe(50);  // nearest line is 100
  });
});

describe('dominantAxis', () => {
  it('reads cardinal directions', () => {
    expect(dominantAxis(0)).toBe('x');
    expect(dominantAxis(Math.PI)).toBe('x');
    expect(dominantAxis(Math.PI / 2)).toBe('y');
    expect(dominantAxis(-Math.PI / 2)).toBe('y');
  });

  it('breaks a perfect diagonal consistently', () => {
    expect(dominantAxis(Math.PI / 4)).toBe('x');
  });
});

describe('lineOrigin', () => {
  // A 5 ft wide line is one square across, so its centre-line has to run along
  // a row of square centres for the line to cover whole squares.
  it('runs a 5 ft wide horizontal line along a row of squares', () => {
    const origin = lineOrigin({ x: 137, y: 88 }, GRID, squaresFor(5, 5), 0);

    expect(onGridLine(origin.x)).toBe(true);      // starts on a grid line
    expect(origin.y).toBe(75);                    // centred in the row
  });

  it('centres a 10 ft wide horizontal line on a grid line', () => {
    const origin = lineOrigin({ x: 137, y: 88 }, GRID, squaresFor(10, 5), 0);

    expect(onGridLine(origin.x)).toBe(true);
    expect(onGridLine(origin.y)).toBe(true);
  });

  it('swaps the axes for a vertical line', () => {
    const origin = lineOrigin({ x: 88, y: 137 }, GRID, squaresFor(5, 5), Math.PI / 2);

    expect(origin.x).toBe(75);                    // centred in the column
    expect(onGridLine(origin.y)).toBe(true);      // starts on a grid line
  });

  it('handles a line pointing left or up the same way', () => {
    const left = lineOrigin({ x: 137, y: 88 }, GRID, 1, Math.PI);
    expect(onGridLine(left.x)).toBe(true);
    expect(left.y).toBe(75);

    const up = lineOrigin({ x: 88, y: 137 }, GRID, 1, -Math.PI / 2);
    expect(up.x).toBe(75);
    expect(onGridLine(up.y)).toBe(true);
  });
});

describe('directionOctant', () => {
  it.each([
    [0, 0],                    // right
    [Math.PI / 2, 2],          // down (y grows downwards in map pixels)
    [Math.PI, 4],              // left
    [-Math.PI / 2, 6],         // up
    [Math.PI / 4, 1],          // down-right
    [-Math.PI / 4, 7],         // up-right
  ])('classifies %f as octant %i', (angle, expected) => {
    expect(directionOctant(angle)).toBe(expected);
  });

  it('normalises angles outside a single turn', () => {
    expect(directionOctant(Math.PI * 2)).toBe(0);
    expect(directionOctant(-Math.PI * 2)).toBe(0);
  });
});

describe('coneApex', () => {
  // A cone leaves its square through a point on one of its edges, so where that
  // point sits depends on which way the cone is aimed. It used to sit on the
  // nearest intersection whatever the direction, which put an axis-aligned cone
  // half a square off centre — the reported bug.
  describe('pointing along an axis — the midpoint of an edge', () => {
    it('uses a vertical edge when pointing right', () => {
      // Cursor at (137, 88): nearest vertical grid line is x=150, and y=88 sits
      // in the row whose centre is 75.
      expect(coneApex({ x: 137, y: 88 }, GRID, 0)).toEqual({ x: 150, y: 75 });
    });

    it('uses a vertical edge when pointing left', () => {
      expect(coneApex({ x: 137, y: 88 }, GRID, Math.PI)).toEqual({ x: 150, y: 75 });
    });

    it('uses a horizontal edge when pointing down', () => {
      expect(coneApex({ x: 137, y: 88 }, GRID, Math.PI / 2)).toEqual({ x: 125, y: 100 });
    });

    it('uses a horizontal edge when pointing up', () => {
      expect(coneApex({ x: 137, y: 88 }, GRID, -Math.PI / 2)).toEqual({ x: 125, y: 100 });
    });

    it('leaves the square symmetrically, whichever axis', () => {
      for (const angle of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
        const apex = coneApex({ x: 137, y: 88 }, GRID, angle);
        const onLine = [apex.x, apex.y].filter(onGridLine).length;
        const onCentre = [apex.x, apex.y].filter((v) => !onGridLine(v)).length;

        // Exactly one axis on a grid line and one at a square centre is what
        // makes the point an edge midpoint rather than a corner.
        expect(onLine).toBe(1);
        expect(onCentre).toBe(1);
      }
    });
  });

  describe('pointing diagonally — the corner', () => {
    it.each([
      ['down-right', Math.PI / 4],
      ['down-left', (3 * Math.PI) / 4],
      ['up-left', (-3 * Math.PI) / 4],
      ['up-right', -Math.PI / 4],
    ])('snaps to an intersection when pointing %s', (_name, angle) => {
      const apex = coneApex({ x: 137, y: 88 }, GRID, angle);
      expect(onGridLine(apex.x)).toBe(true);
      expect(onGridLine(apex.y)).toBe(true);
    });
  });

  describe('the boundary between cardinal and diagonal', () => {
    // Each octant spans 45°, so the switch happens at 22.5° off an axis.
    it('counts just inside 22.5 degrees as cardinal', () => {
      const apex = coneApex({ x: 137, y: 88 }, GRID, (Math.PI / 8) * 0.99);
      expect(apex).toEqual({ x: 150, y: 75 });
    });

    it('counts just past 22.5 degrees as diagonal', () => {
      const apex = coneApex({ x: 137, y: 88 }, GRID, (Math.PI / 8) * 1.01);
      expect(onGridLine(apex.x)).toBe(true);
      expect(onGridLine(apex.y)).toBe(true);
    });
  });

  it('stays adjacent to the square under the cursor', () => {
    // Whatever the direction, the apex should be on the hovered square's own
    // boundary — never snapped away to a different part of the map.
    for (const angle of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 3]) {
      const apex = coneApex({ x: 137, y: 88 }, GRID, angle);
      expect(apex.x).toBeGreaterThanOrEqual(100);
      expect(apex.x).toBeLessThanOrEqual(150);
      expect(apex.y).toBeGreaterThanOrEqual(50);
      expect(apex.y).toBeLessThanOrEqual(100);
    }
  });
});
