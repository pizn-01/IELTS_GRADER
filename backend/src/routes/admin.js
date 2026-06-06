const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

// All admin routes require JWT + is_admin flag
router.use(authenticateToken, requireAdmin);

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
// Dashboard overview card counts
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalUsers },
      { count: newUsersWeek },
      { count: totalSubmissions },
      { count: gradedSubmissions },
      { count: failedSubmissions },
      { count: openSupport },
      { count: inProgressSupport },
      { count: resolvedSupport },
      { count: activeDiscounts },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabaseAdmin.from('submissions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'graded'),
      supabaseAdmin.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      supabaseAdmin.from('support_messages').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabaseAdmin.from('support_messages').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabaseAdmin.from('support_messages').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabaseAdmin.from('discount_codes').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    return res.json({
      users: { total: totalUsers || 0, new_this_week: newUsersWeek || 0 },
      submissions: {
        total: totalSubmissions || 0,
        graded: gradedSubmissions || 0,
        failed: failedSubmissions || 0,
        grading_rate: totalSubmissions ? Math.round(((gradedSubmissions || 0) / totalSubmissions) * 100) : 0,
      },
      support: {
        open: openSupport || 0,
        in_progress: inProgressSupport || 0,
        resolved: resolvedSupport || 0,
        total: (openSupport || 0) + (inProgressSupport || 0) + (resolvedSupport || 0),
      },
      discounts: { active: activeDiscounts || 0 },
    });
  } catch (err) {
    console.error('[admin/stats]', err.message);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// List all users — profiles joined with auth email
router.get('/users', async (req, res) => {
  const { page = 1, per_page = 50, search = '' } = req.query;
  const perPage = Math.min(parseInt(per_page), 100);

  try {
    // Build profile query — push name search to DB to avoid pulling all records
    let profileQuery = supabaseAdmin
      .from('profiles')
      .select('id, full_name, target_band, credits_remaining, is_admin, created_at')
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (search) {
      profileQuery = profileQuery.ilike('full_name', `%${search}%`);
    }

    const { data: profiles, error: profileError } = await profileQuery;
    if (profileError) throw profileError;

    const userIds = (profiles || []).map(p => p.id);

    // Single batch call for all emails — avoids N+1 per-user requests
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = {};
    (authData?.users || []).forEach(u => { emailMap[u.id] = u.email; });

    // Filter by email if search didn't match any names (best-effort email search)
    const emailMatches = search
      ? (authData?.users || [])
          .filter(u => u.email?.toLowerCase().includes(search.toLowerCase()))
          .map(u => u.id)
      : [];

    // Combine name-matched profiles with any email-only matches not already included
    const allIds = new Set(userIds);
    const extraEmailIds = emailMatches.filter(id => !allIds.has(id));

    let allProfiles = profiles || [];
    if (extraEmailIds.length > 0) {
      const { data: extraProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, target_band, credits_remaining, is_admin, created_at')
        .in('id', extraEmailIds);
      allProfiles = [...allProfiles, ...(extraProfiles || [])];
    }

    const allUserIds = allProfiles.map(p => p.id);

    // Get submission counts per user
    const { data: submissionCounts } = await supabaseAdmin
      .from('submissions')
      .select('user_id')
      .in('user_id', allUserIds);

    const submissionMap = {};
    (submissionCounts || []).forEach(s => {
      submissionMap[s.user_id] = (submissionMap[s.user_id] || 0) + 1;
    });

    const users = allProfiles.map(p => ({
      ...p,
      email: emailMap[p.id] || '—',
      submission_count: submissionMap[p.id] || 0,
    }));

    return res.json({ data: users, page: parseInt(page), per_page: perPage });
  } catch (err) {
    console.error('[admin/users]', err.message);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
});


// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [{ data: profile }, { data: authUser }, { data: submissions }] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', id).single(),
      supabaseAdmin.auth.admin.getUserById(id),
      supabaseAdmin
        .from('submissions')
        .select('id, exam_type, task_type, status, word_count, created_at, reports(overall_band)')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (!profile) return res.status(404).json({ error: 'User not found.' });

    return res.json({
      ...profile,
      email: authUser?.user?.email || '—',
      recent_submissions: (submissions || []).map(s => ({
        ...s,
        overall_band: Array.isArray(s.reports) ? s.reports[0]?.overall_band : s.reports?.overall_band,
        reports: undefined,
      })),
    });
  } catch (err) {
    console.error('[admin/users/:id]', err.message);
    return res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────
// Permanently removes the user from Supabase Auth (profile cascades via FK)
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (id === req.user.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;
    return res.json({ message: 'User deleted.' });
  } catch (err) {
    console.error('[admin/users/:id DELETE]', err.message);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// ─── PATCH /api/admin/users/:id ───────────────────────────────────────────────
// Update credits_remaining, target_band, or is_admin
router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { credits_remaining, target_band, is_admin } = req.body;

  const updates = {};
  if (credits_remaining !== undefined) {
    const c = parseInt(credits_remaining);
    if (isNaN(c) || c < 0) return res.status(400).json({ error: 'credits_remaining must be a non-negative integer.' });
    updates.credits_remaining = c;
  }
  if (target_band !== undefined) {
    const b = parseFloat(target_band);
    if (isNaN(b) || b < 1 || b > 9) return res.status(400).json({ error: 'target_band must be between 1.0 and 9.0.' });
    updates.target_band = Math.round(b * 2) / 2;
  }
  if (is_admin !== undefined) {
    if (typeof is_admin !== 'boolean') return res.status(400).json({ error: 'is_admin must be a boolean.' });
    // Prevent admin from revoking their own admin status
    if (id === req.user.userId && !is_admin) {
      return res.status(400).json({ error: 'You cannot revoke your own admin status.' });
    }
    updates.is_admin = is_admin;
  }
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length === 1) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[admin/users/:id PATCH]', err.message);
    return res.status(500).json({ error: 'Failed to update user.' });
  }
});

// ─── GET /api/admin/submissions ───────────────────────────────────────────────
// All submissions across all users (admin view)
router.get('/submissions', async (req, res) => {
  const { page = 1, per_page = 50, status } = req.query;
  const perPage = Math.min(parseInt(per_page), 100);

  try {
    let query = supabaseAdmin
      .from('submissions')
      .select('id, user_id, exam_type, task_type, word_count, status, created_at, reports(overall_band)')
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({
      data: (data || []).map(s => ({
        ...s,
        overall_band: Array.isArray(s.reports) ? s.reports[0]?.overall_band : s.reports?.overall_band,
        reports: undefined,
      })),
      page: parseInt(page),
      per_page: perPage,
    });
  } catch (err) {
    console.error('[admin/submissions]', err.message);
    return res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
});

// ─── GET /api/admin/support ───────────────────────────────────────────────────
router.get('/support', async (req, res) => {
  const { status, page = 1, per_page = 50 } = req.query;
  const perPage = Math.min(parseInt(per_page), 100);

  try {
    let query = supabaseAdmin
      .from('support_messages')
      .select('id, user_id, email, topic, message, status, admin_notes, created_at, resolved_at')
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (status && ['open', 'in_progress', 'resolved'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ data: data || [], page: parseInt(page), per_page: perPage });
  } catch (err) {
    console.error('[admin/support GET]', err.message);
    return res.status(500).json({ error: 'Failed to fetch support messages.' });
  }
});

// ─── PATCH /api/admin/support/:id ─────────────────────────────────────────────
router.patch('/support/:id', async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;

  const validStatuses = ['open', 'in_progress', 'resolved'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const updates = {};
  if (status)       updates.status = status;
  if (admin_notes !== undefined) updates.admin_notes = admin_notes;
  if (status === 'resolved') updates.resolved_at = new Date().toISOString();

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('support_messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[admin/support/:id PATCH]', err.message);
    return res.status(500).json({ error: 'Failed to update support message.' });
  }
});

// ─── GET /api/admin/discounts ─────────────────────────────────────────────────
router.get('/discounts', async (req, res) => {
  const { active } = req.query;

  try {
    let query = supabaseAdmin
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (active === 'true')  query = query.eq('is_active', true);
    if (active === 'false') query = query.eq('is_active', false);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ data: data || [] });
  } catch (err) {
    console.error('[admin/discounts GET]', err.message);
    return res.status(500).json({ error: 'Failed to fetch discount codes.' });
  }
});

// ─── POST /api/admin/discounts ────────────────────────────────────────────────
router.post('/discounts', async (req, res) => {
  const { code, description, discount_type, discount_value, max_uses, expires_at } = req.body;

  if (!code || !discount_type || discount_value === undefined) {
    return res.status(400).json({ error: 'code, discount_type, and discount_value are required.' });
  }
  if (!['percentage', 'fixed'].includes(discount_type)) {
    return res.status(400).json({ error: 'discount_type must be "percentage" or "fixed".' });
  }
  const val = parseFloat(discount_value);
  if (isNaN(val) || val <= 0) {
    return res.status(400).json({ error: 'discount_value must be a positive number.' });
  }
  if (discount_type === 'percentage' && val > 100) {
    return res.status(400).json({ error: 'Percentage discount cannot exceed 100.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('discount_codes')
      .insert({
        code: code.toUpperCase().trim(),
        description: description || null,
        discount_type,
        discount_value: val,
        max_uses: max_uses ? parseInt(max_uses) : null,
        expires_at: expires_at || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A discount code with that name already exists.' });
      }
      throw error;
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('[admin/discounts POST]', err.message);
    return res.status(500).json({ error: 'Failed to create discount code.' });
  }
});

// ─── PATCH /api/admin/discounts/:id ──────────────────────────────────────────
router.patch('/discounts/:id', async (req, res) => {
  const { id } = req.params;
  const { is_active, description, max_uses, expires_at } = req.body;

  const updates = {};
  if (is_active !== undefined)   updates.is_active = Boolean(is_active);
  if (description !== undefined) updates.description = description;
  if (max_uses !== undefined)    updates.max_uses = max_uses ? parseInt(max_uses) : null;
  if (expires_at !== undefined)  updates.expires_at = expires_at || null;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('discount_codes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[admin/discounts/:id PATCH]', err.message);
    return res.status(500).json({ error: 'Failed to update discount code.' });
  }
});

// ─── DELETE /api/admin/discounts/:id ─────────────────────────────────────────
router.delete('/discounts/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('discount_codes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.json({ message: 'Discount code deleted.' });
  } catch (err) {
    console.error('[admin/discounts/:id DELETE]', err.message);
    return res.status(500).json({ error: 'Failed to delete discount code.' });
  }
});

// ─── POST /api/admin/users/:id/credits ────────────────────────────────────────
// Quick credit top-up or deduction helper (separate from PATCH for clarity)
router.post('/users/:id/credits', async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body; // amount can be negative (deduction)

  if (amount === undefined || isNaN(parseInt(amount))) {
    return res.status(400).json({ error: 'amount is required and must be an integer.' });
  }

  try {
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('credits_remaining')
      .eq('id', id)
      .single();

    if (fetchError || !profile) return res.status(404).json({ error: 'User not found.' });

    const newBalance = Math.max(0, profile.credits_remaining + parseInt(amount));

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ credits_remaining: newBalance, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, full_name, credits_remaining')
      .single();

    if (error) throw error;

    console.log(`[admin] Credits adjusted for user=${id}: ${profile.credits_remaining} → ${newBalance} (${amount > 0 ? '+' : ''}${amount}) reason="${reason || 'manual'}"`);

    return res.json({
      user_id: id,
      previous_balance: profile.credits_remaining,
      new_balance: newBalance,
      adjustment: parseInt(amount),
    });
  } catch (err) {
    console.error('[admin/users/:id/credits]', err.message);
    return res.status(500).json({ error: 'Failed to adjust credits.' });
  }
});

// ─── GET /api/admin/tasks ──────────────────────────────────────────────────────
// Returns all tasks (active + inactive) with submission usage counts
router.get('/tasks', async (req, res) => {
  try {
    const { data: tasks, error } = await supabaseAdmin
      .from('exam_tasks')
      .select('id, exam_type, task_type, title, question_text, time_limit_seconds, is_active, created_at, updated_at')
      .order('exam_type')
      .order('task_type')
      .order('created_at');

    if (error) throw error;

    // Submission counts grouped by exam_type + task_type for analytics
    const { data: subs } = await supabaseAdmin
      .from('submissions')
      .select('exam_type, task_type');

    const countMap = {};
    (subs || []).forEach(s => {
      const k = `${s.exam_type}|${s.task_type}`;
      countMap[k] = (countMap[k] || 0) + 1;
    });

    return res.json({
      data: (tasks || []).map(t => ({
        ...t,
        usage_count: countMap[`${t.exam_type}|${t.task_type}`] || 0,
      })),
    });
  } catch (err) {
    console.error('[admin/tasks GET]', err.message);
    return res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// ─── POST /api/admin/tasks ─────────────────────────────────────────────────────
router.post('/tasks', async (req, res) => {
  const { exam_type, task_type, title, question_text, time_limit_seconds } = req.body;

  if (!exam_type || !task_type || !title || !question_text) {
    return res.status(400).json({ error: 'exam_type, task_type, title, and question_text are required.' });
  }
  if (!['Academic', 'General'].includes(exam_type)) {
    return res.status(400).json({ error: 'exam_type must be "Academic" or "General".' });
  }
  if (!['Task 1', 'Task 2'].includes(task_type)) {
    return res.status(400).json({ error: 'task_type must be "Task 1" or "Task 2".' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('exam_tasks')
      .insert({
        exam_type,
        task_type,
        title: title.trim(),
        question_text: question_text.trim(),
        time_limit_seconds: time_limit_seconds || (task_type === 'Task 1' ? 1200 : 2400),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error('[admin/tasks POST]', err.message);
    return res.status(500).json({ error: 'Failed to create task.' });
  }
});

// ─── PATCH /api/admin/tasks/:id ───────────────────────────────────────────────
// Saves previous version to task_history before updating
router.patch('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, question_text, time_limit_seconds, is_active } = req.body;

  try {
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('exam_tasks')
      .select('title, question_text')
      .eq('id', id)
      .single();

    if (fetchError || !current) return res.status(404).json({ error: 'Task not found.' });

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined)              updates.title = title.trim();
    if (question_text !== undefined)      updates.question_text = question_text.trim();
    if (time_limit_seconds !== undefined) updates.time_limit_seconds = time_limit_seconds;
    if (is_active !== undefined)          updates.is_active = Boolean(is_active);

    const { data, error } = await supabaseAdmin
      .from('exam_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Record history when question content changes
    const contentChanged =
      (title !== undefined && title.trim() !== current.title) ||
      (question_text !== undefined && question_text.trim() !== current.question_text);

    if (contentChanged) {
      await supabaseAdmin
        .from('task_history')
        .insert({
          task_id: id,
          changed_by: req.user.userId,
          previous_title: current.title,
          previous_question_text: current.question_text,
        })
        .catch(e => console.warn('[admin/tasks] History write failed:', e.message));
    }

    return res.json(data);
  } catch (err) {
    console.error('[admin/tasks/:id PATCH]', err.message);
    return res.status(500).json({ error: 'Failed to update task.' });
  }
});

// ─── DELETE /api/admin/tasks/:id ─────────────────────────────────────────────
// Soft-delete: sets is_active = false (preserves history)
router.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('exam_tasks')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return res.json({ message: 'Task deactivated.' });
  } catch (err) {
    console.error('[admin/tasks/:id DELETE]', err.message);
    return res.status(500).json({ error: 'Failed to deactivate task.' });
  }
});

// ─── GET /api/admin/tasks/:id/history ─────────────────────────────────────────
router.get('/tasks/:id/history', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('task_history')
      .select('id, previous_title, previous_question_text, change_note, created_at, changed_by')
      .eq('task_id', id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    return res.json({ data: data || [] });
  } catch (err) {
    console.error('[admin/tasks/:id/history]', err.message);
    return res.status(500).json({ error: 'Failed to fetch task history.' });
  }
});

// ─── GET /api/admin/payments ───────────────────────────────────────────────────
router.get('/payments', async (req, res) => {
  const { page = 1, per_page = 50 } = req.query;
  const perPage = Math.min(parseInt(per_page), 100);

  try {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('id, user_id, pack_name, credits_granted, amount_cents, status, created_at, completed_at, stripe_session_id')
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (error) throw error;
    return res.json({ data: data || [], page: parseInt(page), per_page: perPage });
  } catch (err) {
    console.error('[admin/payments]', err.message);
    return res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

module.exports = router;

// Bootstrap helper — mounted separately in index.js without admin middleware
const bootstrapRouter = express.Router();
bootstrapRouter.post('/bootstrap', async (req, res) => {
  const secret = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!secret || secret !== process.env.GRADING_SECRET) {
    return res.status(403).json({ error: 'Invalid bootstrap secret.' });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required.' });

  try {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const target = users?.users?.find(u => u.email === email);
    if (!target) return res.status(404).json({ error: 'No user found with that email.' });

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: true, updated_at: new Date().toISOString() })
      .eq('id', target.id)
      .select('id, full_name, is_admin')
      .single();

    if (error) throw error;
    return res.json({ message: `Admin granted to ${email}`, user: data });
  } catch (err) {
    console.error('[admin/bootstrap]', err.message);
    return res.status(500).json({ error: 'Bootstrap failed.' });
  }
});

module.exports.bootstrapRouter = bootstrapRouter;
