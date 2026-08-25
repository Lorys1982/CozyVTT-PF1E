import { parseAonSpellIndex, parseAonSpellPage } from './pathfinder1eSpellService';

describe('Archives of Nethys PF1e spell parsing', () => {
  it('parses spell search entries with their real ItemName', () => {
    const html = `<span><b><a href="SpellDisplay.aspx?ItemName=Fireball"><img src="pfs.gif"> Fireball</a></b>: A fiery explosion.<br /></span>`;
    expect(parseAonSpellIndex(html)).toEqual([{
      name:'Fireball',itemName:'Fireball',summary:'A fiery explosion.',
      sourceUrl:'https://www.aonprd.com/SpellDisplay.aspx?ItemName=Fireball',
    }]);
  });

  it('parses complete spell rules text', () => {
    const summary = parseAonSpellIndex(`<b><a href="SpellDisplay.aspx?ItemName=Fireball">Fireball</a></b>: A fiery explosion.<br />`)[0];
    const html = `<span id="MainContent_DataListTypes_LabelName_1"><h1 class="title">Fireball</h1>
      <b>Source</b> <i>Core Rulebook pg. 283</i><br /><b>School</b> evocation [fire]; <b>Level</b> sorcerer 3, wizard 3
      <h3 class="framing">Casting</h3><b>Casting Time</b> 1 standard action<br /><b>Components</b> V, S, M
      <h3 class="framing">Effect</h3><b>Range</b> long<br /><b>Area</b> 20-ft.-radius spread<br /><b>Duration</b> instantaneous<br />
      <b>Saving Throw</b> Reflex half; <b>Spell Resistance</b> yes<h3 class="framing">Description</h3>Deals 1d6 fire damage per caster level.</span>`;
    expect(parseAonSpellPage(html,summary)).toMatchObject({
      name:'Fireball',school:'evocation [fire]',levels:'sorcerer 3, wizard 3',castingTime:'1 standard action',
      range:'long',area:'20-ft.-radius spread',duration:'instantaneous',savingThrow:'Reflex half',
      spellResistance:'yes',description:'Deals 1d6 fire damage per caster level.',
    });
  });
});
