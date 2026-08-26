import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import CharacterSheetViewerModal from '@/components/character/CharacterSheetViewerModal';
import { CampaignProvider, useCampaign } from '@/contexts/CampaignContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { useCampaignToolStore } from '@/stores/campaignToolStore';
import type { Character } from '@/types';

function StandaloneCharacterSheetContent() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { campaign, loading: campaignLoading, error: campaignError } = useCampaign();
  const { showToast } = useToast();
  const openSpellAoE = useCampaignToolStore((state) => state.openSpellAoE);
  const [character, setCharacter] = useState<Character | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!characterId) return;
    let cancelled = false;
    api.getCharacter(characterId)
      .then(({ character: loaded }) => { if (!cancelled) setCharacter(loaded); })
      .catch(() => { if (!cancelled) setError('Unable to load this character sheet.'); });
    return () => { cancelled = true; };
  }, [characterId]);

  const membership = campaign?.memberships?.find((entry) => entry.userId === user?.id);
  const close = () => {
    if (window.opener) window.close();
    else if (campaign) navigate(`/campaigns/${campaign.id}`);
    else navigate('/dashboard');
  };

  if (campaignLoading || (!character && !error)) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-ink"/></div>;
  }
  if (campaignError || error || !campaign || !character || !membership) {
    return <div className="flex min-h-screen items-center justify-center p-6"><div className="card-cozy max-w-lg p-6 text-center text-danger-ink">{campaignError || error || 'You do not have access to this campaign character.'}</div></div>;
  }

  return <CharacterSheetViewerModal
    standalone
    character={character}
    campaignId={campaign.id}
    membership={membership}
    onClose={close}
    onPlaceSpellAoE={(config, spell) => {
      openSpellAoE(config, spell.name, campaign.id);
      showToast(`${spell.name} sent to the campaign map.`, 'success');
    }}
  />;
}

export default function StandaloneCharacterSheetPage() {
  return <CampaignProvider><WebSocketProvider><StandaloneCharacterSheetContent/></WebSocketProvider></CampaignProvider>;
}
