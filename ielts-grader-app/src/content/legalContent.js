export const legalPages = {
  terms: {
    title: 'Terms of Service | IELTS AI Tutor',
    description: 'Terms of Service for IELTS AI Tutor by IELTSGRADER.',
    heading: 'Terms of Service',
    draft: true,
    sections: [
      {
        heading: 'Agreement',
        body: 'By using IELTS AI Tutor by IELTSGRADER at ieltsgrader.com, you agree to these Terms. The Service is an educational aid and is not affiliated with IELTS, British Council, IDP, or Cambridge Assessment English.',
      },
      {
        heading: 'Service',
        body: 'We provide AI-assisted IELTS writing evaluation, feedback, and study planning. Feedback is aligned with public band descriptors but does not guarantee any official test score.',
      },
      {
        heading: 'Accounts & payments',
        body: 'You are responsible for account security. Paid plans are billed per the pricing page. Credits and refunds follow plan terms shown at checkout.',
      },
      {
        heading: 'Acceptable use',
        body: 'Do not submit content you lack rights to, abuse the system, use the Service for cheating on official exams, or scrape automated access beyond normal use.',
      },
      {
        heading: 'Privacy',
        body: 'See our Privacy Policy for how we handle your data.',
        link: { href: '/privacy', label: 'Privacy Policy' },
      },
      {
        heading: 'Contact',
        body: 'Questions about these Terms: contact support through Settings in your account.',
      },
      {
        heading: 'Legal notice',
        body: 'This is a working draft. Have qualified legal counsel review before relying on it for compliance.',
        muted: true,
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy | IELTS AI Tutor',
    description: 'Privacy Policy for IELTS AI Tutor by IELTSGRADER.',
    heading: 'Privacy Policy',
    draft: true,
    sections: [
      {
        heading: 'Data we collect',
        body: 'Account information (email, name), essay submissions, usage analytics, and payment data processed by Stripe. Google sign-in provides profile data per Google\'s policy.',
      },
      {
        heading: 'How we use data',
        body: 'To provide grading and reports, process subscriptions, send transactional email, improve the Service, and prevent abuse.',
      },
      {
        heading: 'AI processing',
        body: 'Essays are processed by automated systems to generate feedback. Avoid submitting highly sensitive personal data.',
      },
      {
        heading: 'Sharing',
        body: 'We do not sell personal data. We use infrastructure providers (hosting, database, email, payments) to operate the Service.',
      },
      {
        heading: 'Your rights',
        body: 'You may request access, correction, or deletion via account Settings or support. Retention follows active account lifetime unless you request deletion.',
      },
      {
        heading: 'Cookies',
        body: 'See our Cookie Policy.',
        link: { href: '/cookies', label: 'Cookie Policy' },
      },
      {
        heading: 'Legal notice',
        body: 'This is a working draft pending full legal review.',
        muted: true,
      },
    ],
  },
  cookies: {
    title: 'Cookie Policy | IELTS AI Tutor',
    description: 'Cookie Policy for IELTS AI Tutor by IELTSGRADER.',
    heading: 'Cookie Policy',
    draft: true,
    sections: [
      {
        heading: 'What are cookies?',
        body: 'Small text files stored on your device when you visit ieltsgrader.com.',
      },
      {
        heading: 'Cookies we use',
        items: [
          'Essential — login session and security',
          'Functional — preferences where enabled',
          'Analytics — usage understanding if enabled',
        ],
      },
      {
        heading: 'Third parties',
        body: 'Stripe (checkout), Google (OAuth sign-in), and analytics providers if configured may set their own cookies.',
      },
      {
        heading: 'Managing cookies',
        body: 'You can block cookies in browser settings. Essential cookies are required for core functionality.',
      },
      {
        heading: 'Legal notice',
        body: 'This is a working draft pending full legal review.',
        muted: true,
      },
    ],
  },
};
