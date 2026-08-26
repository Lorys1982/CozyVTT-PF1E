import { create } from 'zustand';
import type { SpellAoEConfig } from '@/utils/pathfinder1eSpellAoE';

interface AoEToolRequest {
  id: number;
  config: SpellAoEConfig;
  spellName: string;
}

interface CampaignToolState {
  aoeRequest: AoEToolRequest | null;
  openSpellAoE: (config: SpellAoEConfig, spellName: string) => void;
  clearAoERequest: (id: number) => void;
}

let nextRequestId = 1;

export const useCampaignToolStore = create<CampaignToolState>((set) => ({
  aoeRequest: null,
  openSpellAoE: (config, spellName) => set({ aoeRequest: { id: nextRequestId++, config, spellName } }),
  clearAoERequest: (id) => set((state) => state.aoeRequest?.id === id ? { aoeRequest: null } : state),
}));
