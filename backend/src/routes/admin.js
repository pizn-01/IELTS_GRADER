const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const {
  inferExamTaskType,
  normalizeCreatePayload,
  normalizeBankItem,
  SUMMARY_COMBOS,
} = require('../utils/taskBankFormat');
const {
  parseDays,
  sinceIso,
  computeOverview,
  computeTimeseries,
  computeByChannel,
  computeByCountry,
  computeByLanding,
  computeByHour,
} = require('../utils/acquisitionAnalytics');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const router = express.Router();

/** Supabase/PostgREST caps at 1000 rows per request — paginate to fetch all. */
async function fetchAllRows(buildQuery, pageSize = 1000) {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

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
  const { page = 1, per_page = 50, search = '', channel = '' } = req.query;
  const perPage = Math.min(parseInt(per_page), 100);

  try {
    // Build profile query — push name search to DB to avoid pulling all records
    let profileQuery = supabaseAdmin
      .from('profiles')
      .select('id, full_name, target_band, credits_remaining, is_admin, created_at, acquisition_channel, landing_path, acquisition_country, utm_campaign')
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (search) {
      profileQuery = profileQuery.ilike('full_name', `%${search}%`);
    }

    if (channel) {
      profileQuery = profileQuery.eq('acquisition_channel', channel);
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
        .select('id, full_name, target_band, credits_remaining, is_admin, created_at, acquisition_channel, landing_path, acquisition_country, utm_campaign')
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
// Paginated task list with per-task usage + avg score; includes summary cards
router.get('/tasks', async (req, res) => {
  try {
    const {
      page = 1,
      per_page = 50,
      exam_type,
      task_type,
      status = 'all',
      sort = 'created_at',
      order = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.min(Math.max(1, parseInt(per_page, 10) || 50), 100);
    const sortKey = ['created_at', 'usage', 'avg_score', 'skips'].includes(sort) ? sort : 'created_at';
    const sortAsc = order === 'asc';

    // Summary: exact counts (avoid 1000-row PostgREST cap on full-table scans)
    const summary = {};
    await Promise.all(SUMMARY_COMBOS.map(async (combo) => {
      const base = () => supabaseAdmin
        .from('exam_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('exam_type', combo.exam_type)
        .eq('task_type', combo.task_type);

      const [{ count: total }, { count: active }, { count: submissions }] = await Promise.all([
        base(),
        supabaseAdmin
          .from('exam_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('exam_type', combo.exam_type)
          .eq('task_type', combo.task_type)
          .eq('is_active', true),
        supabaseAdmin
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .eq('exam_type', combo.exam_type)
          .eq('task_type', combo.task_type),
      ]);

      summary[combo.key] = {
        active: active ?? 0,
        total: total ?? 0,
        submissions: submissions ?? 0,
      };
    }));

    // Per-task usage + avg score (paginate submissions — may exceed 1000)
    const subsWithReports = await fetchAllRows(() =>
      supabaseAdmin
        .from('submissions')
        .select('exam_task_id, status, reports(overall_band)')
        .not('exam_task_id', 'is', null)
    );

    const usageMap = {};
    const scoreAcc = {};
    (subsWithReports || []).forEach(s => {
      const id = s.exam_task_id;
      usageMap[id] = (usageMap[id] || 0) + 1;
      const report = Array.isArray(s.reports) ? s.reports[0] : s.reports;
      const band = report?.overall_band;
      if (s.status === 'graded' && band != null && !Number.isNaN(Number(band))) {
        if (!scoreAcc[id]) scoreAcc[id] = { sum: 0, count: 0 };
        scoreAcc[id].sum += Number(band);
        scoreAcc[id].count += 1;
      }
    });

    const avgMap = {};
    Object.entries(scoreAcc).forEach(([id, { sum, count }]) => {
      avgMap[id] = Math.round((sum / count) * 10) / 10;
    });

    // Skips = explicit skip events (refresh / "New question" with exclude_task_id)
    const skipRows = await fetchAllRows(() =>
      supabaseAdmin
        .from('user_question_assignments')
        .select('task_id')
        .eq('session_type', 'skipped')
        .not('task_id', 'is', null)
    );

    const skipMap = {};
    (skipRows || []).forEach(row => {
      skipMap[row.task_id] = (skipMap[row.task_id] || 0) + 1;
    });

    // Filtered task rows (paginate — question bank has 1000+ rows)
    const tasks = await fetchAllRows(() => {
      let q = supabaseAdmin
        .from('exam_tasks')
        .select('id, exam_type, task_type, title, question_text, time_limit_seconds, is_active, created_at, updated_at, chart_svg, chart_image');
      if (exam_type) q = q.eq('exam_type', exam_type);
      if (task_type) q = q.eq('task_type', task_type);
      if (status === 'active') q = q.eq('is_active', true);
      if (status === 'inactive') q = q.eq('is_active', false);
      return q;
    });

    let rows = (tasks || []).map(t => ({
      ...t,
      chart_image: undefined,
      has_chart_image: Boolean(t.chart_image),
      usage_count: usageMap[t.id] || 0,
      skip_count: skipMap[t.id] || 0,
      avg_score: avgMap[t.id] ?? null,
    }));

    rows.sort((a, b) => {
      let av;
      let bv;
      if (sortKey === 'usage') {
        av = a.usage_count;
        bv = b.usage_count;
      } else if (sortKey === 'skips') {
        av = a.skip_count;
        bv = b.skip_count;
      } else if (sortKey === 'avg_score') {
        av = a.avg_score ?? -1;
        bv = b.avg_score ?? -1;
      } else {
        av = new Date(a.created_at).getTime();
        bv = new Date(b.created_at).getTime();
      }
      if (av === bv) return 0;
      return sortAsc ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
    });

    const total = rows.length;
    const start = (pageNum - 1) * perPage;
    const data = rows.slice(start, start + perPage);

    return res.json({
      summary,
      data,
      total,
      page: pageNum,
      per_page: perPage,
    });
  } catch (err) {
    console.error('[admin/tasks GET]', err.message);
    return res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// ─── POST /api/admin/tasks ─────────────────────────────────────────────────────
router.post('/tasks', async (req, res) => {
  try {
    const row = normalizeCreatePayload(req.body);

    const { data, error } = await supabaseAdmin
      .from('exam_tasks')
      .insert({
        exam_type: row.exam_type,
        task_type: row.task_type,
        title: row.title,
        question_text: row.question_text,
        chart_svg: row.chart_svg || null,
        chart_image: row.chart_image || null,
        time_limit_seconds: row.time_limit_seconds,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error('[admin/tasks POST]', err.message);
    const msg = err.message || 'Failed to create task.';
    return res.status(err.message?.includes('required') ? 400 : 500).json({ error: msg });
  }
});

// ─── GET /api/admin/tasks/:id ────────────────────────────────────────────────
router.get('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('exam_tasks')
      .select('id, exam_type, task_type, title, question_text, chart_svg, chart_image, time_limit_seconds, is_active, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Task not found.' });
    return res.json(data);
  } catch (err) {
    console.error('[admin/tasks/:id GET]', err.message);
    return res.status(500).json({ error: 'Failed to fetch task.' });
  }
});

// ─── PATCH /api/admin/tasks/:id ───────────────────────────────────────────────
// Saves previous version to task_history before updating
router.patch('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { question_text, is_active, chart_svg, chart_image, prompt, bullet_points, letter_type, topic, type: task2Type } = req.body;

  try {
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('exam_tasks')
      .select('title, question_text, exam_type, task_type, chart_svg, chart_image')
      .eq('id', id)
      .single();

    if (fetchError || !current) return res.status(404).json({ error: 'Task not found.' });

    const updates = { updated_at: new Date().toISOString() };
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const contentFieldsProvided =
      question_text !== undefined ||
      prompt !== undefined ||
      chart_svg !== undefined ||
      chart_image !== undefined ||
      bullet_points !== undefined ||
      letter_type !== undefined ||
      topic !== undefined ||
      task2Type !== undefined;

    if (contentFieldsProvided) {
      const normalized = normalizeCreatePayload({
        exam_type: current.exam_type,
        task_type: current.task_type,
        question_text: question_text ?? current.question_text,
        prompt: prompt ?? question_text ?? current.question_text,
        chart_svg: chart_svg !== undefined ? chart_svg : current.chart_svg,
        chart_image: chart_image !== undefined ? chart_image : current.chart_image,
        bullet_points,
        letter_type,
        topic,
        type: task2Type,
        chart_type: req.body.chart_type,
        chart_source: req.body.chart_source,
      });
      updates.title = normalized.title;
      updates.question_text = normalized.question_text;
      if (normalized.chart_svg !== undefined) {
        updates.chart_svg = normalized.chart_svg;
      }
      if (normalized.chart_image !== undefined) {
        updates.chart_image = normalized.chart_image;
      }
      updates.time_limit_seconds = normalized.time_limit_seconds;
    }

    const { data, error } = await supabaseAdmin
      .from('exam_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const contentChanged =
      contentFieldsProvided &&
      (updates.title !== current.title || updates.question_text !== current.question_text);

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
// ?permanent=true — hard delete. Deactivate via PATCH is_active instead.
router.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const permanent = req.query.permanent === 'true';

  if (!permanent) {
    return res.status(400).json({
      error: 'Use ?permanent=true to permanently delete. Deactivate via PATCH is_active instead.',
    });
  }

  try {
    const { count, error: countErr } = await supabaseAdmin
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('exam_task_id', id);

    if (countErr) throw countErr;

    const { error } = await supabaseAdmin
      .from('exam_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.json({
      message: 'Task permanently deleted.',
      usage_count: count || 0,
    });
  } catch (err) {
    console.error('[admin/tasks/:id DELETE]', err.message);
    return res.status(500).json({ error: 'Failed to delete task.' });
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

// ─── POST /api/admin/tasks/import ─────────────────────────────────────────────
// Bulk import questions from a JSON or PDF file.
// Form fields: file (required), exam_type (required for non-internal format), task_type (required)
// JSON formats supported:
//   Internal: [{ exam_type, task_type, title, question_text, time_limit_seconds? }]
//   GitHub task2: [{ id, topic, type, question }]
//   GitHub task1 letter: [{ "exam-name", id, "letter-type", prompt, "bullet-points" }]
//   GitHub task1 report: [{ "exam-name", "chart-type", prompt }]
router.post('/tasks/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'A file is required.' });
  }

  const { exam_type, task_type } = req.body;
  const mime = req.file.mimetype;
  const ext = req.file.originalname.split('.').pop().toLowerCase();

  let rawItems = [];

  try {
    // ── Parse file ────────────────────────────────────────────────────────────
    if (ext === 'json' || mime === 'application/json') {
      try {
        rawItems = JSON.parse(req.file.buffer.toString('utf-8'));
        if (!Array.isArray(rawItems)) rawItems = [rawItems];
      } catch {
        return res.status(400).json({ error: 'Invalid JSON file.' });
      }
    } else if (ext === 'pdf' || mime === 'application/pdf') {
      let pdfText = '';
      try {
        const parsed = await pdfParse(req.file.buffer);
        pdfText = parsed.text || '';
      } catch (e) {
        return res.status(400).json({ error: 'Could not parse PDF. Ensure the file is a text-based PDF.' });
      }

      if (!exam_type || !task_type) {
        return res.status(400).json({ error: 'exam_type and task_type are required when importing from PDF.' });
      }

      // Split on lines that start a new numbered question
      const parts = pdfText.split(/(?=\n\s*(?:Q(?:uestion)?\s*)?\d+[\.\)]\s)/);

      rawItems = parts
        .map(p => p.trim())
        .filter(p => p.length > 40)
        .map((p, i) => ({
          exam_type,
          task_type,
          title: `Imported question ${i + 1}`,
          question_text: p.replace(/^\d+[\.\)]\s*/, '').trim(),
        }));
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Upload a .json or .pdf file.' });
    }

    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'No questions found in the file.' });
    }

    // Load existing titles for duplicate detection within this import batch + DB
    const { data: existingTasks } = await supabaseAdmin
      .from('exam_tasks')
      .select('exam_type, task_type, title');

    const existingTitleKeys = new Set(
      (existingTasks || []).map(t => `${t.exam_type}|${t.task_type}|${t.title}`)
    );
    const seenTitles = new Set();

    const toInsert = [];
    const errors = [];
    let skipped = 0;

    const importExamType = exam_type || inferExamTaskType(rawItems[0]).exam_type;

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const { row, error: normErr } = normalizeBankItem(item, {
        exam_type: importExamType,
        seenTitles,
      });

      if (normErr || !row) {
        errors.push(`Row ${i + 1}: ${normErr || 'skipped'}.`);
        continue;
      }

      const titleKey = `${row.exam_type}|${row.task_type}|${row.title}`;
      if (existingTitleKeys.has(titleKey)) {
        skipped += 1;
        continue;
      }

      existingTitleKeys.add(titleKey);
      toInsert.push(row);
    }

    if (toInsert.length === 0) {
      return res.status(400).json({
        error: skipped > 0
          ? 'All questions already exist in the database (duplicates skipped).'
          : 'No valid questions could be parsed.',
        skipped,
        details: errors.slice(0, 10),
      });
    }

    // ── Batch insert (chunks of 100 to stay under Supabase limits) ────────────
    let imported = 0;
    const chunkSize = 100;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const { error: insertErr } = await supabaseAdmin.from('exam_tasks').insert(chunk);
      if (insertErr) {
        console.error('[admin/tasks/import] Insert error:', insertErr.message);
        return res.status(500).json({ error: 'Database insert failed.', detail: insertErr.message });
      }
      imported += chunk.length;
    }

    return res.status(201).json({
      imported,
      skipped: skipped + errors.length,
      errors: errors.slice(0, 20),
      message: `Successfully imported ${imported} question${imported !== 1 ? 's' : ''}${skipped ? ` (${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped)` : ''}.`,
    });
  } catch (err) {
    console.error('[admin/tasks/import]', err.message);
    return res.status(500).json({ error: 'Import failed. Please try again.' });
  }
});

// ─── GET /api/admin/task-assignments ──────────────────────────────────────────
// Shows which question was assigned to which user (for the admin log)
router.get('/task-assignments', async (req, res) => {
  const { page = 1, per_page = 50, user_id, task_id } = req.query;
  const perPage = Math.min(parseInt(per_page), 100);

  try {
    let query = supabaseAdmin
      .from('user_question_assignments')
      .select('id, user_id, task_id, session_type, assigned_at')
      .order('assigned_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (user_id) query = query.eq('user_id', user_id);
    if (task_id) query = query.eq('task_id', task_id);

    const { data: assignments, error } = await query;
    if (error) throw error;

    if (!assignments || assignments.length === 0) {
      return res.json({ data: [], page: parseInt(page), per_page: perPage });
    }

    // Enrich with task titles and user emails in parallel
    const uniqueTaskIds = [...new Set(assignments.map(a => a.task_id).filter(Boolean))];
    const uniqueUserIds = [...new Set(assignments.map(a => a.user_id))];

    const [{ data: tasks }, { data: profiles }, authData] = await Promise.all([
      uniqueTaskIds.length
        ? supabaseAdmin.from('exam_tasks').select('id, title, exam_type, task_type').in('id', uniqueTaskIds)
        : Promise.resolve({ data: [] }),
      supabaseAdmin.from('profiles').select('id, full_name').in('id', uniqueUserIds),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    const taskMap = {};
    (tasks || []).forEach(t => { taskMap[t.id] = t; });

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p.full_name; });

    const emailMap = {};
    (authData?.data?.users || []).forEach(u => { emailMap[u.id] = u.email; });

    const enriched = assignments.map(a => ({
      ...a,
      user_name: profileMap[a.user_id] || '—',
      user_email: emailMap[a.user_id] || '—',
      task_title: taskMap[a.task_id]?.title || '—',
      task_exam_type: taskMap[a.task_id]?.exam_type || '—',
      task_task_type: taskMap[a.task_id]?.task_type || '—',
    }));

    return res.json({ data: enriched, page: parseInt(page), per_page: perPage });
  } catch (err) {
    console.error('[admin/task-assignments]', err.message);
    return res.status(500).json({ error: 'Failed to fetch task assignments.' });
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

// ─── Acquisition analytics helpers ─────────────────────────────────────────────
async function fetchSessionsSince(since) {
  return fetchAllRows(() =>
    supabaseAdmin
      .from('visitor_sessions')
      .select('session_id, channel, country, landing_path, page_view_count, duration_seconds, is_bounce, converted_user_id, first_seen_at')
      .gte('first_seen_at', since)
      .order('first_seen_at', { ascending: false })
  );
}

async function fetchPageViewsSince(since) {
  return fetchAllRows(() =>
    supabaseAdmin
      .from('page_views')
      .select('id, session_id, path, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
  );
}

async function fetchSignupsSince(since) {
  return fetchAllRows(() =>
    supabaseAdmin
      .from('profiles')
      .select('id, created_at, acquisition_channel')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
  );
}

// ─── GET /api/admin/acquisition/overview ───────────────────────────────────────
router.get('/acquisition/overview', async (req, res) => {
  const days = parseDays(req.query.days);
  const since = sinceIso(days);

  try {
    const [sessions, pageViews, signups] = await Promise.all([
      fetchSessionsSince(since),
      fetchPageViewsSince(since),
      fetchSignupsSince(since),
    ]);

    return res.json(computeOverview(sessions, pageViews, signups));
  } catch (err) {
    console.error('[admin/acquisition/overview]', err.message);
    return res.status(500).json({ error: 'Failed to fetch acquisition overview.' });
  }
});

// ─── GET /api/admin/acquisition/timeseries ─────────────────────────────────────
router.get('/acquisition/timeseries', async (req, res) => {
  const days = parseDays(req.query.days);
  const since = sinceIso(days);
  const granularity = req.query.granularity === 'hour' ? 'hour' : 'day';

  try {
    const [sessions, signups] = await Promise.all([
      fetchSessionsSince(since),
      fetchSignupsSince(since),
    ]);

    return res.json({ data: computeTimeseries(sessions, signups, granularity, days) });
  } catch (err) {
    console.error('[admin/acquisition/timeseries]', err.message);
    return res.status(500).json({ error: 'Failed to fetch acquisition timeseries.' });
  }
});

// ─── GET /api/admin/acquisition/by-channel ─────────────────────────────────────
router.get('/acquisition/by-channel', async (req, res) => {
  const days = parseDays(req.query.days);
  const since = sinceIso(days);

  try {
    const sessions = await fetchSessionsSince(since);
    return res.json({ data: computeByChannel(sessions) });
  } catch (err) {
    console.error('[admin/acquisition/by-channel]', err.message);
    return res.status(500).json({ error: 'Failed to fetch channel breakdown.' });
  }
});

// ─── GET /api/admin/acquisition/by-country ─────────────────────────────────────
router.get('/acquisition/by-country', async (req, res) => {
  const days = parseDays(req.query.days);
  const since = sinceIso(days);

  try {
    const sessions = await fetchSessionsSince(since);
    return res.json({ data: computeByCountry(sessions).slice(0, 20) });
  } catch (err) {
    console.error('[admin/acquisition/by-country]', err.message);
    return res.status(500).json({ error: 'Failed to fetch country breakdown.' });
  }
});

// ─── GET /api/admin/acquisition/by-landing ─────────────────────────────────────
router.get('/acquisition/by-landing', async (req, res) => {
  const days = parseDays(req.query.days);
  const since = sinceIso(days);

  try {
    const sessions = await fetchSessionsSince(since);
    return res.json({ data: computeByLanding(sessions).slice(0, 20) });
  } catch (err) {
    console.error('[admin/acquisition/by-landing]', err.message);
    return res.status(500).json({ error: 'Failed to fetch landing page breakdown.' });
  }
});

// ─── GET /api/admin/acquisition/by-hour ────────────────────────────────────────
router.get('/acquisition/by-hour', async (req, res) => {
  const days = parseDays(req.query.days);
  const since = sinceIso(days);

  try {
    const sessions = await fetchSessionsSince(since);
    return res.json({ data: computeByHour(sessions) });
  } catch (err) {
    console.error('[admin/acquisition/by-hour]', err.message);
    return res.status(500).json({ error: 'Failed to fetch hourly breakdown.' });
  }
});

// ─── GET /api/admin/acquisition/visitors ─────────────────────────────────────
router.get('/acquisition/visitors', async (req, res) => {
  const days = parseDays(req.query.days);
  const since = sinceIso(days);
  const { page = 1, per_page = 50, channel = '', converted = 'false' } = req.query;
  const perPage = Math.min(parseInt(per_page), 100);
  const showConverted = converted === 'true';

  try {
    let query = supabaseAdmin
      .from('visitor_sessions')
      .select('session_id, channel, landing_path, referrer, utm_source, utm_medium, country, page_view_count, duration_seconds, device_type, browser, os, is_bounce, converted_user_id, first_seen_at, last_seen_at', { count: 'exact' })
      .gte('first_seen_at', since)
      .order('first_seen_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (channel) query = query.eq('channel', channel);

    if (showConverted) {
      query = query.not('converted_user_id', 'is', null);
    } else {
      query = query.is('converted_user_id', null);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      data: data || [],
      page: parseInt(page),
      per_page: perPage,
      total: count || 0,
    });
  } catch (err) {
    console.error('[admin/acquisition/visitors]', err.message);
    return res.status(500).json({ error: 'Failed to fetch visitors.' });
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
