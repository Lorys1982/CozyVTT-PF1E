import { parseAonFeatPage, parseAonFeatSearch } from './pathfinder1eFeatService';

describe('Archives of Nethys PF1e feat parsing',()=>{
  it('parses and deduplicates official feat search results',()=>{
    const html=`<a href="FeatDisplay.aspx?ItemName=Power%20Attack">Power Attack (Feats)*</a>
      <a href="FeatDisplay.aspx?ItemName=Power%20Attack">Power Attack</a>`;
    expect(parseAonFeatSearch(html)).toEqual([{
      name:'Power Attack',itemName:'Power Attack',
      sourceUrl:'https://www.aonprd.com/FeatDisplay.aspx?ItemName=Power%20Attack',
    }]);
  });

  it('parses structured feat rules',()=>{
    const fallback={name:'Power Attack',itemName:'Power Attack',sourceUrl:'https://www.aonprd.com/FeatDisplay.aspx?ItemName=Power%20Attack'};
    const html=`<span id="MainContent_DataListTypes_LabelName_1"><h1 class="title">Power Attack (Combat)</h1>
      <b>Source</b> Core Rulebook pg. 131<br />Trade accuracy for damage.<br />
      <b>Prerequisites:</b> Str 13, base attack bonus +1.<br />
      <b>Benefit:</b> Take a –1 penalty on attacks to gain +2 damage.<br />
      <b>Special:</b> This feat scales with base attack bonus.</span>`;
    expect(parseAonFeatPage(html,fallback)).toMatchObject({
      name:'Power Attack',type:'Combat',source:'Core Rulebook pg. 131',description:'Trade accuracy for damage.',
      prerequisites:'Str 13, base attack bonus +1.',benefit:'Take a –1 penalty on attacks to gain +2 damage.',
      special:'This feat scales with base attack bonus.',
    });
  });
});
