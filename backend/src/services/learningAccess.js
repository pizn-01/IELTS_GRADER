const { supabaseAdmin } = require('./supabase');

/**
 * Admins get Personalized Learning PDFs without Stripe payment.
 */
async function hasLearningFreeAccess(userId) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  return Boolean(data?.is_admin);
}

module.exports = { hasLearningFreeAccess };
