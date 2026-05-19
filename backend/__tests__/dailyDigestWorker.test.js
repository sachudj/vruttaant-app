'use strict';

jest.mock('../src/models/User');
jest.mock('../src/models/NewsCard');
jest.mock('../src/models/NotificationDevice');
jest.mock('../src/services/pushNotificationService');
jest.mock('../src/services/digestEmailService');

const User = require('../src/models/User');
const NewsCard = require('../src/models/NewsCard');
const NotificationDevice = require('../src/models/NotificationDevice');
const pushNotificationService = require('../src/services/pushNotificationService');
const digestEmailService = require('../src/services/digestEmailService');

const { sendDailyDigest } = require('../src/jobs/dailyDigestWorker');

const MOCK_CARDS = [
  { _id: 'card1', title: 'Top Story', category: 'Technology', summary: 'Summary.' },
  { _id: 'card2', title: 'Second Story', category: 'Business', summary: 'Another.' }
];

function makeAsyncIterator(items) {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        next: async () =>
          i < items.length
            ? { value: items[i++], done: false }
            : { value: undefined, done: true }
      };
    }
  };
}

describe('dailyDigestWorker.sendDailyDigest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exits early and logs when no cards in last 24h', async () => {
    NewsCard.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      })
    });

    // Should not touch User at all
    await sendDailyDigest();

    expect(User.find).not.toHaveBeenCalled();
    expect(pushNotificationService.sendMulticast).not.toHaveBeenCalled();
    expect(digestEmailService.sendDigestEmail).not.toHaveBeenCalled();
  });

  it('processes users with push + email when cards exist', async () => {
    NewsCard.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(MOCK_CARDS)
        })
      })
    });

    const user1 = { _id: 'uid1', email: 'a@example.com' };
    const user2 = { _id: 'uid2', email: 'b@example.com' };

    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        cursor: jest.fn().mockReturnValue(makeAsyncIterator([user1, user2]))
      })
    });

    NotificationDevice.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ token: 'tok1' }, { token: 'tok2' }])
    });

    pushNotificationService.sendMulticast.mockResolvedValue({ responses: [] });
    digestEmailService.sendDigestEmail.mockResolvedValue({ sent: false, mock: true, recipient: 'x' });

    await sendDailyDigest();

    // Push called for each user
    expect(pushNotificationService.sendMulticast).toHaveBeenCalledTimes(2);
    // Email called for each user
    expect(digestEmailService.sendDigestEmail).toHaveBeenCalledTimes(2);
    expect(digestEmailService.sendDigestEmail).toHaveBeenCalledWith(user1, MOCK_CARDS);
    expect(digestEmailService.sendDigestEmail).toHaveBeenCalledWith(user2, MOCK_CARDS);
  });

  it('does not send push when user has no devices', async () => {
    NewsCard.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(MOCK_CARDS)
        })
      })
    });

    const user = { _id: 'uid1', email: 'a@example.com' };

    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        cursor: jest.fn().mockReturnValue(makeAsyncIterator([user]))
      })
    });

    NotificationDevice.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    digestEmailService.sendDigestEmail.mockResolvedValue({ sent: true, messageId: 'mid1', recipient: 'a@example.com' });

    await sendDailyDigest();

    expect(pushNotificationService.sendMulticast).not.toHaveBeenCalled();
    expect(digestEmailService.sendDigestEmail).toHaveBeenCalledTimes(1);
  });

  it('skips email (but not push) for user without email field', async () => {
    NewsCard.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(MOCK_CARDS)
        })
      })
    });

    // User has no email
    const user = { _id: 'uid1' };

    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        cursor: jest.fn().mockReturnValue(makeAsyncIterator([user]))
      })
    });

    NotificationDevice.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ token: 'tok1' }]) });
    pushNotificationService.sendMulticast.mockResolvedValue({ responses: [] });

    await sendDailyDigest();

    expect(pushNotificationService.sendMulticast).toHaveBeenCalledTimes(1);
    expect(digestEmailService.sendDigestEmail).not.toHaveBeenCalled();
  });

  it('continues processing remaining users if one email fails', async () => {
    NewsCard.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(MOCK_CARDS)
        })
      })
    });

    const user1 = { _id: 'uid1', email: 'fail@example.com' };
    const user2 = { _id: 'uid2', email: 'ok@example.com' };

    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        cursor: jest.fn().mockReturnValue(makeAsyncIterator([user1, user2]))
      })
    });

    NotificationDevice.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

    digestEmailService.sendDigestEmail
      .mockRejectedValueOnce(new Error('SMTP failure'))
      .mockResolvedValueOnce({ sent: true, messageId: 'mid2', recipient: 'ok@example.com' });

    await sendDailyDigest(); // should not throw

    expect(digestEmailService.sendDigestEmail).toHaveBeenCalledTimes(2);
  });

  it('removes invalid FCM tokens returned by sendMulticast', async () => {
    NewsCard.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(MOCK_CARDS)
        })
      })
    });

    const user = { _id: 'uid1', email: 'a@example.com' };

    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        cursor: jest.fn().mockReturnValue(makeAsyncIterator([user]))
      })
    });

    NotificationDevice.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ token: 'bad-token' }]) });

    pushNotificationService.sendMulticast.mockResolvedValue({
      responses: [
        {
          success: false,
          error: { code: 'messaging/invalid-registration-token' }
        }
      ]
    });
    NotificationDevice.deleteOne = jest.fn().mockResolvedValue({});
    digestEmailService.sendDigestEmail.mockResolvedValue({ sent: false, mock: true });

    await sendDailyDigest();

    expect(NotificationDevice.deleteOne).toHaveBeenCalledWith({ token: 'bad-token' });
  });

  it('does not crash when the whole job throws unexpectedly', async () => {
    NewsCard.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('DB down'))
        })
      })
    });

    await expect(sendDailyDigest()).resolves.toBeUndefined();
  });
});
