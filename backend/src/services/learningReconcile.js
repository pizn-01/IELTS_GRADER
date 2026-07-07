const { supabaseAdmin } = require('./supabase');
const { generateEditionPdf } = require('./learningGenerator');

const STALE_MS = 12 * 60 * 1000;
const PENDING_RESET_MS = 3 * 60 * 1000;

let _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured.');
    _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

function isStale(updatedAt, createdAt) {
  const ts = new Date(updatedAt || createdAt || 0).getTime();
  return Date.now() - ts > STALE_MS;
}

/**
 * Recover editions stuck in pending_payment / generating.
 * Never starts LLM — only resets abandoned checkouts, verifies paid Stripe (webhook backup), or times out.
 */
async function reconcileEdition(userId, editionNumber, freeAccess) {
  const { data: row } = await supabaseAdmin
    .from('personalized_learning_editions')
    .select('*')
    .eq('user_id', userId)
    .eq('edition_number', editionNumber)
    .maybeSingle();

  if (!row || row.status === 'ready' || row.status === 'preview' || row.status === 'failed') {
    return row;
  }

  // Unpaid pending_payment — reset to preview so user must click Generate or complete Stripe.
  if (row.status === 'pending_payment' && !row.paid_at) {
    if (freeAccess) {
      await supabaseAdmin
        .from('personalized_learning_editions')
        .update({ status: 'preview', stripe_session_id: null })
        .eq('id', row.id);
      return { ...row, status: 'preview', stripe_session_id: null };
    }

    if (!row.stripe_session_id) {
      await supabaseAdmin
        .from('personalized_learning_editions')
        .update({ status: 'preview', stripe_session_id: null })
        .eq('id', row.id);
      return { ...row, status: 'preview', stripe_session_id: null };
    }

    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(row.stripe_session_id);

      if (session.payment_status === 'paid' || session.status === 'complete') {
        await supabaseAdmin
          .from('personalized_learning_editions')
          .update({
            status: 'generating',
            paid_at: new Date().toISOString(),
          })
          .eq('id', row.id);

        generateEditionPdf(userId, editionNumber).catch((err) => {
          console.error('[learningReconcile] paid session generation failed:', err.message);
        });

        return { ...row, status: 'generating' };
      }

      const ageMs = Date.now() - new Date(row.created_at || 0).getTime();
      const unpaid = session.payment_status !== 'paid';
      if (unpaid && (session.status === 'expired' || (session.status === 'open' && ageMs > PENDING_RESET_MS))) {
        await supabaseAdmin
          .from('personalized_learning_editions')
          .update({ status: 'preview', stripe_session_id: null })
          .eq('id', row.id);
        return { ...row, status: 'preview', stripe_session_id: null };
      }
    } catch (err) {
      console.error('[learningReconcile] stripe retrieve failed:', err.message);
    }

    return row;
  }

  if (row.status === 'generating' && isStale(row.paid_at, row.created_at)) {
    await supabaseAdmin
      .from('personalized_learning_editions')
      .update({
        status: 'failed',
        error_message: 'Generation timed out. Please try again.',
      })
      .eq('id', row.id);
    return { ...row, status: 'failed' };
  }

  return row;
}

module.exports = { reconcileEdition };
