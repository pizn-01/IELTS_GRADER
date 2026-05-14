import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGrade } from '../context/GradeContext';
import { useLenis } from '@studio-freight/react-lenis';
import { Coins, User, Shield, CreditCard, HelpCircle, LogOut } from 'lucide-react';

const Navbar = ({ showCredits }) => {
  const { userStatus, setUserStatus } = useGrade();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const lenis = useLenis();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setUserStatus(prev => ({ ...prev, isLoggedIn: false }));
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (e, link) => {
    const targetId = link.toLowerCase().replace(/\s+/g, '-');
    const isHomePage = location.pathname === '/';

    if (isHomePage) {
      e.preventDefault();
      const element = document.getElementById(targetId);
      if (element) {
        lenis?.scrollTo(`#${targetId}`, {
          offset: -80,
          duration: 1.5,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
      }
    } else {
      // If not on home page, navigate to home with hash
      // The scroll will be handled by the hash on mount
      setIsMobileMenuOpen(false);
    }
  };

  const navLinks = ['About', 'How it works', 'Sample Report', 'FAQS', 'Contact'];

  return (
    <nav className="h-[64px] md:h-[72px] sticky top-0 left-0 w-full bg-white z-[1000] border-b border-[#E5E7EB]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 h-full flex items-center justify-between">
        {/* Left Side: Logo & Desktop Links */}
        <div className="flex items-center">
          <Link onClick={() => setIsMobileMenuOpen(false)} to="/" className="text-[17px] md:text-[19px] font-extrabold text-[#1a1f36] uppercase tracking-tight cursor-pointer shrink-0 no-underline">
            IELTSGRADER
          </Link>

          {/* Vertical Divider (Desktop) */}
          <div className="hidden md:block w-[1px] h-[20px] bg-[#D1D5DB] mx-4 shrink-0"></div>

          {/* Nav Links (Desktop) */}
          <ul className="hidden md:flex items-center gap-7 list-none m-0 p-0">
            {navLinks.map((link) => (
              <li key={link}>
                <Link
                  to={`/#${link.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={(e) => handleNavClick(e, link)}
                  className="text-[14px] font-semibold text-[#4B5563] no-underline hover:text-[#1a1f36] transition-colors"
                >
                  {link}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4 md:gap-6">
          {showCredits && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#EFF6FF] rounded-full border border-[#DBEAFE]">
              <Coins className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-[13px] font-bold text-[#1e40af]">{userStatus.credits}/5 Remaining</span>
            </div>
          )}

          {userStatus.isLoggedIn ? (
            <div className="flex items-center gap-3 md:gap-6 relative" ref={dropdownRef}>
              <Link 
                to="/dashboard" 
                className="hidden md:block text-[14px] font-semibold text-[#0066FF] no-underline hover:text-[#0052CC] transition-colors"
              >
                Switch to Dashboard
              </Link>
              
              <button className="hidden md:flex p-0 bg-transparent border-none cursor-pointer text-[#9CA3AF] hover:text-[#6B7280] transition-colors items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16ZM16 17H8V11C8 8.52 9.51 6.5 12 6.5C14.49 6.5 16 8.52 16 11V17Z" fill="currentColor"/>
                </svg>
              </button>

              {/* Profile Icon Button */}
              <div 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-[34px] h-[34px] md:w-[38px] md:h-[38px] bg-[#313E50] rounded-[8px] md:rounded-[10px] flex items-center justify-center text-white text-[13px] md:text-[14px] font-bold tracking-tight cursor-pointer hover:bg-[#252f3d] transition-colors shadow-sm"
              >
                {userStatus.firstName?.[0]?.toUpperCase()}{userStatus.lastName?.[0]?.toUpperCase()}
              </div>

              {/* Dropdown Modal */}
              {isProfileOpen && (
                <div className="absolute top-[46px] md:top-[50px] right-0 w-[260px] md:w-[280px] bg-white rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-[#F3F4F6] py-4 z-[1001] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-5 md:px-6 py-2 flex items-center gap-3 md:gap-4 mb-2">
                    <div className="w-[48px] h-[48px] md:w-[52px] md:h-[52px] bg-[#313E50] rounded-full flex items-center justify-center text-white text-[16px] md:text-[18px] font-bold">
                      {userStatus.firstName?.[0]?.toUpperCase()}{userStatus.lastName?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[15px] md:text-[16px] font-bold text-[#111827] truncate">{userStatus.firstName} {userStatus.lastName}</span>
                      <span className="text-[13px] md:text-[14px] text-[#6B7280] truncate">{userStatus.email}</span>
                    </div>
                  </div>

                  <div className="h-[1px] bg-[#F3F4F6] mx-5 md:mx-6 my-3"></div>

                  <div className="flex flex-col px-2 md:px-3">
                    {[
                      { icon: <User className="w-[18px] h-[18px]" />, label: 'Profile' },
                      { icon: <Shield className="w-[18px] h-[18px]" />, label: 'Security' },
                      { icon: <CreditCard className="w-[18px] h-[18px]" />, label: 'Subscription' },
                      { icon: <HelpCircle className="w-[18px] h-[18px]" />, label: 'Support' },
                    ].map((item) => (
                      <button 
                        key={item.label}
                        className="flex items-center gap-3 px-3 md:px-4 py-2.5 rounded-[10px] hover:bg-[#F9FAFB] text-[#374151] hover:text-[#111827] transition-all border-none bg-transparent cursor-pointer text-left w-full"
                      >
                        <span className="text-[#6B7280]">{item.icon}</span>
                        <span className="text-[14px] font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="h-[1px] bg-[#F3F4F6] mx-5 md:mx-6 my-3"></div>

                  <div className="px-2 md:px-3">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 md:px-4 py-2.5 rounded-[10px] hover:bg-[#F0F7FF] text-[#0066FF] transition-all border-none bg-transparent cursor-pointer text-left"
                    >
                      <LogOut className="w-[18px] h-[18px]" />
                      <span className="text-[14px] font-semibold">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex bg-[#1a1f36] text-white px-6 py-2 rounded-[8px] text-[14px] font-bold no-underline hover:bg-[#2a2f46] transition-colors items-center justify-center h-[40px]"
            >
              Login
            </Link>
          )}

          {/* Mobile Hamburger Menu Toggle */}
          <button 
            className="md:hidden p-2 -mr-2 text-[#4B5563] hover:text-[#1a1f36] transition-colors bg-transparent border-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-[64px] left-0 w-full bg-white border-b border-[#E5E7EB] shadow-lg animate-in slide-in-from-top-2">
          <div className="px-4 py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link}
                to={`/#${link.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={(e) => handleNavClick(e, link)}
                className="text-[15px] font-semibold text-[#4B5563] py-3 px-2 rounded-lg hover:bg-[#F9FAFB] hover:text-[#1a1f36] transition-colors"
              >
                {link}
              </Link>
            ))}
            
            {showCredits && (
              <div className="flex items-center gap-2 px-3 py-2.5 mt-2 bg-[#EFF6FF] rounded-[8px] border border-[#DBEAFE] justify-center">
                <Coins className="w-4 h-4 text-[#3B82F6]" />
                <span className="text-[14px] font-bold text-[#1e40af]">{userStatus.credits}/5 Remaining</span>
              </div>
            )}

            {!userStatus.isLoggedIn ? (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-2 w-full bg-[#1a1f36] text-white px-6 py-3 rounded-[8px] text-[15px] font-bold text-center hover:bg-[#2a2f46] transition-colors"
              >
                Login
              </Link>
            ) : (
              <Link 
                to="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-2 w-full bg-[#F3F4F6] text-[#0066FF] px-6 py-3 rounded-[8px] text-[15px] font-bold text-center hover:bg-[#E5E7EB] transition-colors"
              >
                Switch to Dashboard
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
