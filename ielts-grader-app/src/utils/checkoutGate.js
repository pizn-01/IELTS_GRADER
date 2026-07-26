import { api } from '../services/api';
import {
  markVerificationEmailSent,
  wasVerificationEmailSent,
  setPendingCheckout,
  peekPendingCheckout,
  consumePendingCheckout,
} from '../utils/authStorage';

/**
 * Ensure the user has verified email before Stripe checkout.
 * If not verified: persist pending plan, send verify email once, return false
 * so the caller can show VerifyEmailModal / navigate to verify page.
 * If verified: return true and let the caller proceed.
 */
export async function ensureVerifiedForCheckout(user, { plan, returnPath }) {
  if (!user) return false;
  if (user.email_verified) return true;

  setPendingCheckout({ plan, returnPath });

  if (user.email && !wasVerificationEmailSent()) {
    try {
      const result = await api.sendVerification();
      if (!result?.already_verified) markVerificationEmailSent();
    } catch {
      try {
        await api.resendVerification(user.email);
        markVerificationEmailSent();
      } catch {
        /* verify UI can retry */
      }
    }
  }

  return false;
}

/**
 * After email verification succeeds, resume Stripe checkout if one was pending.
 * Returns true if a redirect was started.
 */
export async function resumePendingCheckoutIfAny() {
  const pending = peekPendingCheckout();
  if (!pending?.plan) {
    consumePendingCheckout();
    return false;
  }

  try {
    const { url } = await api.createSubscriptionCheckout(pending.plan);
    consumePendingCheckout();
    window.location.href = url;
    return true;
  } catch {
    // Leave pending so user can retry from returnPath
    return false;
  }
}

export function getPendingCheckoutReturnPath(fallback = '/upgrade') {
  const pending = peekPendingCheckout();
  return pending?.returnPath || fallback;
}
