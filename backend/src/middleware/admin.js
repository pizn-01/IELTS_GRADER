const { supabaseAdmin } = require('../services/supabase');

/**
 * Middleware chain: authenticateToken must run first (it sets req.user).
 * This middleware then verifies the user has is_admin = true in profiles.
 */
const requireAdmin = async (req, res, next) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (error || !data?.is_admin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  next();
};

module.exports = { requireAdmin };
