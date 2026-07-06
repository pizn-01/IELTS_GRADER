const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const {
  getGradedSubmissions,
  editionRange,
  buildPreviewStats,
  getOrCreateEditionRow,
  EXAMS_PER_EDITION,
  LEARNING_PRICE_CENTS,
} = require('../services/learningDossier');
const { generateEditionPdf } = require('../services/learningGenerator');

const router = express.Router();

let _stripe = null;
const getStripe = () => {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured.');
    _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://ielts-grader-akx4.vercel.app';

async function buildEditionStatus(userId, editionNumber, submissions) {
  const { start, end } = editionRange(editionNumber);
  const slice = submissions.slice(start - 1, end);
  const unlocked = slice.length >= EXAMS_PER_EDITION;
  const submissionIds = slice.map((s) => s.id);

  let row = null;
  if (unlocked) {
    row = await getOrCreateEditionRow(userId, editionNumber, submissionIds);
  }

  const preview = unlocked ? await buildPreviewStats(submissionIds) : null;

  return {
    editionNumber,
    examRange: { start, end },
    unlocked,
    examsInEdition: slice.length,
    examsNeeded: unlocked ? 0 : EXAMS_PER_EDITION - slice.length,
    status: row?.status || (unlocked ? 'preview' : 'locked'),
    paidAt: row?.paid_at || null,
    generatedAt: row?.generated_at || null,
    preview,
    priceCents: LEARNING_PRICE_CENTS,
  };
}

// ─── GET /api/learning/status ────────────────────────────────────────────────
router.get('/status', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const submissions = await getGradedSubmissions(userId);
    const totalGraded = submissions.length;
    const maxEdition = Math.floor(totalGraded / EXAMS_PER_EDITION);

    const editions = [];
    for (let n = 1; n <= Math.max(maxEdition, 1); n += 1) {
      editions.push(await buildEditionStatus(userId, n, submissions));
    }

    const nextEdition = maxEdition + 1;
    const progressToNext = totalGraded % EXAMS_PER_EDITION;

    return res.json({
      totalGraded,
      examsPerEdition: EXAMS_PER_EDITION,
      priceCents: LEARNING_PRICE_CENTS,
      maxUnlockedEdition: maxEdition,
      progressToNextEdition: {
        editionNumber: nextEdition,
        completed: progressToNext,
        required: EXAMS_PER_EDITION,
      },
      editions,
    });
  } catch (err) {
    console.error('[learning/status]', err.message);
    return res.status(500).json({ error: 'Failed to load learning status.' });
  }
});

// ─── POST /api/learning/checkout ─────────────────────────────────────────────
router.post('/checkout', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const editionNumber = parseInt(req.body.edition_number, 10);

  if (!editionNumber || editionNumber < 1) {
    return res.status(400).json({ error: 'Invalid edition number.' });
  }

  try {
    const submissions = await getGradedSubmissions(userId);
    const maxEdition = Math.floor(submissions.length / EXAMS_PER_EDITION);
    if (editionNumber > maxEdition) {
      return res.status(400).json({ error: 'Complete 5 more graded exams to unlock this edition.' });
    }

    const { start, end } = editionRange(editionNumber);
    const slice = submissions.slice(start - 1, end);
    const submissionIds = slice.map((s) => s.id);
    const row = await getOrCreateEditionRow(userId, editionNumber, submissionIds);

    if (row.status === 'ready') {
      return res.status(400).json({ error: 'This edition is already purchased and ready to download.' });
    }
    if (row.status === 'generating' || row.status === 'pending_payment') {
      return res.status(400).json({ error: 'This edition is already being processed.' });
    }

    const stripe = getStripe();
    const priceId = process.env.STRIPE_PRICE_LEARNING_MATERIAL;

    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [{
          price_data: {
            currency: 'usd',
            unit_amount: LEARNING_PRICE_CENTS,
            product_data: {
              name: `Personalized Learning — Edition ${editionNumber}`,
              description: `PDF study guide from exams ${start}–${end}`,
            },
          },
          quantity: 1,
        }];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      client_reference_id: userId,
      metadata: {
        type: 'learning_material',
        user_id: userId,
        edition_number: String(editionNumber),
      },
      success_url: `${FRONTEND_URL}/learning?edition=${editionNumber}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/learning?edition=${editionNumber}`,
    });

    await supabaseAdmin
      .from('personalized_learning_editions')
      .update({ status: 'pending_payment', stripe_session_id: session.id })
      .eq('id', row.id);

    return res.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('[learning/checkout]', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

// ─── GET /api/learning/download/:editionNumber ───────────────────────────────
router.get('/download/:editionNumber', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const editionNumber = parseInt(req.params.editionNumber, 10);

  try {
    const { data: row } = await supabaseAdmin
      .from('personalized_learning_editions')
      .select('status, pdf_storage_path')
      .eq('user_id', userId)
      .eq('edition_number', editionNumber)
      .single();

    if (!row || row.status !== 'ready' || !row.pdf_storage_path) {
      return res.status(404).json({ error: 'PDF not available yet.' });
    }

    const { data: signed, error } = await supabaseAdmin.storage
      .from('learning-materials')
      .createSignedUrl(row.pdf_storage_path, 3600);

    if (error || !signed?.signedUrl) {
      return res.status(500).json({ error: 'Failed to create download link.' });
    }

    return res.json({ url: signed.signedUrl, expires_in: 3600 });
  } catch (err) {
    console.error('[learning/download]', err.message);
    return res.status(500).json({ error: 'Download failed.' });
  }
});

// ─── POST /api/learning/retry/:editionNumber (admin-style self-retry) ────────
router.post('/retry/:editionNumber', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const editionNumber = parseInt(req.params.editionNumber, 10);

  try {
    const { data: row } = await supabaseAdmin
      .from('personalized_learning_editions')
      .select('status, paid_at')
      .eq('user_id', userId)
      .eq('edition_number', editionNumber)
      .single();

    if (!row || !row.paid_at) {
      return res.status(400).json({ error: 'Edition must be paid before regeneration.' });
    }
    if (row.status === 'generating') {
      return res.status(400).json({ error: 'Generation already in progress.' });
    }

    generateEditionPdf(userId, editionNumber).catch((err) => {
      console.error('[learning/retry] background failed:', err.message);
    });

    return res.json({ status: 'generating' });
  } catch (err) {
    console.error('[learning/retry]', err.message);
    return res.status(500).json({ error: 'Retry failed.' });
  }
});

module.exports = router;
module.exports.generateEditionPdf = generateEditionPdf;
