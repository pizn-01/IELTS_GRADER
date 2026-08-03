const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const {
  buildSubscriptionStatusPayload,
  reconcileUserSubscription,
} = require('../services/subscriptionSync');
const {
  getAllPlans,
  getNewUserPromoPayload,
  isFirstMonthPromoEligible,
  subscriptionPaymentNames,
} = require('../services/subscriptionPlans');

const router = express.Router();

// ─── GET /api/subscriptions/status ───────────────────────────────────────────
router.get('/status', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const reconciled = await reconcileUserSubscription(userId);

    const [{ data: profile, error }, { count: paymentCount }, { count: subPaymentCount }] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select(`
          credits_remaining,
          pack_credits,
          credits_allowance,
          subscription_plan,
          subscription_status,
          subscription_period_end,
          stripe_subscription_id
        `)
        .eq('id', userId)
        .single(),
      supabaseAdmin
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed'),
      supabaseAdmin
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .in('pack_name', subscriptionPaymentNames()),
    ]);

    if (error || !profile) {
      return res.status(500).json({ error: 'Failed to load subscription status.' });
    }

    const hasPaid = (paymentCount ?? 0) > 0;
    const payload = buildSubscriptionStatusPayload({
      ...profile,
      ...reconciled,
      has_paid: hasPaid,
    });

    const promoEligible = isFirstMonthPromoEligible({
      isSubscribed: payload.is_subscribed,
      stripeSubscriptionId: profile.stripe_subscription_id || reconciled?.stripe_subscription_id,
      hasSubscriptionPayment: (subPaymentCount ?? 0) > 0,
    });

    return res.json({
      ...payload,
      plans: getAllPlans(),
      promo: getNewUserPromoPayload({ eligible: promoEligible }),
    });
  } catch (err) {
    console.error('[subscriptions/status]', err.message);
    return res.status(500).json({ error: 'Failed to load subscription status.' });
  }
});

module.exports = router;
