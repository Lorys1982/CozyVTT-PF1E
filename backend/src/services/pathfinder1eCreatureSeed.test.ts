import { parseAonMonsterIndex, parseAonMonsterPage } from './pathfinder1eCreatureSeed';

describe('Archives of Nethys PF1e creature parsing', () => {
  it('parses official monster index rows', () => {
    const html = `<table><tr><td><a href="MonsterDisplay.aspx?ItemName=Gray Render">Gray Render</a></td><td>8</td><td>magical beast</td><td>temperate marshes</td></tr></table>`;
    expect(parseAonMonsterIndex(html)).toEqual([{
      name: 'Gray Render',
      itemName: 'Gray Render',
      challengeRating: '8',
      creatureType: 'magical beast',
      environment: 'temperate marshes',
    }]);
  });

  it('maps an AoN PF1e stat block into a placeable creature', () => {
    const html = `<span id="MainContent_DataListFeats_Label1_0">
      <h1 class="title">Gray Render</h1><h2 class="title">Gray Render CR 8</h2>
      <b>Source</b> <i>Bestiary 2 pg. 140</i><br /><b>XP</b> 4,800<br />N Large magical beast<br />
      <b>Init</b> +1; <b>Senses</b> darkvision 60 ft.; Perception +13
      <h3 class="framing">Defense</h3><b>AC</b> 21, touch 10, flat-footed 20<br /><b>hp</b> 100 (8d10+56)<br /><b>Fort</b> +13, <b>Ref</b> +7, <b>Will</b> +4<br /><b>Defensive Abilities</b> ferocity; <b>DR</b> 5/cold iron; <b>Immune</b> poison; <b>Resist</b> fire 10; <b>SR</b> 19; <b>Weaknesses</b> light sensitivity
      <h3 class="framing">Offense</h3><b>Speed</b> 30 ft.<br /><b>Melee</b> bite +14 (2d6+7)<br />
      <b>Spell-Like Abilities</b> (CL 8th)<br />At will—<i>detect magic</i><br /><b>Sorcerer Spells Known</b> (CL 3rd)<br />1st—<i>magic missile</i><br />
      <h3 class="framing">Statistics</h3><b>Str</b> 25, <b>Dex</b> 13, <b>Con</b> 24, <b>Int</b> 3, <b>Wis</b> 14, <b>Cha</b> 8<br /><b>Skills</b> Perception +13, Survival +6<br /><b>Languages</b> Giant
      <h3 class="framing">Ecology</h3><b>Environment</b> temperate marshes<br />
      <h3 class="framing">Special Abilities</h3><b>Rend (Ex)</b> Deals extra damage.</span>`;

    const parsed = parseAonMonsterPage(html, {
      name: 'Gray Render', itemName: 'Gray Render', challengeRating: '8', creatureType: 'magical beast', environment: 'temperate marshes',
    });

    expect(parsed.gameSystem).toBe('PATHFINDER_1E');
    expect(parsed.size).toEqual({ width: 2, height: 2 });
    expect(parsed.statBlock).toMatchObject({
      ac: 21,
      hitPoints: 100,
      abilities: { str: 25, dex: 13, con: 24, int: 3, wis: 14, cha: 8 },
      savingThrows: { fort: 13, reflex: 7, will: 4 },
      skills: { perception: 13, survival: 6 },
      defensiveAbilities: 'ferocity',
      damageReduction: '5/cold iron',
      damageImmunities: 'poison',
      damageResistances: 'fire 10',
      spellResistance: '19',
      weaknesses: 'light sensitivity',
      _aonHydrated: true,
      _aonItemName: 'Gray Render',
      spellcasting: [
        {name:'Spell-Like Abilities',spells:[{name:'detect magic'}]},
        {name:'Sorcerer Spells Known',spells:[{name:'magic missile'}]},
      ],
    });
  });

  it('keeps the real AoN ItemName when the catalogue label is different', () => {
    const indexHtml = `<table><tr><td><a href="MonsterDisplay.aspx?ItemName=Human Zombie">Zombie, Human Zombie</a></td><td>1/2</td><td>undead</td><td>any</td></tr></table>`;
    const [entry] = parseAonMonsterIndex(indexHtml);
    expect(entry).toMatchObject({ name: 'Zombie, Human Zombie', itemName: 'Human Zombie' });

    const pageHtml = `<span id="MainContent_DataListFeats_Label1_0">
      <h1 class="title">Human Zombie</h1><h2 class="title">Human Zombie CR 1/2</h2>
      <b>XP</b> 200<br />NE Medium undead<br /><b>Init</b> -2
      <h3>Defense</h3><b>AC</b> 12<br /><b>hp</b> 12<br />
      <h3>Offense</h3><b>Speed</b> 30 ft.<br />
      <h3>Statistics</h3><b>Str</b> 17, <b>Dex</b> 6, <b>Con</b> —, <b>Int</b> —, <b>Wis</b> 10, <b>Cha</b> 10<br />
      <h3>Ecology</h3><b>Environment</b> any<br /></span>`;
    const parsed = parseAonMonsterPage(pageHtml, entry);
    expect(parsed.statBlock).toMatchObject({
      sourceUrl: 'https://www.aonprd.com/MonsterDisplay.aspx?ItemName=Human%20Zombie',
      _aonItemName: 'Human Zombie',
    });
  });
});
