/**
 * Personalized Learning PDFs are free for all users.
 * Generation still requires an explicit click to avoid unnecessary LLM cost.
 */
async function hasLearningFreeAccess(_userId) {
  return true;
}

module.exports = { hasLearningFreeAccess };
