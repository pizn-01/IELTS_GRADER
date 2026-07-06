import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { hasPreviewPendingEdition } from '../utils/learningPromoStorage';

export function useLearningNavBadge() {
  const { user } = useAuth();
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setShowBadge(false);
      return undefined;
    }
    let cancelled = false;
    api.getLearningStatus()
      .then((status) => {
        if (!cancelled) setShowBadge(hasPreviewPendingEdition(status));
      })
      .catch(() => {
        if (!cancelled) setShowBadge(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  return showBadge;
}
