// Task 1 (General) = letter, Task 1 (Academic) = report, Task 2 = essay
function resolveTaskVariant(exam_type, task_type) {
  if (task_type === 'Task 1') {
    return exam_type === 'General' ? 'task1-letter' : 'task1-report';
  }
  return 'task2';
}

module.exports = { resolveTaskVariant };
