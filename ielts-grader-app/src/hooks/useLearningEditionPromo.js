import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  findUnseenUnlockedEdition,
  markEditionSeen,
} from '../utils/learningPromoStorage';

export function useLearningEditionPromo() {
  const { user } = useAuth();
  const [learningStatus, setLearningStatus] = useState(null);
  const [modalEdition, setModalEdition] = useState(null);

  const refreshLearningStatus = useCallback(async () => {
    if (!user?.id) return null;
    try {
      const status = await api.getLearningStatus();
      setLearningStatus(status);
      const unseen = findUnseenUnlockedEdition(status, user.id);
      if (unseen) setModalEdition(unseen);
      return status;
    } catch {
      return null;
    }
  }, [user?.id]);

  useEffect(() => {
    refreshLearningStatus();
  }, [refreshLearningStatus]);

  const dismissModal = useCallback(() => {
    if (modalEdition && user?.id) {
      markEditionSeen(user.id, modalEdition.editionNumber);
    }
    setModalEdition(null);
  }, [modalEdition, user?.id]);

  const goToLearning = useCallback(() => {
    if (modalEdition && user?.id) {
      markEditionSeen(user.id, modalEdition.editionNumber);
    }
    setModalEdition(null);
    return modalEdition?.editionNumber;
  }, [modalEdition, user?.id]);

  return {
    learningStatus,
    modalEdition,
    refreshLearningStatus,
    dismissModal,
    goToLearning,
    showModal: Boolean(modalEdition),
  };
}
