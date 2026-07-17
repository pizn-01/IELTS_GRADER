const { Resend } = require('resend');

let _resend = null;
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = process.env.EMAIL_FROM || 'IELTS Grader <noreply@ieltsgrader.com>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'support@ieltsgrader.com';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const wrap = (title, body, ctaText, ctaHref, note) => `
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;padding:48px 16px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:40px 36px;border:1px solid #E5E7EB;">
<tr><td>
  <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.12em;">IELTS Grader</p>
  <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#1a1f36;letter-spacing:-0.02em;">${title}</h1>
  <div style="font-size:15px;color:#4B5563;line-height:1.75;margin-bottom:28px;">${body}</div>
  ${ctaHref ? `<a href="${ctaHref}" style="display:inline-block;background:#2C3E50;color:#ffffff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;">${ctaText}</a>` : ''}
  ${ctaHref ? `<p style="font-size:12px;color:#9CA3AF;margin:20px 0 0;line-height:1.6;word-break:break-all;">Or paste this link into your browser:<br/><a href="${ctaHref}" style="color:#3B82F6;">${ctaHref}</a></p>` : ''}
  ${note ? `<p style="font-size:12px;color:#9CA3AF;margin:20px 0 0;line-height:1.6;">${note}</p>` : ''}
  <hr style="border:none;border-top:1px solid #E5E7EB;margin:28px 0;"/>
  <p style="font-size:12px;color:#D1D5DB;margin:0;">IELTS Grader: AI-powered IELTS writing feedback<br/>Questions? Reply to this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&mdash;/g, '—')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isRetryableError(error) {
  if (!error) return false;
  const status = error.statusCode || error.status || error.response?.status;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  const msg = String(error.message || error.name || '').toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('fetch failed') ||
    msg.includes('temporar')
  );
}

/**
 * Send via Resend with retries + idempotency. Throws on final failure.
 * @returns {{ id: string|null }}
 */
async function sendEmail({ to, subject, html, text, tags = [], idempotencyKey }) {
  const payload = {
    from: FROM,
    replyTo: REPLY_TO,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text: text || stripHtml(html),
    // Helps inbox providers treat this as unique transactional mail
    headers: {
      'X-Entity-Ref-ID': idempotencyKey || `${Date.now()}`,
    },
  };
  if (tags.length) payload.tags = tags;

  const options = idempotencyKey ? { idempotencyKey } : undefined;
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data, error } = await getResend().emails.send(payload, options);
      if (error) throw error;
      const id = data?.id || null;
      console.log('[email] sent', { to: payload.to[0], subject, id, attempt });
      return { id };
    } catch (err) {
      lastError = err;
      console.error('[email] attempt failed', {
        to: payload.to[0],
        subject,
        attempt,
        message: err?.message || String(err),
        status: err?.statusCode || err?.status,
      });
      if (attempt < 3 && isRetryableError(err)) {
        await sleep(400 * attempt * attempt);
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('Failed to send email.');
}

async function sendVerificationEmail(email, fullName, token, { idempotencyKey } = {}) {
  const link = `${FRONTEND_URL}/account-verified?token=${encodeURIComponent(token)}`;
  const greeting = fullName || 'there';
  const html = wrap(
    'Confirm your email',
    `Hi ${greeting},<br/><br/>Please confirm your email address for your IELTS Grader account. This keeps your reports secure and lets you continue practicing.`,
    'Confirm email address',
    link,
    'This link expires in 24 hours. If you did not create an account, you can ignore this email.'
  );
  const text = [
    `Hi ${greeting},`,
    '',
    'Please confirm your email address for your IELTS Grader account.',
    '',
    `Confirm email: ${link}`,
    '',
    'This link expires in 24 hours. If you did not create an account, you can ignore this email.',
    '',
    '- IELTS Grader',
  ].join('\n');

  try {
    return await sendEmail({
      to: email,
      subject: 'Confirm your IELTS Grader email',
      html,
      text,
      tags: [
        { name: 'category', value: 'email_verification' },
      ],
      idempotencyKey: idempotencyKey || `verify/${token}`,
    });
  } catch (error) {
    console.error('[email/sendVerification]', error?.message || error);
    throw new Error('Failed to send verification email. Please try again in a moment.');
  }
}

async function sendPasswordResetEmail(email, fullName, token, { idempotencyKey } = {}) {
  const link = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const greeting = fullName || 'there';
  const html = wrap(
    'Reset your password',
    `Hi ${greeting},<br/><br/>We received a request to reset your IELTS Grader password. Click the button below to choose a new password.`,
    'Reset password',
    link,
    'This link expires in 1 hour. If you did not request a password reset, you can ignore this email.'
  );
  const text = [
    `Hi ${greeting},`,
    '',
    'We received a request to reset your IELTS Grader password.',
    '',
    `Reset password: ${link}`,
    '',
    'This link expires in 1 hour. If you did not request a password reset, you can ignore this email.',
    '',
    '- IELTS Grader',
  ].join('\n');

  try {
    return await sendEmail({
      to: email,
      subject: 'Reset your IELTS Grader password',
      html,
      text,
      tags: [
        { name: 'category', value: 'password_reset' },
      ],
      idempotencyKey: idempotencyKey || `reset/${token}`,
    });
  } catch (error) {
    console.error('[email/sendPasswordReset]', error?.message || error);
    throw new Error('Failed to send password reset email. Please try again in a moment.');
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
