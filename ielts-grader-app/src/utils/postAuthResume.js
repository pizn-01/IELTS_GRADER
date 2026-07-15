/**
 * Resolve where to send a user after signup/login from the free-report funnel.
 */
export function resolvePostAuthNavigation({
  user,
  fromLocation,
  essayContent = '',
  pendingSubmit = false,
  pendingUploadGrade = false,
  submissionId = null,
} = {}) {
  const credits = user?.credits_remaining ?? 0;
  if (credits <= 0) {
    return {
      pathname: '/analysis-ready',
      state: { outOfCredits: true },
    };
  }

  const fromPath = fromLocation?.pathname || '';

  if (pendingSubmit || fromPath === '/mock-exam') {
    return {
      pathname: '/mock-exam',
      state: fromLocation?.state || undefined,
    };
  }

  if (
    pendingUploadGrade
    || fromPath === '/analysis-ready'
    || (essayContent && fromPath)
  ) {
    if (!essayContent && !submissionId) {
      return {
        pathname: '/',
        state: { resumeError: 'Paste your essay again to continue your free report.' },
      };
    }
    return {
      pathname: '/analysis-ready',
      state: fromLocation?.state || undefined,
    };
  }

  if (fromPath) {
    return {
      pathname: `${fromPath}${fromLocation.search || ''}`,
      state: fromLocation.state,
    };
  }

  return { pathname: '/dashboard' };
}

export function fromLocationToPath(fromLocation) {
  if (!fromLocation?.pathname) return null;
  return `${fromLocation.pathname}${fromLocation.search || ''}`;
}
