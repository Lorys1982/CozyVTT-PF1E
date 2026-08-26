import { create } from 'zustand';
import type { SpellAoEConfig } from '@/utils/pathfinder1eSpellAoE';

interface AoEToolRequest {
  id: number;
  config: SpellAoEConfig;
  spellName: string;
  campaignId?: string;
}

interface CampaignToolState {
  aoeRequest: AoEToolRequest | null;
  openSpellAoE: (config: SpellAoEConfig, spellName: string, campaignId?: string) => void;
  clearAoERequest: (id: number) => void;
}

const channel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('cozyvtt-campaign-tools')
  : null;

const requestId = () => Date.now() + Math.random();

export const useCampaignToolStore = create<CampaignToolState>((set) => ({
  aoeRequest: null,
  openSpellAoE: (config, spellName, campaignId) => {
    const request = { id: requestId(), config, spellName, campaignId };
    set({ aoeRequest: request });
    channel?.postMessage({ type: 'open-spell-aoe', request });
  },
  clearAoERequest: (id) => set((state) => state.aoeRequest?.id === id ? { aoeRequest: null } : state),
}));

channel?.addEventListener('message', (event: MessageEvent) => {
  if (event.data?.type !== 'open-spell-aoe' || !event.data.request) return;
  useCampaignToolStore.setState({ aoeRequest: event.data.request as AoEToolRequest });
});
