'use strict';

jest.mock('../src/models/User');
jest.mock('../src/models/NotificationDevice');
jest.mock('../src/models/UserCohort');

const User = require('../src/models/User');
const NotificationDevice = require('../src/models/NotificationDevice');
const UserCohort = require('../src/models/UserCohort');

const {
  computeUserCohorts,
  assignUserToCohorts,
  getUserCohorts,
  getCohortStats,
  getCohortUsers
} = require('../src/services/cohortService');

// ─── helpers ──────────────────────────────────────────────────────────────────
const makeUser = (overrides = {}) => ({
  preferences: { language: 'en', categories: ['Technology', 'Business'] },
  ...overrides
});

const makeDevices = (platforms = ['android']) =>
  platforms.map(p => ({ platform: p }));

// ─── computeUserCohorts ───────────────────────────────────────────────────────
describe('cohortService.computeUserCohorts', () => {
  it('produces a language cohort from preferences.language', () => {
    const result = computeUserCohorts(makeUser(), []);
    expect(result).toEqual(expect.arrayContaining([
      { cohortId: 'language_en', cohortType: 'language' }
    ]));
  });

  it('lowercases and slugifies language', () => {
    const result = computeUserCohorts(makeUser({ preferences: { language: 'HI', categories: [] } }), []);
    expect(result).toEqual(expect.arrayContaining([
      { cohortId: 'language_hi', cohortType: 'language' }
    ]));
  });

  it('defaults to language_en when language is missing', () => {
    const result = computeUserCohorts({ preferences: {} }, []);
    expect(result).toEqual(expect.arrayContaining([
      { cohortId: 'language_en', cohortType: 'language' }
    ]));
  });

  it('produces a category cohort per preferred category', () => {
    const result = computeUserCohorts(makeUser(), []);
    expect(result).toEqual(expect.arrayContaining([
      { cohortId: 'category_technology', cohortType: 'category' },
      { cohortId: 'category_business', cohortType: 'category' }
    ]));
  });

  it('slugifies categories with spaces', () => {
    const result = computeUserCohorts(
      makeUser({ preferences: { language: 'en', categories: ['Health & Science'] } }),
      []
    );
    expect(result).toEqual(expect.arrayContaining([
      { cohortId: 'category_health__science', cohortType: 'category' }
    ]));
  });

  it('skips empty category slugs', () => {
    const result = computeUserCohorts(
      makeUser({ preferences: { language: 'en', categories: ['!!!', ''] } }),
      []
    );
    const cats = result.filter(c => c.cohortType === 'category');
    expect(cats).toHaveLength(0);
  });

  it('produces device cohorts per unique platform', () => {
    const result = computeUserCohorts(makeUser(), makeDevices(['ios', 'android']));
    expect(result).toEqual(expect.arrayContaining([
      { cohortId: 'device_ios', cohortType: 'device' },
      { cohortId: 'device_android', cohortType: 'device' }
    ]));
  });

  it('deduplicates device platforms', () => {
    const result = computeUserCohorts(makeUser(), [{ platform: 'ios' }, { platform: 'ios' }]);
    const deviceCohorts = result.filter(c => c.cohortType === 'device');
    expect(deviceCohorts).toHaveLength(1);
  });

  it('adds engagement_multi_category when user has 3+ categories', () => {
    const user = makeUser({ preferences: { language: 'en', categories: ['A', 'B', 'C'] } });
    const result = computeUserCohorts(user, []);
    expect(result).toEqual(expect.arrayContaining([
      { cohortId: 'engagement_multi_category', cohortType: 'engagement' }
    ]));
  });

  it('does NOT add engagement_multi_category for fewer than 3 categories', () => {
    const result = computeUserCohorts(makeUser(), []); // 2 categories
    const multi = result.find(c => c.cohortId === 'engagement_multi_category');
    expect(multi).toBeUndefined();
  });

  it('adds engagement_no_device when user has no devices', () => {
    const result = computeUserCohorts(makeUser(), []);
    expect(result).toEqual(expect.arrayContaining([
      { cohortId: 'engagement_no_device', cohortType: 'engagement' }
    ]));
  });

  it('does NOT add engagement_no_device when user has devices', () => {
    const result = computeUserCohorts(makeUser(), makeDevices(['android']));
    const noDev = result.find(c => c.cohortId === 'engagement_no_device');
    expect(noDev).toBeUndefined();
  });

  it('handles user with no preferences gracefully', () => {
    const result = computeUserCohorts({}, []);
    expect(result).toEqual(expect.arrayContaining([
      { cohortId: 'language_en', cohortType: 'language' }
    ]));
  });
});

// ─── assignUserToCohorts ─────────────────────────────────────────────────────
describe('cohortService.assignUserToCohorts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 400 when userId is missing', async () => {
    await expect(assignUserToCohorts(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 when user is not found', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });
    NotificationDevice.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });
    await expect(assignUserToCohorts('uid1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('upserts cohorts and deletes stale ones', async () => {
    const user = makeUser();
    User.findById.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(user) }) });
    NotificationDevice.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ platform: 'ios' }]) }) });
    UserCohort.updateOne.mockResolvedValue({});
    UserCohort.deleteMany.mockResolvedValue({});

    const result = await assignUserToCohorts('uid1');

    expect(UserCohort.updateOne).toHaveBeenCalled();
    expect(UserCohort.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'uid1', cohortId: expect.objectContaining({ $nin: expect.any(Array) }) })
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns correct cohort structure', async () => {
    const user = makeUser({ preferences: { language: 'hi', categories: ['Sports'] } });
    User.findById.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(user) }) });
    NotificationDevice.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });
    UserCohort.updateOne.mockResolvedValue({});
    UserCohort.deleteMany.mockResolvedValue({});

    const result = await assignUserToCohorts('uid1');
    expect(result).toEqual(expect.arrayContaining([
      { cohortId: 'language_hi', cohortType: 'language' },
      { cohortId: 'category_sports', cohortType: 'category' }
    ]));
  });
});

// ─── getUserCohorts ───────────────────────────────────────────────────────────
describe('cohortService.getUserCohorts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 400 when userId is missing', async () => {
    await expect(getUserCohorts(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns cohort list from UserCohort model', async () => {
    const docs = [
      { cohortId: 'language_en', cohortType: 'language', assignedAt: new Date() },
      { cohortId: 'device_ios', cohortType: 'device', assignedAt: new Date() }
    ];
    UserCohort.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(docs)
        })
      })
    });

    const result = await getUserCohorts('uid1');
    expect(result).toEqual(docs);
  });
});

// ─── getCohortStats ───────────────────────────────────────────────────────────
describe('cohortService.getCohortStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns aggregated cohort stats', async () => {
    const aggResult = [
      { cohortId: 'language_en', cohortType: 'language', userCount: 42 },
      { cohortId: 'device_android', cohortType: 'device', userCount: 30 }
    ];
    UserCohort.aggregate.mockResolvedValue(aggResult);

    const result = await getCohortStats();
    expect(result).toEqual(aggResult);
    expect(UserCohort.aggregate).toHaveBeenCalledWith(expect.any(Array));
  });
});

// ─── getCohortUsers ───────────────────────────────────────────────────────────
describe('cohortService.getCohortUsers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws 400 when cohortId is missing', async () => {
    await expect(getCohortUsers(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns paginated users for a cohort', async () => {
    const docs = [
      { userId: 'uid1', assignedAt: new Date() },
      { userId: 'uid2', assignedAt: new Date() }
    ];
    UserCohort.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(docs)
            })
          })
        })
      })
    });
    UserCohort.countDocuments.mockResolvedValue(2);

    const result = await getCohortUsers('language_en', 1, 20);
    expect(result.cohortId).toBe('language_en');
    expect(result.total).toBe(2);
    expect(result.users).toHaveLength(2);
    expect(result.totalPages).toBe(1);
  });

  it('calculates totalPages correctly', async () => {
    UserCohort.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      })
    });
    UserCohort.countDocuments.mockResolvedValue(55);

    const result = await getCohortUsers('language_en', 1, 20);
    expect(result.totalPages).toBe(3);
  });
});
