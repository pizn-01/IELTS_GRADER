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
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const wrap = (title, body, ctaText, ctaHref, note) => `
<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;padding:48px 16px;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:40px 36px;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
<tr><td>
  <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.12em;">IELTS Grader</p>
  <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#1a1f36;letter-spacing:-0.02em;">${title}</h1>
  <div style="font-size:15px;color:#4B5563;line-height:1.75;margin-bottom:32px;">${body}</div>
  ${ctaHref ? `<a href="${ctaHref}" style="display:inline-block;background:#2C3E50;color:#fff;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;letter-spacing:0.01em;">${ctaText}</a>` : ''}
  ${note ? `<p style="font-size:12px;color:#9CA3AF;margin:20px 0 0;">${note}</p>` : ''}
  <hr style="border:none;border-top:1px solid #E5E7EB;margin:28px 0;"/>
  <p style="font-size:12px;color:#D1D5DB;margin:0;">IELTS Grader &mdash; AI-powered IELTS writing feedback</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

async function sendVerificationEmail(email, fullName, token) {
  const link = `${FRONTEND_URL}/account-verified?token=${encodeURIComponent(token)}`;
  const { error } = await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your IELTS Grader account',
    html: wrap(
      'Verify Your Email',
      `Hi ${fullName || 'there'},<br/><br/>Thank you for signing up for IELTS Grader. Click the button below to verify your email address and activate your account.`,
      'Verify Email Address',
      link,
      'This link expires in 24 hours. If you didn\'t create an account, you can safely ignore this email.'
    ),
  });
  if (error) {
    console.error('[email/sendVerification]', error);
    throw new Error('Failed to send verification email.');
  }
}

async function sendPasswordResetEmail(email, fullName, token) {
  const link = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const { error } = await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your IELTS Grader password',
    html: wrap(
      'Reset Your Password',
      `Hi ${fullName || 'there'},<br/><br/>We received a request to reset your IELTS Grader password. Click the button below to choose a new password.`,
      'Reset Password',
      link,
      'This link expires in 1 hour. If you didn\'t request a password reset, you can safely ignore this email.'
    ),
  });
  if (error) {
    console.error('[email/sendPasswordReset]', error);
    throw new Error('Failed to send password reset email.');
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
