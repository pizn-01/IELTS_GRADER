const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const {
  buildSubscriptionStatusPayload,
  reconcileUserSubscription,
} = require('../services/subscriptionSync');
const { getAllPlans, getNewUserPromoPayload } = require('../services/subscriptionPlans');

const router = express.Router();

// ─── GET /api/subscriptions/status ───────────────────────────────────────────
router.get('/status', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const reconciled = await reconcileUserSubscription(userId);

    const [{ data: profile, error }, { count: paymentCount }] = await Promise.all([
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

    return res.json({
      ...payload,
      plans: getAllPlans(),
      promo: getNewUserPromoPayload({ eligible: !payload.has_paid }),
    });
  } catch (err) {
    console.error('[subscriptions/status]', err.message);
    return res.status(500).json({ error: 'Failed to load subscription status.' });
  }
});

module.exports = router;
