import request from 'supertest';
import { createTestApp } from '../../__tests__/helpers/test-app';
import { cleanupUsers, createTestCampaign, createTestUser, prisma, TEST_PASSWORD } from '../../__tests__/helpers/db';

const app = createTestApp();

describe('character sheet access', () => {
  let dmId: string;
  let playerId: string;
  let campaignId: string;
  let dmCharacterId: string;
  let dmAgent: ReturnType<typeof request.agent>;
  let playerAgent: ReturnType<typeof request.agent>;

  async function login(email: string) {
    const agent = request.agent(app);
    const response = await agent.post('/api/auth/login').send({ email, password: TEST_PASSWORD });
    expect(response.status).toBe(200);
    return agent;
  }

  beforeAll(async () => {
    const stamp = Date.now();
    const dm = await createTestUser({ email: `character_dm_${stamp}@test.invalid` });
    const player = await createTestUser({ email: `character_player_${stamp}@test.invalid` });
    dmId = dm.id;
    playerId = player.id;

    const campaign = await createTestCampaign(dmId);
    campaignId = campaign.id;
    await prisma.campaignMembership.createMany({
      data: [
        { campaignId, userId: dmId, role: 'DM' },
        { campaignId, userId: playerId, role: 'PLAYER' },
      ],
    });
    const character = await prisma.character.create({
      data: { name: 'DM Secret', userId: dmId, campaignId, data: { secret: true } },
    });
    dmCharacterId = character.id;

    dmAgent = await login(`character_dm_${stamp}@test.invalid`);
    playerAgent = await login(`character_player_${stamp}@test.invalid`);
  });

  afterAll(async () => {
    await prisma.character.deleteMany({ where: { id: dmCharacterId } });
    await prisma.campaignMembership.deleteMany({ where: { campaignId } });
    await prisma.campaign.delete({ where: { id: campaignId } });
    await cleanupUsers([dmId, playerId]);
    await prisma.$disconnect();
  });

  it('denies a player access to a DM-owned sheet', async () => {
    const response = await playerAgent.get(`/api/characters/${dmCharacterId}`);

    expect(response.status).toBe(403);
    expect(response.body.character).toBeUndefined();
  });

  it('omits DM-owned characters from a player roster response', async () => {
    const response = await playerAgent.get(`/api/campaigns/${campaignId}/characters`);

    expect(response.status).toBe(200);
    expect(response.body.roster).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: dmId, characters: [] }),
    ]));
  });

  it('still lets the DM view their own sheet', async () => {
    const response = await dmAgent.get(`/api/characters/${dmCharacterId}`);

    expect(response.status).toBe(200);
    expect(response.body.character.id).toBe(dmCharacterId);
  });
});
