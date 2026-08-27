// ============================================
// Manual fog-of-war layer (the non-dynamic-lighting fog).
// DM sees semi-transparent fog from the full fogState; players see
// near-opaque fog everywhere outside their revealed cell set.
// Pure: no React, no component closures.
// ============================================

import type { FogState } from '@/types/walls';
import type { Viewport } from './types';

export interface FogDrawState {
  isDM: boolean;
  /** DM preview mode uses the player fog treatment while retaining full fog state. */
  playerPreview?: boolean;
  /** Full fog grid — DM only. */
  fogState: FogState | null;
  /** Revealed cell indices — players only; null = fog data not received yet. */
  revealedCells: Set<number> | null;
  /** Per-cell reveal-fade opacity (1 = just revealed → 0 = faded in). */
  revealOpacity: ReadonlyMap<number, number>;
}

export function drawFog(
  ctx: CanvasRenderingContext2D,
  state: FogDrawState,
  viewport: Viewport
): void {
  // DM fog (semi-transparent, from full fogState). In player preview the DM
  // must receive the same opaque treatment and revealed-cell filtering as a
  // player, rather than retaining the normal DM transparency.
  if (state.isDM && state.fogState && !state.playerPreview) {
    const { fogCols, fogRows, cellPx, revealed } = state.fogState;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 12, 25, 0.55)'; // deep dark purple, semi-transparent for DM
    for (let row = 0; row < fogRows; row++) {
      for (let col = 0; col < fogCols; col++) {
        const idx = row * fogCols + col;
        if (!revealed[idx]) {
          const fadeOpacity = state.revealOpacity.get(idx);
          if (fadeOpacity !== undefined) {
            ctx.fillStyle = `rgba(15, 12, 25, ${0.55 * fadeOpacity})`;
            ctx.fillRect(col * cellPx, row * cellPx, cellPx, cellPx);
            ctx.fillStyle = 'rgba(15, 12, 25, 0.55)';
          } else {
            ctx.fillRect(col * cellPx, row * cellPx, cellPx, cellPx);
          }
        }
      }
    }
    ctx.restore();
  }

  // Player fog (near-opaque). DM preview derives revealed cells from the full
  // fog state because DMs normally receive fog:updated rather than fog:cells.
  const previewRevealed = state.playerPreview && state.fogState
    ? new Set(state.fogState.revealed.flatMap((revealed, index) => revealed ? [index] : []))
    : null;
  const playerRevealed = state.revealedCells ?? previewRevealed;
  if ((!state.isDM || state.playerPreview) && playerRevealed) {
    const cellPx = viewport.gridSize;
    const fogCols = viewport.mapWidth;
    const fogRows = viewport.mapHeight;
    ctx.save();
    for (let row = 0; row < fogRows; row++) {
      for (let col = 0; col < fogCols; col++) {
        const idx = row * fogCols + col;
        if (!playerRevealed.has(idx)) {
          const fadeOpacity = state.revealOpacity.get(idx);
          ctx.fillStyle = fadeOpacity !== undefined
            ? `rgba(15, 12, 25, ${fadeOpacity})`
            : 'rgba(15, 12, 25, 1)';
          ctx.fillRect(col * cellPx, row * cellPx, cellPx, cellPx);
        }
      }
    }
    ctx.restore();
  }
}
