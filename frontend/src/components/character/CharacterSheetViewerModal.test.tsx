import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CharacterSheetViewerModal from './CharacterSheetViewerModal';

vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'user-1'}})}));
vi.mock('@/contexts/WebSocketContext',()=>({useWebSocket:()=>({socket:null})}));
vi.mock('@/contexts/ToastContext',()=>({useToast:()=>({showToast:vi.fn()})}));
vi.mock('../character-sheets/dnd5e/DnD5eCharacterView',()=>({DnD5eCharacterView:()=>null}));
vi.mock('../character-sheets/pathfinder1e/Pathfinder1eCharacterSheet',()=>({default:()=>null}));
vi.mock('../character-sheets/pathfinder2e/Pathfinder2eCharacterView',()=>({default:()=>null}));
vi.mock('../character-sheets/shadowrun6e/Shadowrun6eCharacterSheet',()=>({default:()=>null}));
vi.mock('../character-sheets/call-of-cthulhu-7e/CallOfCthulhu7eCharacterView',()=>({default:()=>null}));
vi.mock('../character-sheets/flexible/FlexibleCharacterSheetView',()=>({FlexibleCharacterSheetView:()=> <div>Sheet content</div>}));
vi.mock('./CharacterSheetEditorModal',()=>({default:()=>null}));

describe('CharacterSheetViewerModal',()=>{
  const character={
    id:'character-1',userId:'user-1',campaignId:'campaign-1',gameSystem:null,name:'Hero',data:{},
    tokenImageUrl:null,createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z',
  } as any;

  it('closes from the backdrop but stays open when the sheet is clicked',()=>{
    const onClose=vi.fn();
    const {container}=render(<CharacterSheetViewerModal
      character={character}
      campaignId="campaign-1"
      membership={{role:'PLAYER'} as any}
      onClose={onClose}
    />);

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(container.firstElementChild as HTMLElement);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('opens the sheet in a persistent standalone window',()=>{
    const open=vi.spyOn(window,'open').mockImplementation(()=>null);
    render(<CharacterSheetViewerModal character={character} campaignId="campaign-1" membership={{role:'PLAYER'} as any} onClose={vi.fn()}/>);

    fireEvent.click(screen.getByRole('button',{name:/New window/i}));
    expect(open).toHaveBeenCalledWith(
      '/campaigns/campaign-1/characters/character-1/sheet',
      'cozyvtt-character-character-1',
      'popup,width=1400,height=1000',
    );
    open.mockRestore();
  });

  it('uses page layout and does not offer another popup when already standalone',()=>{
    const {container}=render(<CharacterSheetViewerModal standalone character={character} campaignId="campaign-1" membership={{role:'PLAYER'} as any} onClose={vi.fn()}/>);
    expect(screen.queryByRole('button',{name:/New window/i})).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('min-h-screen');
  });
});
