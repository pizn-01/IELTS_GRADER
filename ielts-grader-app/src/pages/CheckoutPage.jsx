import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Legacy route — guests → public Pricing; signed-in → in-app Upgrade shop. */
const CheckoutPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    navigate(
      isAuthenticated ? '/upgrade?plan=monthly&from=upgrade' : '/pricing',
      { replace: true },
    );
  }, [navigate, isAuthenticated, isLoading]);

  return null;
};

export default CheckoutPage;
