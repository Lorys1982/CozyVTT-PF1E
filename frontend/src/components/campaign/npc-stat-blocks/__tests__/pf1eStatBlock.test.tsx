import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameSystem, type NpcStatBlock } from '@/types';
import StatBlockEditor from '../StatBlockEditor';
import StatBlockViewer from '../StatBlockViewer';

const pf1eBlock:NpcStatBlock={
  ac:18,hpMax:30,speed:'30 ft.',gameSystem:GameSystem.PATHFINDER_1E,challengeRating:'4',
  abilities:{str:16,dex:14,con:13,int:8,wis:12,cha:6},
  savingThrows:{fort:5,reflex:4,will:3},skills:{perception:8},
  actions:[{name:'Melee',description:'bite +7 (1d8+4)'}],
  traits:[{name:'Ferocity',description:'Continues fighting below 0 hp.'}],
  defensiveAbilities:'ferocity',damageReduction:'5/cold iron',spellResistance:'15',
  damageImmunities:'poison',damageResistances:'fire 10',weaknesses:'light sensitivity',
  feats:'Improved Initiative, Toughness',
  spellcasting:[{name:'Spell-Like Abilities',description:'CL 5th\nAt will—detect magic',spells:[{name:'detect magic',sourceUrl:'https://example.com/spell'}]}],
  bonusActions:[{name:'5e leak',description:'Must not be shown.'}],
  legendaryActions:[{name:'5e legendary leak',description:'Must not be shown.'}],
};

describe('PF1e NPC stat blocks',()=>{
  it('uses the stat block system and renders PF1 sections without 5e actions',()=>{
    render(<StatBlockViewer statBlock={pf1eBlock} tokenName="Dire Boar" gameSystem={GameSystem.DND_5E}/>);
    expect(screen.getByText('Offense')).toBeInTheDocument();
    expect(screen.getByText('Special Abilities')).toBeInTheDocument();
    expect(screen.queryByText('Legendary Actions')).not.toBeInTheDocument();
    expect(screen.queryByText('Bonus Actions')).not.toBeInTheDocument();
    expect(screen.getByText('DR')).toBeInTheDocument();
    expect(screen.getByText('5/cold iron')).toBeInTheDocument();
    expect(screen.getByText('Spellcasting')).toBeInTheDocument();
    expect(screen.getByText('At will')).toHaveClass('font-bold');
    expect(screen.getByRole('link',{name:'detect magic'})).toHaveClass('font-semibold','italic');
    expect(screen.getByText('Improved Initiative, Toughness')).toBeInTheDocument();
  });

  it('edits printed PF1 save and skill totals without 5e action sections',()=>{
    render(<StatBlockEditor statBlock={pf1eBlock} onChange={vi.fn()} gameSystem={GameSystem.PATHFINDER_1E}/>);
    fireEvent.click(screen.getByRole('button',{name:/Saves & Skills/i}));
    expect(screen.getByLabelText('fort save bonus')).toHaveValue(5);
    expect(screen.getByLabelText('reflex save bonus')).toHaveValue(4);
    expect(screen.queryByRole('button',{name:/Legendary Actions/i})).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/Bonus Actions/i})).not.toBeInTheDocument();
  });
});
