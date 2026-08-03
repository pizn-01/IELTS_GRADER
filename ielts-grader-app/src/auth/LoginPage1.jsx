import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { Icons, formStyles, COLORS } from './Common.jsx';
import { useAuth } from '../context/AuthContext';
import { getRememberedEmail, setPostAuthRedirect } from '../utils/authStorage';
import { SUBSCRIPTION_PLANS, formatPromoPrice } from '../constants/subscriptionPlans';
import { CREDIT_PACKS } from '../constants/creditPacks';

/** Guest continuing grading/exam — prefer signup first. */
function isGuestContinueFlow(fromLocation) {
  if (!fromLocation?.pathname) return false;
  const path = fromLocation.pathname;
  return path === '/analysis-ready' || path.startsWith('/analysis-ready');
}

/** Pricing / upgrade checkout intent — prefer signup for new buyers. */
function isPricingCheckoutFlow(fromLocation) {
  if (!fromLocation?.pathname) return false;
  const path = fromLocation.pathname;
  return path === '/pricing' || path === '/upgrade' || path.startsWith('/pricing');
}

function prefersSignupFirst(fromLocation) {
  return isGuestContinueFlow(fromLocation) || isPricingCheckoutFlow(fromLocation);
}

/** True when auth was opened mid-purchase (resume to /upgrade?checkout=1). */
function isCheckoutIntentFlow(fromLocation) {
  if (!fromLocation?.pathname) return false;
  if (fromLocation.pathname !== '/upgrade' && fromLocation.pathname !== '/pricing') return false;
  const params = new URLSearchParams(fromLocation.search || '');
  return params.get('checkout') === '1';
}

function parseCheckoutIntent(fromLocation) {
  if (!isCheckoutIntentFlow(fromLocation)) return null;
  const params = new URLSearchParams(fromLocation.search || '');
  const pack = params.get('pack');
  const plan = params.get('plan');
  if (pack === 'starter' || pack === 'boost') {
    const packData = CREDIT_PACKS[pack];
    return {
      kind: 'pack',
      key: pack,
      name: packData.name,
      price: packData.price,
      detail: `${packData.credits} evaluations · one-time`,
      showPromo: false,
    };
  }
  const planKey = plan === 'weekly' ? 'weekly' : 'monthly';
  const planData = SUBSCRIPTION_PLANS[planKey];
  // Guests are almost always promo-eligible; show the intro price they clicked on /pricing.
  // Ineligible returning users are caught by UpgradePage before Stripe redirect.
  const pricing = formatPromoPrice(planData, { showPromo: true });
  return {
    kind: 'plan',
    key: planKey,
    name: planData.name,
    price: pricing.displayPrice,
    originalPrice: pricing.originalPrice,
    period: pricing.period,
    detail: `${planData.credits} evaluations · ${planKey === 'weekly' ? 'weekly' : 'monthly'}`,
    showPromo: pricing.showPromo,
  };
}

const LoginPage1 = () => {
  const { login, register, signInWithGoogle, rememberMePreference, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromLocation = location.state?.from;
  const from = fromLocation
    ? `${fromLocation.pathname}${fromLocation.search || ''}`
    : '/dashboard';
  const fromState = fromLocation?.state;
  const isGuestFlow = isGuestContinueFlow(fromLocation);
  const preferSignup = prefersSignupFirst(fromLocation);
  const checkoutIntent = useMemo(() => parseCheckoutIntent(fromLocation), [fromLocation]);
  const isCheckoutIntent = Boolean(checkoutIntent);

  const initialMode =
    location.state?.authMode === 'signup' || location.state?.authMode === 'login'
      ? location.state.authMode
      : preferSignup
        ? 'signup'
        : 'login';

  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState(() => getRememberedEmail());
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(rememberMePreference ?? true);
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Sync mode if navigated here with explicit authMode / guest from
  useEffect(() => {
    const next =
      location.state?.authMode === 'signup' || location.state?.authMode === 'login'
        ? location.state.authMode
        : prefersSignupFirst(location.state?.from)
          ? 'signup'
          : null;
    if (next) setMode(next);
  }, [location.state]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from, { replace: true, state: fromState });
    }
  }, [isAuthenticated, isLoading, navigate, from, fromState]);

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      if (from && from !== '/dashboard') setPostAuthRedirect(from);
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setIsSubmitting(true);
    try {
      await login({ email, password, rememberMe });
      navigate(from, { replace: true, state: fromState });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupChange = (e) => {
    setSignupData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isSignupValid = isCheckoutIntent
    ? Boolean(signupData.email && signupData.password && signupData.confirmPassword)
    : Object.values(signupData).every((val) => val.length > 0);

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!isSignupValid) return;
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const first = isCheckoutIntent ? '' : signupData.firstName;
      const last = isCheckoutIntent ? '' : signupData.lastName;
      const fullName = `${first} ${last}`.trim() || signupData.email.split('@')[0] || 'User';
      await register({
        first_name: first,
        last_name: last,
        full_name: fullName,
        email: signupData.email,
        password: signupData.password,
      });
      navigate(from || '/dashboard', { replace: true, state: fromState });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSignup = mode === 'signup';
  const title = isSignup
    ? isCheckoutIntent
      ? 'Create your account to complete checkout'
      : isGuestFlow
        ? 'Create your free account'
        : 'Create free account'
    : isCheckoutIntent
      ? 'Log in to complete checkout'
      : 'Welcome back';
  const subtitle = isSignup
    ? isCheckoutIntent
      ? 'Almost there — create a free account, then continue to secure payment.'
      : isGuestFlow
        ? 'Sign up to get your report: 2 free evaluations, no card required.'
        : 'Join IELTSGRADER and start improving in minutes.'
    : isCheckoutIntent
      ? 'Sign in to finish your purchase.'
      : isGuestFlow
        ? 'Log in to continue and get your report.'
        : 'Log in to access your account and manage everything in one place.';

  const signupCtaLabel = isSubmitting
    ? 'Creating account...'
    : isCheckoutIntent
      ? 'Continue to payment'
      : isGuestFlow
        ? 'Create account & continue'
        : 'Create free account';

  const loginCtaLabel = isSubmitting
    ? 'Signing in...'
    : isCheckoutIntent
      ? 'Continue to payment'
      : 'Sign In';

  const tabBtn = (id, label) => {
    const active = mode === id;
    return (
      <button
        type="button"
        onClick={() => switchMode(id)}
        style={{
          flex: 1,
          height: '44px',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 700,
          transition: 'all 0.2s ease',
          background: active ? '#fff' : 'transparent',
          color: active ? '#1a1f36' : '#6B7280',
          boxShadow: active ? '0 1px 3px rgba(26,31,54,0.08)' : 'none',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <AuthLayout noBox>
      <div className="animate-fadeIn">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#1a1f36',
              margin: '0 0 10px 0',
              letterSpacing: '-0.02em',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: 0, lineHeight: 1.5, fontWeight: 400 }}>
            {subtitle}
          </p>
        </div>

        {checkoutIntent && (
          <div
            style={{
              background: '#F0F9FF',
              border: '1.5px solid #B2DDFF',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              textAlign: 'left',
            }}
          >
            <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: '#175CD3', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Your order
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#101828' }}>
                  {checkoutIntent.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#667085' }}>
                  {checkoutIntent.detail}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {checkoutIntent.showPromo && checkoutIntent.originalPrice ? (
                  <>
                    <span style={{ fontSize: '13px', color: '#9CA3AF', textDecoration: 'line-through', marginRight: 6 }}>
                      {checkoutIntent.originalPrice}{checkoutIntent.period || ''}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>
                      {checkoutIntent.price}{checkoutIntent.period || ''}
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 600, color: '#059669' }}>
                      50% off first month
                    </p>
                  </>
                ) : (
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#101828' }}>
                    {checkoutIntent.price}
                    {checkoutIntent.period || (checkoutIntent.kind === 'pack' ? ' one-time' : '')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Log in / Sign up toggle */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            background: '#F3F4F6',
            borderRadius: '10px',
            marginBottom: '24px',
          }}
          role="tablist"
          aria-label="Account mode"
        >
          {tabBtn('login', 'Log in')}
          {tabBtn('signup', 'Sign up')}
        </div>

        {error && (
          <div
            style={{
              background: '#FFF5F5',
              border: '1.5px solid #FECACA',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#DC2626',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isSubmitting}
          className="btn-google"
          style={{
            width: '100%',
            height: '52px',
            backgroundColor: 'white',
            border: '1.5px solid #E5E7EB',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: isGoogleLoading ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            fontWeight: 600,
            color: '#374151',
            transition: 'all 0.2s ease',
            opacity: isGoogleLoading ? 0.7 : 1,
            marginBottom: '8px',
          }}
        >
          {Icons.google}
          {isGoogleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 24px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
          <span style={{ margin: '0 16px', fontSize: '13px', color: '#9CA3AF', fontWeight: 500 }}>
            or continue with email
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
        </div>

        {!isSignup ? (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={formStyles.label}>Email</label>
              <input
                type="email"
                name="email"
                autoComplete="username"
                placeholder="Enter Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
                onFocus={(e) => { e.target.style.borderColor = COLORS.blue; }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={formStyles.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
                  onFocus={(e) => { e.target.style.borderColor = COLORS.blue; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                    opacity: 0.6,
                  }}
                >
                  {showPassword ? Icons.eye : Icons.eyeOff}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <label
                htmlFor="remember-me"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#1a1f36',
                  fontWeight: 600,
                  userSelect: 'none',
                }}
              >
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    border: rememberMe ? `2px solid ${COLORS.blue}` : '2px solid #9CA3AF',
                    background: rememberMe ? COLORS.blue : '#FFFFFF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                    boxShadow: rememberMe ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
                  }}
                  aria-hidden
                >
                  {rememberMe && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 6.2L4.8 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0, margin: 0 }}
                />
                Remember me
              </label>
              <Link to="/forgot-password" style={{ fontSize: '14px', fontWeight: 700, color: COLORS.blue, textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              style={{
                ...(email && password && !isSubmitting ? formStyles.button.active : formStyles.button.disabled),
                height: '52px',
                fontSize: '15px',
                transition: 'all 0.3s ease',
                opacity: isSubmitting ? 0.75 : 1,
                cursor: isSubmitting ? 'not-allowed' : email && password ? 'pointer' : 'not-allowed',
              }}
              disabled={!email || !password || isSubmitting}
            >
              {loginCtaLabel}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignupSubmit}>
            {!isCheckoutIntent && (
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={formStyles.label}>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="Enter First Name"
                    value={signupData.firstName}
                    onChange={handleSignupChange}
                    style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = COLORS.blue; }}
                    onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={formStyles.label}>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Enter Last Name"
                    value={signupData.lastName}
                    onChange={handleSignupChange}
                    style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = COLORS.blue; }}
                    onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={formStyles.label}>Email</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Enter Email"
                value={signupData.email}
                onChange={handleSignupChange}
                style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
                onFocus={(e) => { e.target.style.borderColor = COLORS.blue; }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={formStyles.label}>Create Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  placeholder="Enter Password"
                  value={signupData.password}
                  onChange={handleSignupChange}
                  style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
                  onFocus={(e) => { e.target.style.borderColor = COLORS.blue; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                    opacity: 0.6,
                  }}
                >
                  {showPassword ? Icons.eye : Icons.eyeOff}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={formStyles.label}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Re-enter Password"
                  value={signupData.confirmPassword}
                  onChange={handleSignupChange}
                  style={{ ...formStyles.input, border: '1.5px solid #E5E7EB', transition: 'all 0.2s' }}
                  onFocus={(e) => { e.target.style.borderColor = COLORS.blue; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                    opacity: 0.6,
                  }}
                >
                  {showConfirmPassword ? Icons.eye : Icons.eyeOff}
                </button>
              </div>
            </div>

            <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px', lineHeight: '1.6' }}>
              By creating an account, you agree to our{' '}
              <Link to="/terms" style={{ color: COLORS.blue, textDecoration: 'none', fontWeight: 600 }}>
                Terms of Service
              </Link>
              {' and '}
              <Link to="/privacy" style={{ color: COLORS.blue, textDecoration: 'none', fontWeight: 600 }}>
                Privacy Policy
              </Link>
              .
            </div>

            <button
              type="submit"
              style={{
                ...(isSignupValid && !isSubmitting ? formStyles.button.active : formStyles.button.disabled),
                height: '52px',
                fontSize: '15px',
                transition: 'all 0.3s ease',
                opacity: isSubmitting ? 0.75 : 1,
                cursor: isSubmitting ? 'not-allowed' : isSignupValid ? 'pointer' : 'not-allowed',
              }}
              disabled={!isSignupValid || isSubmitting}
            >
              {signupCtaLabel}
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};

export default LoginPage1;
