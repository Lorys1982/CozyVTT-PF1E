import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameSystem, type Character } from '../../../types';
import Pathfinder1eCharacterSheet from './Pathfinder1eCharacterSheet';
import { api } from '../../../services/api';
import type { PF1eCharacterData } from '../../../types/game-systems/pathfinder1e';

vi.mock('@/hooks/queries',()=>({useServerConfigQuery:()=>({data:undefined})}));

const character: Character = {
  id: 'character-1',
  userId: 'user-1',
  campaignId: 'campaign-1',
  gameSystem: GameSystem.PATHFINDER_1E,
  name: 'Valeros',
  data: {
    characterName: 'Valeros',
    feats: [{ name: 'Power Attack', type: 'Combat', description: '' }],
  },
  tokenImageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('Pathfinder1eCharacterSheet', () => {
  it('keeps an input focused while typing multiple characters', async () => {
    const user = userEvent.setup();
    const { container } = render(<Pathfinder1eCharacterSheet character={character} mode="edit" onSave={vi.fn()} />);
    const characterName = container.querySelector('input[value="Valeros"]') as HTMLInputElement;

    await user.click(characterName);
    await user.type(characterName, ' Test');

    expect(characterName).toHaveFocus();
    expect(characterName).toHaveValue('Valeros Test');
  });

  it('uploads and saves a PF1e token image',async()=>{
    const upload=vi.spyOn(api,'uploadAsset').mockResolvedValue({asset:{id:'asset-1'}} as any);
    const onSave=vi.fn().mockResolvedValue(undefined);
    const user=userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={character} mode="edit" onSave={onSave}/>);

    await user.upload(screen.getByLabelText('Token image'),new File(['portrait'],'portrait.png',{type:'image/png'}));
    await user.click(screen.getByRole('button',{name:'Save'}));

    await waitFor(()=>expect(upload).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledWith(expect.any(Object),true,'/api/assets/tokens/asset-1');
  });

  it('provides editable rules text for feats', async () => {
    const user = userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={character} mode="edit" onSave={vi.fn()} />);
    await user.click(screen.getByRole('button',{name:'Features & Bio'}));
    const description = screen.getByLabelText('Feat Description');

    await user.type(description, 'Trade attack bonus for damage.');

    expect(description).toHaveFocus();
    expect(description).toHaveValue('Trade attack bonus for damage.');
  });

  it('dismisses Nethys results when a custom feat search loses focus',async()=>{
    vi.spyOn(api,'searchPathfinder1eFeats').mockResolvedValue([{
      name:'Power Attack',itemName:'Power Attack',sourceUrl:'https://www.aonprd.com/FeatDisplay.aspx?ItemName=Power%20Attack',
    }]);
    const featCharacter:Character={...character,data:{...(character.data as PF1eCharacterData),feats:[{name:''}]}};
    const user=userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={featCharacter} mode="edit" onSave={vi.fn()}/>);
    await user.click(screen.getByRole('button',{name:'Features & Bio'}));
    const input=screen.getByPlaceholderText('Search Archives of Nethys or enter a custom feat…');
    await user.type(input,'Custom');
    expect(await screen.findByRole('button',{name:'Power Attack'})).toBeInTheDocument();

    await user.click(screen.getByRole('button',{name:'Combat'}));

    expect(screen.queryByRole('button',{name:'Power Attack'})).not.toBeInTheDocument();
    expect(input).toHaveValue('Custom');
  });

  it('allows long feat content to be collapsed',async()=>{
    const user=userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={character} mode="edit" onSave={vi.fn()}/>);
    await user.click(screen.getByRole('button',{name:'Features & Bio'}));
    const collapse=screen.getByRole('button',{name:'Collapse Power Attack'});
    expect(screen.getByLabelText('Feat Description')).toBeInTheDocument();

    await user.click(collapse);

    expect(screen.queryByLabelText('Feat Description')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Expand Power Attack'})).toBeInTheDocument();
  });

  it('recalculates AC from its source fields and keeps the total read-only', async () => {
    const user = userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={character} mode="edit" onSave={vi.fn()} />);
    const dexterityScore = screen.getByLabelText('Dexterity score');

    await user.clear(dexterityScore);
    await user.type(dexterityScore, '14');

    const calculated = screen.getAllByTitle('Calculated automatically');
    expect(calculated[0]).toHaveTextContent('12');
    expect(calculated[0].tagName).toBe('OUTPUT');
  });

  it('exposes optional temporary and override fields for derived combat stats', async () => {
    const user = userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={character} mode="edit" onSave={vi.fn()} />);

    await user.click(screen.getByRole('button',{name:'Combat'}));

    expect(screen.getByLabelText('Temporary AC')).toBeEnabled();
    expect(screen.getByLabelText('AC override')).toHaveAttribute('placeholder','Automatic');
    expect(screen.getAllByLabelText('Temporary')).toHaveLength(3);
    expect(screen.getAllByLabelText('Total override')).toHaveLength(3);
    expect(screen.getByLabelText('Initiative temporary')).toBeEnabled();
    expect(screen.getByLabelText('Temporary HP')).toBeEnabled();
    expect(screen.getByLabelText('BAB misc modifier')).toBeEnabled();
  });

  it('provides foldable gear notes and a useful collapsed summary',async()=>{
    const gearCharacter:Character={...character,data:{...(character.data as PF1eCharacterData),gear:[{name:'Rope',type:'Adventuring gear',quantity:2,location:'Backpack',weight:'10 lb.',notes:'Silk rope with a grappling hook.'}]}};
    const user=userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={gearCharacter} mode="edit" onSave={vi.fn()}/>);
    await user.click(screen.getByRole('button',{name:'Inventory'}));

    expect(screen.getByLabelText('Rope notes')).toHaveValue('Silk rope with a grappling hook.');
    await user.click(screen.getByRole('button',{name:'Collapse Rope'}));

    expect(screen.queryByLabelText('Rope notes')).not.toBeInTheDocument();
    expect(screen.getByText(/Qty 2/)).toBeInTheDocument();
    expect(screen.getByText('Silk rope with a grappling hook.')).toBeInTheDocument();
  });

  it('searches and fills character spells from Archives of Nethys', async () => {
    const search = vi.spyOn(api,'searchPathfinder1eSpells').mockResolvedValue([{
      name:'Fireball',itemName:'Fireball',summary:'A fiery explosion.',sourceUrl:'https://www.aonprd.com/SpellDisplay.aspx?ItemName=Fireball',
    }]);
    const detail = vi.spyOn(api,'getPathfinder1eSpell').mockResolvedValue({
      name:'Fireball',itemName:'Fireball',summary:'A fiery explosion.',sourceUrl:'https://www.aonprd.com/SpellDisplay.aspx?ItemName=Fireball',
      school:'evocation [fire]',levels:'wizard 3',description:'Deals fire damage.',
    });
    const spellCharacter = {...character,data:{...character.data,spells:[{slotted:[{name:''}]}]}};
    const user = userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={spellCharacter} mode="edit" onSave={vi.fn()} />);
    await user.click(screen.getByRole('button',{name:'Spells'}));
    const input = screen.getByPlaceholderText('Search Archives of Nethys…');

    await user.type(input,'Fire');
    await waitFor(()=>expect(search).toHaveBeenCalledWith('Fire'));
    await user.type(input,'ball');
    await waitFor(()=>expect(detail).toHaveBeenCalledWith('Fireball'));

    await waitFor(()=>expect(screen.getByRole('button',{name:'Open Fireball details'})).toBeInTheDocument());
    await user.click(screen.getByRole('button',{name:'Open Fireball details'}));
    expect(screen.getByDisplayValue('evocation [fire]')).toBeInTheDocument();
    expect(screen.getByText('Deals fire damage.')).toBeInTheDocument();
  });

  it('offers an imported spell area to the campaign AoE tool', async () => {
    const onPlaceAoE = vi.fn();
    const spellCharacter: Character = {
      ...character,
      data: {
        ...(character.data as PF1eCharacterData),
        spells: [{ slotted: [{ name: 'Fireball', area: '20-ft.-radius spread' }] }],
      },
    };
    const user = userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={spellCharacter} mode="view" onPlaceAoE={onPlaceAoE} />);

    await user.click(screen.getByRole('button', { name: /Place area · circle/ }));

    expect(onPlaceAoE).toHaveBeenCalledWith(
      { shape: 'sphere', sizeFt: 20 },
      expect.objectContaining({ name: 'Fireball' }),
    );
  });

  it('offers spell range separately from its affected area', async () => {
    const onPlaceAoE = vi.fn();
    const spellCharacter: Character = {
      ...character,
      data: {
        ...(character.data as PF1eCharacterData),
        casterLevel: 8,
        spells: [{ slotted: [{ name: 'Ranged Burst', range: 'short (20ft + 5/2lvl)', area: '10-ft.-radius burst' }] }],
      },
    };
    const user = userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={spellCharacter} mode="view" onPlaceAoE={onPlaceAoE} />);

    expect(screen.getByRole('button', { name: /Place area · circle 10 ft/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Show range · 40 ft/ }));
    expect(onPlaceAoE).toHaveBeenCalledWith(
      { shape: 'sphere', sizeFt: 40 },
      expect.objectContaining({ name: 'Ranged Burst' }),
    );
  });

  it('adds a new spell at the top of its level', async () => {
    const spellCharacter: Character = {
      ...character,
      data: {
        ...(character.data as PF1eCharacterData),
        spells: [{ slotted: [{ name: 'Existing spell' }] }],
      },
    };
    const user = userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={spellCharacter} mode="edit" onSave={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Spells' }));
    await user.click(screen.getByRole('button', { name: 'Add spell' }));

    const names = screen.getAllByLabelText('Spell name');
    expect(names[0]).toHaveValue('');
    expect(names[1]).toHaveValue('Existing spell');
  });

  it('imports official feats while keeping their fields editable',async()=>{
    const search=vi.spyOn(api,'searchPathfinder1eFeats').mockResolvedValue([{
      name:'Power Attack',itemName:'Power Attack',sourceUrl:'https://www.aonprd.com/FeatDisplay.aspx?ItemName=Power%20Attack',
    }]);
    const detail=vi.spyOn(api,'getPathfinder1eFeat').mockResolvedValue({
      name:'Power Attack',itemName:'Power Attack',sourceUrl:'https://www.aonprd.com/FeatDisplay.aspx?ItemName=Power%20Attack',
      source:'Core Rulebook pg. 131',prerequisites:'Str 13',benefit:'Trade attack bonus for damage.',
    });
    const featCharacter:Character={...character,data:{...(character.data as PF1eCharacterData),feats:[{name:''}]}};
    const user=userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={featCharacter} mode="edit" onSave={vi.fn()}/>);
    await user.click(screen.getByRole('button',{name:'Features & Bio'}));
    const input=screen.getByPlaceholderText('Search Archives of Nethys or enter a custom feat…');
    await user.type(input,'Power');
    await waitFor(()=>expect(search).toHaveBeenCalledWith('Power'));
    await user.click(await screen.findByRole('button',{name:'Power Attack'}));
    await waitFor(()=>expect(detail).toHaveBeenCalledWith('Power Attack'));
    expect(screen.getByLabelText('Feat Prerequisites')).toHaveValue('Str 13');
    expect(screen.getByLabelText('Feat Benefit')).toHaveValue('Trade attack bonus for damage.');
    expect(screen.getByRole('link',{name:/Archives of Nethys/})).toBeInTheDocument();
  });

  it('uses a clean play view with normal, advantage, and disadvantage roll choices',async()=>{
    const onRoll=vi.fn();
    const user=userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={character} mode="view" onRoll={onRoll}/>);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    const strength=screen.getByRole('button',{name:/STR/});
    fireEvent.contextMenu(strength,{clientX:40,clientY:60});
    expect(screen.getByRole('button',{name:'Normal'})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Disadvantage'})).toBeInTheDocument();

    await user.click(screen.getByRole('button',{name:'Advantage'}));
    expect(onRoll).toHaveBeenCalledWith('2d20kh1+0','Strength Check (Advantage)');

    await user.click(screen.getByRole('button',{name:/Concentration/}));
    expect(onRoll).toHaveBeenCalledWith('1d20+0','Concentration Check');
    await user.click(screen.getByRole('button',{name:/SR penetration/}));
    expect(onRoll).toHaveBeenCalledWith('1d20+0','Spell Resistance Penetration');
  });

  it('clusters spells and items and keeps folded spell descriptions hidden',async()=>{
    const playCharacter:Character={...character,data:{
      ...(character.data as PF1eCharacterData),
      spells:[{slotted:[]},{totalPerDay:3,currentPerDay:1,slotted:[{name:'Fireball',school:'evocation',level:'wizard 1',description:'This description stays inside the fold.',prepared:2,cast:1}]}],
      gear:[{name:'Rope',quantity:2,location:'Backpack',notes:'Useful climbing gear.'}],
    }};
    const onDataChange=vi.fn();
    const user=userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={playCharacter} mode="view" onRoll={vi.fn()} onDataChange={onDataChange}/>);

    expect(screen.queryByText('This description stays inside the fold.')).not.toBeInTheDocument();
    expect(screen.queryByText('Level wizard 1')).not.toBeInTheDocument();
    expect(screen.getAllByText('evocation')).toHaveLength(1);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('prepared remaining')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Prepare'}));
    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({spells:expect.arrayContaining([
      expect.objectContaining({currentPerDay:0,slotted:expect.arrayContaining([expect.objectContaining({name:'Fireball',prepared:3})])}),
    ])}));
    onDataChange.mockClear();
    await user.click(screen.getByRole('button',{name:'Open Fireball details'}));
    expect(screen.getByRole('dialog',{name:'Fireball details'})).toBeInTheDocument();
    expect(screen.getByText('This description stays inside the fold.')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.getByText('1 ready · 1 cast')).toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Restore cast'}));
    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({spells:expect.arrayContaining([
      expect.objectContaining({slotted:expect.arrayContaining([expect.objectContaining({name:'Fireball',cast:0})])}),
    ])}));
    onDataChange.mockClear();
    await user.click(screen.getByRole('button',{name:'Cast prepared'}));
    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({spells:expect.arrayContaining([
      expect.objectContaining({slotted:expect.arrayContaining([expect.objectContaining({name:'Fireball',cast:2})])}),
    ])}));
    await user.click(screen.getByRole('button',{name:'Close Fireball details'}));
    const clusterSpells=screen.getByRole('button',{name:'Cluster spells'});
    await user.click(clusterSpells);
    expect(clusterSpells).toHaveAttribute('aria-pressed','true');

    const clusterItems=screen.getByRole('button',{name:'Cluster items'});
    await user.click(clusterItems);
    expect(clusterItems).toHaveAttribute('aria-pressed','true');
    expect(screen.getByText(/Qty 2/)).toBeInTheDocument();
  });

  it('spends shared slots for spontaneous casters and exposes conditional DC text',async()=>{
    const spontaneous:Character={...character,data:{
      ...(character.data as PF1eCharacterData),spellcastingType:'spontaneous',spellDcConditionalModifiers:[
        {source:'Bloodline Arcana',condition:'Spells matching the draconic energy type',dcModifier:1},
        {source:'Spell Focus',condition:'Evocation spells',dcModifier:1,notes:'Already included only when applicable.'},
      ],
      spells:[{slotted:[]},{totalPerDay:3,currentPerDay:2,slotted:[{name:'Magic Missile'}]}],
    }};
    const onDataChange=vi.fn();
    const user=userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={spontaneous} mode="view" onDataChange={onDataChange}/>);

    expect(screen.getByText('Bloodline Arcana')).toBeInTheDocument();
    expect(screen.getByText('Spell Focus')).toBeInTheDocument();
    expect(screen.getByText('When: Evocation spells')).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Prepare'})).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Cast spell'}));
    expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({spells:expect.arrayContaining([
      expect.objectContaining({currentPerDay:1}),
    ])}));
  });

  it('rolls iterative attacks and typed damage separately',async()=>{
    const armed:Character={...character,data:{
      ...(character.data as PF1eCharacterData),bab:6,
      melee:[{weapon:'Flaming sword',baseDamage:'1d8',damageType:'slashing',additionalDamage:[{formula:'1d6',type:'fire'}]}],
    }};
    const onRoll=vi.fn();
    const user=userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={armed} mode="view" onRoll={onRoll}/>);

    await user.click(screen.getByRole('button',{name:/Attack 2/}));
    expect(onRoll).toHaveBeenCalledWith('1d20+1','Flaming sword Attack 2');
    await user.click(screen.getByRole('button',{name:/fire damage/i}));
    expect(onRoll).toHaveBeenCalledWith('1d6','Flaming sword fire Damage');
  });
});
