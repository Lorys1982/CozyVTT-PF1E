import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameSystem, type Character } from '../../../types';
import Pathfinder1eCharacterSheet from './Pathfinder1eCharacterSheet';
import { api } from '../../../services/api';
import type { PF1eCharacterData } from '../../../types/game-systems/pathfinder1e';

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

  it('provides editable rules text for feats', async () => {
    const user = userEvent.setup();
    render(<Pathfinder1eCharacterSheet character={character} mode="edit" onSave={vi.fn()} />);
    await user.click(screen.getByRole('button',{name:'Features & Bio'}));
    const description = screen.getByLabelText('Feat Description');

    await user.type(description, 'Trade attack bonus for damage.');

    expect(description).toHaveFocus();
    expect(description).toHaveValue('Trade attack bonus for damage.');
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

    expect(await screen.findByDisplayValue('evocation [fire]')).toBeInTheDocument();
    expect(screen.getByText('Deals fire damage.')).toBeInTheDocument();
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
});
