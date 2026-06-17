const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
// Returns all active tasks (used by practice upload flow)
router.get('/', authenticateToken, async (req, res) => {
  const { exam_type, task_type } = req.query;

  let query = supabaseAdmin
    .from('exam_tasks')
    .select('id, exam_type, task_type, title, question_text, time_limit_seconds')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(200);

  if (exam_type) query = query.eq('exam_type', exam_type);
  if (task_type) query = query.eq('task_type', task_type);

  const { data, error } = await query;

  if (error) {
    console.error('[tasks/list]', error.message);
    return res.status(500).json({ error: 'Failed to fetch exam tasks.' });
  }

  return res.json({ data: data || [] });
});

// ─── GET /api/tasks/next ──────────────────────────────────────────────────────
// Returns one task the user hasn't been assigned yet (or the least-recently
// assigned one if all have been seen). Records the assignment.
// ?exam_type=Academic&task_type=Task+2&session_type=mock
router.get('/next', authenticateToken, async (req, res) => {
  const { exam_type = 'Academic', task_type = 'Task 2', session_type = 'mock' } = req.query;
  const userId = req.user.userId;

  try {
    // 1. All active tasks for this exam/type
    const { data: allTasks, error: tasksErr } = await supabaseAdmin
      .from('exam_tasks')
      .select('id, exam_type, task_type, title, question_text, time_limit_seconds')
      .eq('is_active', true)
      .eq('exam_type', exam_type)
      .eq('task_type', task_type);

    if (tasksErr) throw tasksErr;
    if (!allTasks || allTasks.length === 0) {
      return res.status(404).json({ error: 'No active tasks found for this exam type.' });
    }

    // 2. Tasks already assigned to this user for the same exam/type
    const taskIds = allTasks.map(t => t.id);
    const { data: assignments } = await supabaseAdmin
      .from('user_question_assignments')
      .select('task_id, assigned_at')
      .eq('user_id', userId)
      .in('task_id', taskIds)
      .order('assigned_at', { ascending: false });

    const assignedIds = new Set((assignments || []).map(a => a.task_id));

    // 3. Pick from unseen tasks first; fall back to least-recently assigned
    let candidate;
    const unseen = allTasks.filter(t => !assignedIds.has(t.id));

    if (unseen.length > 0) {
      candidate = unseen[Math.floor(Math.random() * unseen.length)];
    } else {
      // All seen — pick the one assigned longest ago
      const lastAssignedId = assignments?.[assignments.length - 1]?.task_id;
      candidate = allTasks.find(t => t.id === lastAssignedId) || allTasks[0];
    }

    // 4. Record the assignment
    await supabaseAdmin
      .from('user_question_assignments')
      .insert({ user_id: userId, task_id: candidate.id, session_type })
      .catch(err => console.warn('[tasks/next] Assignment insert failed:', err.message));

    return res.json({ data: candidate });
  } catch (err) {
    console.error('[tasks/next]', err.message);
    return res.status(500).json({ error: 'Failed to fetch next task.' });
  }
});

module.exports = router;
