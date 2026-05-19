const nodemailer = require('nodemailer');

const EMAIL_FROM = process.env.EMAIL_FROM || 'Vruttaant <no-reply@vruttaant.app>';

let _transporter = null;

function isMockMode() {
  return !process.env.EMAIL_HOST;
}

function createTransporter() {
  if (isMockMode()) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

function getTransporter() {
  if (isMockMode()) {
    return null;
  }
  if (!_transporter) {
    _transporter = createTransporter();
  }
  return _transporter;
}

/**
 * Build an HTML email body for the daily digest.
 * @param {object} user  - Mongoose user doc (email, preferences.language)
 * @param {object[]} cards - Up to 5 news card lean objects
 * @returns {string} HTML string
 */
function buildDigestEmailHtml(user, cards) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const cardRows = cards.map((card, i) => `
    <tr>
      <td style="padding:12px 0; border-bottom:1px solid #f0f0f0;">
        <span style="display:inline-block;background:#e8f4fd;color:#1a73e8;font-size:11px;
          font-weight:600;padding:2px 8px;border-radius:12px;margin-bottom:6px;">
          ${escapeHtml(card.category || 'News')}
        </span>
        <p style="margin:4px 0 6px;font-size:16px;font-weight:600;color:#1a1a2e;line-height:1.4;">
          ${i + 1}. ${escapeHtml(card.title || '')}
        </p>
        ${card.summary ? `<p style="margin:0;font-size:14px;color:#555;line-height:1.5;">${escapeHtml(card.summary.slice(0, 180))}${card.summary.length > 180 ? '…' : ''}</p>` : ''}
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Daily Vruttaant Digest</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;
            box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a73e8,#0d47a1);
              padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;
                letter-spacing:-0.5px;">📰 Vruttaant</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Your Daily News Digest — ${escapeHtml(today)}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <p style="margin:0;font-size:15px;color:#444;">
                Here are today's top stories curated just for you:
              </p>
            </td>
          </tr>

          <!-- Stories -->
          <tr>
            <td style="padding:8px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${cardRows}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e8eaed;
              text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#888;">
                You're receiving this because you enabled Daily Digest in Vruttaant.
              </p>
              <p style="margin:0;font-size:12px;color:#aaa;">
                © ${new Date().getFullYear()} Vruttaant. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build a plain-text fallback for the daily digest.
 */
function buildDigestEmailText(user, cards) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const stories = cards.map((card, i) =>
    `${i + 1}. [${card.category || 'News'}] ${card.title || ''}${card.summary ? '\n   ' + card.summary.slice(0, 160) : ''}`
  ).join('\n\n');

  return `VRUTTAANT — Daily Digest
${today}

Here are today's top stories:

${stories}

---
You're receiving this because you enabled Daily Digest in Vruttaant.
`;
}

/**
 * Send the digest email to a single user.
 * Falls back to mock-mode logging when EMAIL_HOST is not configured.
 *
 * @param {object} user  - Must have { email }
 * @param {object[]} cards
 * @returns {Promise<{sent: boolean, messageId?: string, recipient: string}>}
 */
async function sendDigestEmail(user, cards) {
  const recipient = user.email;

  if (isMockMode()) {
    console.info({ recipient }, '[digestEmail] Mock mode — email not sent');
    return { sent: false, mock: true, recipient };
  }

  const html = buildDigestEmailHtml(user, cards);
  const text = buildDigestEmailText(user, cards);

  const info = await getTransporter().sendMail({
    from: EMAIL_FROM,
    to: recipient,
    subject: `Your Daily Vruttaant Digest — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    html,
    text
  });

  return { sent: true, messageId: info.messageId, recipient };
}

/** Escape user-supplied strings for safe HTML embedding. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  buildDigestEmailHtml,
  buildDigestEmailText,
  sendDigestEmail,
  createTransporter,
  escapeHtml,
  _resetTransporter() { _transporter = null; }
};
