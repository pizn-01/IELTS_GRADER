// Dispatches to either the JS grading engine (grader.js) or the client's
// Python grading engine (pythonGrader.js, backend/python/) based on the
// GRADING_ENGINE environment variable.
//
// Default is 'js' — the engine that has been live in production — so
// nothing changes in behavior until GRADING_ENGINE=python is explicitly
// set. Flip it back to 'js' at any time as an instant rollback if the
// Python engine ever needs to be taken out of service.
const engine = (process.env.GRADING_ENGINE || 'js').toLowerCase();

console.log(`[graderEngine] Active grading engine: ${engine}`);

module.exports = engine === 'python'
  ? require('./pythonGrader')
  : require('./grader');
