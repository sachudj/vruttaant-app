'use strict';

jest.mock('nodemailer');

const nodemailer = require('nodemailer');
const {
  buildDigestEmailHtml,
  buildDigestEmailText,
  sendDigestEmail,
  createTransporter,
  escapeHtml,
  _resetTransporter
} = require('../src/services/digestEmailService');

const MOCK_CARDS = [
  { title: 'Top Story One', category: 'Technology', summary: 'Summary of story one about tech.' },
  { title: 'Second Story', category: 'Business', summary: 'Summary of story two about business.' },
  { title: 'Third Story', category: 'Health', summary: null }
];

const MOCK_USER = { email: 'user@example.com', preferences: { language: 'en' } };

describe('digestEmailService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.EMAIL_HOST;
    _resetTransporter();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── escapeHtml ──────────────────────────────────────────────────────────────
  describe('escapeHtml', () => {
    it('escapes & < > " \'', () => {
      expect(escapeHtml('a & b < c > d "e" \'f\'')).toBe(
        'a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;'
      );
    });

    it('leaves safe strings unchanged', () => {
      expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
    });

    it('coerces non-string input to string', () => {
      expect(escapeHtml(42)).toBe('42');
    });
  });

  // ─── buildDigestEmailHtml ────────────────────────────────────────────────────
  describe('buildDigestEmailHtml', () => {
    it('returns a string containing DOCTYPE', () => {
      const html = buildDigestEmailHtml(MOCK_USER, MOCK_CARDS);
      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('includes all card titles', () => {
      const html = buildDigestEmailHtml(MOCK_USER, MOCK_CARDS);
      expect(html).toContain('Top Story One');
      expect(html).toContain('Second Story');
      expect(html).toContain('Third Story');
    });

    it('includes card categories', () => {
      const html = buildDigestEmailHtml(MOCK_USER, MOCK_CARDS);
      expect(html).toContain('Technology');
      expect(html).toContain('Business');
      expect(html).toContain('Health');
    });

    it('includes summaries where available', () => {
      const html = buildDigestEmailHtml(MOCK_USER, MOCK_CARDS);
      expect(html).toContain('Summary of story one about tech.');
    });

    it('truncates long summaries to 180 chars with ellipsis', () => {
      const longCard = [{ title: 'Long', category: 'News', summary: 'x'.repeat(300) }];
      const html = buildDigestEmailHtml(MOCK_USER, longCard);
      expect(html).toContain('…');
      // Summary in HTML should be exactly 180 chars of 'x' + ellipsis
      expect(html).toContain('x'.repeat(180) + '…');
    });

    it('handles cards without summaries gracefully', () => {
      const html = buildDigestEmailHtml(MOCK_USER, [MOCK_CARDS[2]]);
      expect(html).toContain('Third Story');
      // no empty <p> tag from null summary
      expect(html).not.toContain('<p>null</p>');
    });

    it('escapes HTML special chars in title', () => {
      const xssCard = [{ title: '<script>alert("xss")</script>', category: 'News', summary: null }];
      const html = buildDigestEmailHtml(MOCK_USER, xssCard);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('contains Vruttaant branding', () => {
      const html = buildDigestEmailHtml(MOCK_USER, MOCK_CARDS);
      expect(html).toContain('Vruttaant');
    });
  });

  // ─── buildDigestEmailText ────────────────────────────────────────────────────
  describe('buildDigestEmailText', () => {
    it('returns a string with card titles', () => {
      const text = buildDigestEmailText(MOCK_USER, MOCK_CARDS);
      expect(typeof text).toBe('string');
      expect(text).toContain('Top Story One');
      expect(text).toContain('Second Story');
    });

    it('includes category in brackets', () => {
      const text = buildDigestEmailText(MOCK_USER, MOCK_CARDS);
      expect(text).toContain('[Technology]');
      expect(text).toContain('[Business]');
    });

    it('includes truncated summary', () => {
      const text = buildDigestEmailText(MOCK_USER, MOCK_CARDS);
      expect(text).toContain('Summary of story one about tech.');
    });

    it('truncates long summaries to 160 chars', () => {
      const longCard = [{ title: 'Long', category: 'News', summary: 'y'.repeat(300) }];
      const text = buildDigestEmailText(MOCK_USER, longCard);
      // should only include 160 y's
      expect(text).toContain('y'.repeat(160));
      expect(text).not.toContain('y'.repeat(161));
    });

    it('includes unsubscribe footer text', () => {
      const text = buildDigestEmailText(MOCK_USER, MOCK_CARDS);
      expect(text).toContain('Daily Digest');
    });
  });

  // ─── createTransporter ───────────────────────────────────────────────────────
  describe('createTransporter', () => {
    it('returns null when EMAIL_HOST is not set', () => {
      delete process.env.EMAIL_HOST;
      expect(createTransporter()).toBeNull();
    });

    it('calls nodemailer.createTransport with correct config when EMAIL_HOST is set', () => {
      const mockTransport = {};
      nodemailer.createTransport.mockReturnValue(mockTransport);

      process.env.EMAIL_HOST = 'smtp.example.com';
      process.env.EMAIL_PORT = '587';
      process.env.EMAIL_USER = 'user@example.com';
      process.env.EMAIL_PASS = 'secret';
      process.env.EMAIL_SECURE = 'false';

      const result = createTransporter();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.example.com',
          port: 587,
          auth: expect.objectContaining({ user: 'user@example.com' })
        })
      );
      expect(result).toBe(mockTransport);
    });
  });

  // ─── sendDigestEmail ─────────────────────────────────────────────────────────
  describe('sendDigestEmail', () => {
    it('returns { sent: false, mock: true } when EMAIL_HOST is not configured', async () => {
      delete process.env.EMAIL_HOST;
      const result = await sendDigestEmail(MOCK_USER, MOCK_CARDS);
      expect(result).toMatchObject({ sent: false, mock: true, recipient: 'user@example.com' });
    });

    it('calls sendMail and returns { sent: true, messageId } when transporter is configured', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg-123' });
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      process.env.EMAIL_HOST = 'smtp.example.com';
      process.env.EMAIL_PORT = '587';
      process.env.EMAIL_USER = 'u';
      process.env.EMAIL_PASS = 'p';

      const result = await sendDigestEmail(MOCK_USER, MOCK_CARDS);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Vruttaant Digest'),
          html: expect.any(String),
          text: expect.any(String)
        })
      );
      expect(result).toMatchObject({ sent: true, messageId: 'msg-123', recipient: 'user@example.com' });
    });

    it('propagates sendMail errors to the caller', async () => {
      const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP failure'));
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      process.env.EMAIL_HOST = 'smtp.example.com';
      process.env.EMAIL_PORT = '587';
      process.env.EMAIL_USER = 'u';
      process.env.EMAIL_PASS = 'p';

      await expect(sendDigestEmail(MOCK_USER, MOCK_CARDS)).rejects.toThrow('SMTP failure');
    });
  });
});
