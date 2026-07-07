import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** Legacy route — redirects to subscription upgrade page. */
const CheckoutPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/upgrade', { replace: true });
  }, [navigate]);

  return null;
};

export default CheckoutPage;
