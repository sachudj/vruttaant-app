'use strict';

jest.mock('../src/models/UserActivityEvent');
jest.mock('../src/models/NewsCard');
jest.mock('../src/observability/logger');

const UserActivityEvent = require('../src/models/UserActivityEvent');
const NewsCard = require('../src/models/NewsCard');
const logger = require('../src/observability/logger');

const { eventCaptureMiddleware, trackEvent } = require('../src/middleware/eventCapture');

// ─── helpers ──────────────────────────────────────────────────────────────────
function makeReqRes(overrides = {}) {
  const req = {
    user: { _id: 'uid1' },
    sessionId: 'sess1',
    headers: {
      'x-device-type': 'mobile',
      'x-platform': 'ios',
      'x-app-version': '1.0.0',
      'x-locale': 'en'
    },
    ...overrides
  };

  const originalJson = jest.fn();
  const originalEnd = jest.fn();

  const res = {
    statusCode: 200,
    locals: {},
    json: originalJson,
    end: originalEnd,
    _originalJson: originalJson,
    _originalEnd: originalEnd
  };

  return { req, res };
}

// ─── middleware wiring ────────────────────────────────────────────────────────
describe('eventCaptureMiddleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next()', () => {
    const { req, res } = makeReqRes();
    const next = jest.fn();
    eventCaptureMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('overrides res.json and res.end', () => {
    const { req, res } = makeReqRes();
    eventCaptureMiddleware(req, res, jest.fn());
    expect(res.json).not.toBe(res._originalJson);
    expect(res.end).not.toBe(res._originalEnd);
  });

  it('does NOT capture event when res.locals.captureEvent is absent on json()', () => {
    const { req, res } = makeReqRes();
    eventCaptureMiddleware(req, res, jest.fn());
    res.json({ ok: true });
    expect(UserActivityEvent.create).not.toHaveBeenCalled();
  });

  it('does NOT capture event when statusCode >= 400 on json()', () => {
    const { req, res } = makeReqRes();
    res.statusCode = 400;
    res.locals.captureEvent = { eventType: 'view', newsCardId: 'card1' };
    eventCaptureMiddleware(req, res, jest.fn());
    res.json({ error: true });
    expect(UserActivityEvent.create).not.toHaveBeenCalled();
  });

  it('captures event via res.json on successful response', async () => {
    const { req, res } = makeReqRes();
    res.locals.captureEvent = { eventType: 'view', newsCardId: 'card1' };
    NewsCard.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    UserActivityEvent.create = jest.fn().mockResolvedValue({});

    eventCaptureMiddleware(req, res, jest.fn());
    res.json({ ok: true });

    // Wait for microtasks
    await new Promise(r => setTimeout(r, 50));
    expect(UserActivityEvent.create).toHaveBeenCalled();
  });

  it('captures event via res.end on successful response', async () => {
    const { req, res } = makeReqRes();
    res.locals.captureEvent = { eventType: 'bookmark', newsCardId: 'card2' };
    NewsCard.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    UserActivityEvent.create = jest.fn().mockResolvedValue({});

    eventCaptureMiddleware(req, res, jest.fn());
    res.end();

    await new Promise(r => setTimeout(r, 50));
    expect(UserActivityEvent.create).toHaveBeenCalled();
  });

  it('skips capture when eventData has no newsCardId', async () => {
    const { req, res } = makeReqRes();
    res.locals.captureEvent = { eventType: 'view' }; // missing newsCardId
    UserActivityEvent.create = jest.fn().mockResolvedValue({});

    eventCaptureMiddleware(req, res, jest.fn());
    res.json({ ok: true });

    await new Promise(r => setTimeout(r, 50));
    expect(UserActivityEvent.create).not.toHaveBeenCalled();
  });

  it('attaches card metadata when card is found', async () => {
    const { req, res } = makeReqRes();
    res.locals.captureEvent = { eventType: 'view', newsCardId: 'card1' };
    const mockCard = { title: 'Test', category: 'Tech', language: 'en', source: 'bbc', publishedAt: new Date() };
    NewsCard.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockCard) });
    UserActivityEvent.create = jest.fn().mockResolvedValue({});

    eventCaptureMiddleware(req, res, jest.fn());
    res.json({ ok: true });

    await new Promise(r => setTimeout(r, 50));
    const createdEvent = UserActivityEvent.create.mock.calls[0][0];
    expect(createdEvent.cardMetadata).toMatchObject({ title: 'Test', category: 'Tech' });
  });

  it('logs error when card metadata fetch fails but still creates event', async () => {
    const { req, res } = makeReqRes();
    res.locals.captureEvent = { eventType: 'view', newsCardId: 'card1' };
    NewsCard.findById.mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('fetch fail')) });
    UserActivityEvent.create = jest.fn().mockResolvedValue({});

    eventCaptureMiddleware(req, res, jest.fn());
    res.json({ ok: true });

    await new Promise(r => setTimeout(r, 50));
    expect(UserActivityEvent.create).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('logs error when UserActivityEvent.create fails', async () => {
    const { req, res } = makeReqRes();
    res.locals.captureEvent = { eventType: 'view', newsCardId: 'card1' };
    NewsCard.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    UserActivityEvent.create = jest.fn().mockRejectedValue(new Error('db fail'));

    eventCaptureMiddleware(req, res, jest.fn());
    res.json({ ok: true });

    await new Promise(r => setTimeout(r, 50));
    expect(logger.error).toHaveBeenCalled();
  });

  it('works without req.user (anonymous event)', async () => {
    const { req, res } = makeReqRes({ user: null });
    res.locals.captureEvent = { eventType: 'view', newsCardId: 'card1' };
    NewsCard.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    UserActivityEvent.create = jest.fn().mockResolvedValue({});

    eventCaptureMiddleware(req, res, jest.fn());
    res.json({ ok: true });

    await new Promise(r => setTimeout(r, 50));
    const event = UserActivityEvent.create.mock.calls[0][0];
    expect(event.userId).toBeUndefined();
  });

  it('does NOT capture event when statusCode >= 400 on end()', async () => {
    const { req, res } = makeReqRes();
    res.statusCode = 500;
    res.locals.captureEvent = { eventType: 'view', newsCardId: 'card1' };
    UserActivityEvent.create = jest.fn();

    eventCaptureMiddleware(req, res, jest.fn());
    res.end();

    await new Promise(r => setTimeout(r, 50));
    expect(UserActivityEvent.create).not.toHaveBeenCalled();
  });
});

// ─── trackEvent helper ────────────────────────────────────────────────────────
describe('trackEvent', () => {
  it('returns object with eventType and newsCardId', () => {
    const result = trackEvent('view', 'card123');
    expect(result).toEqual({ eventType: 'view', newsCardId: 'card123' });
  });

  it('spreads additional metadata into the result', () => {
    const result = trackEvent('bookmark', 'card456', { duration: 30, source: 'feed' });
    expect(result).toMatchObject({ eventType: 'bookmark', newsCardId: 'card456', duration: 30, source: 'feed' });
  });

  it('works with empty metadata', () => {
    const result = trackEvent('share', 'card789', {});
    expect(result).toEqual({ eventType: 'share', newsCardId: 'card789' });
  });
});
