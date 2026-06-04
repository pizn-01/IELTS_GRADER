const express = require('express');
const { supabaseAdmin } = require('../services/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
// Optional query params: ?exam_type=Academic&task_type=Task+2
router.get('/', authenticateToken, async (req, res) => {
  const { exam_type, task_type } = req.query;

  let query = supabaseAdmin
    .from('exam_tasks')
    .select('id, exam_type, task_type, title, question_text, time_limit_seconds')
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

module.exports = router;
