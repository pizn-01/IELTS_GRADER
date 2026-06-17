import React, { useState, useRef, useEffect } from 'react';
import { Bell, Menu, X, User, HelpCircle, LogOut, CircleDollarSign, LayoutDashboard, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children, onNavigate, currentView = 'dashboard', actions, profileImage }) => {
  const { user, updateUser } = useAuth();
  const displayName = user?.full_name || 'Candidate';
  const email = user?.email || '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Dashboard', id: 'dashboard' },
    { label: 'Reports', id: 'reports' },
    { label: 'Your Subscription', id: 'subscription' },
    { label: 'Settings', id: 'settings' },
  ];

  const creditsRemaining = user?.credits_remaining ?? 0;

  return (
    <div className="min-h-screen bg-white">
      {/* NAVBAR — outer nav is NOT a flex row so the drawer stacks below */}
      <nav className="bg-white border-b border-[#E5E7EB] sticky top-0 z-[100]">

        {/* ── 56px header bar ── */}
        <div className="h-[56px] flex items-center">
          <div className="w-full max-w-[1440px] mx-auto px-4 md:px-[50px] flex items-center justify-between">

            {/* Left: logo + desktop nav */}
            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="text-[18px] md:text-[20px] tracking-tight text-[#101828] no-underline hover:opacity-80 transition-opacity cursor-pointer"
                style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}
              >
                IELTSGRADER
              </Link>
              <div className="hidden md:block h-6 w-px bg-[#E5E7EB]" />

              {/* Desktop nav tabs */}
              <div className="hidden md:flex items-center gap-8 text-[14px] text-[#101828] font-sans h-[56px]">
                {navItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative h-full flex items-center cursor-pointer"
                    onClick={() => onNavigate && onNavigate(item.id)}
                  >
                    <span className={currentView === item.id ? 'text-[#101828] font-bold' : 'text-gray-400 hover:text-gray-600 transition-colors'}>
                      {item.label}
                    </span>
                    {currentView === item.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#1A96F3] rounded-t-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">

              {/* ── MOBILE: compact credits pill ── */}
              <div className="md:hidden flex items-center gap-1.5 bg-[#EFF6FF] border border-[#DBEAFE] rounded-full px-2.5 py-1">
                <div className="w-2 h-2 rounded-full bg-[#1A96F3] shrink-0" />
                <span className="text-[10px] font-bold text-[#1A96F3] whitespace-nowrap leading-none">
                  {creditsRemaining}/1 Credits
                </span>
              </div>

              {/* ── MOBILE: hamburger ── */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden text-[#344054] p-1 border-none bg-transparent"
              >
                {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

              {/* ── DESKTOP: credits + bell + avatar ── */}
              <div className="hidden md:flex items-center gap-6">
                {/* Credits Pill */}
                <div className="bg-[#DDF2FF] rounded-full px-4 py-1.5 flex items-center gap-3">
                  <div className="relative w-7 h-7 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 28 28" className="w-full h-full transform -rotate-90">
                      <circle cx="14" cy="14" r="11" stroke="#C7E3F9" strokeWidth="3" fill="transparent" />
                      <circle
                        cx="14" cy="14" r="11"
                        stroke="#1A96F3" strokeWidth="3"
                        strokeDasharray={2 * Math.PI * 11}
                        strokeDashoffset={2 * Math.PI * 11 * (1 - Math.min(creditsRemaining, 1))}
                        strokeLinecap="round" fill="transparent"
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[12px] font-semibold text-[#101828]">Free Trial</span>
                    <span className="text-[12px] font-bold text-[#101828]">Credits: {creditsRemaining}/1 Remaining</span>
                  </div>
                </div>

                <button className="text-[#94A3B8] hover:text-[#64748B] transition-colors">
                  <Bell size={22} fill="currentColor" />
                </button>

                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="w-10 h-10 bg-[#0F172A] text-white rounded-[12px] flex items-center justify-center text-[14px] font-bold shadow-sm overflow-hidden hover:opacity-90 transition-all leading-none"
                  >
                    {profileImage
                      ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      : <span className="translate-y-[0.5px]">{initials}</span>
                    }
                  </button>

                  {/* Desktop profile dropdown */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-3 w-[280px] bg-white rounded-[20px] border border-gray-100 shadow-xl z-[100] py-2 animate-in fade-in zoom-in duration-200 origin-top-right">
                      <div className="absolute -top-[6px] right-3 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />
                      <div className="px-6 py-5 flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#2C3E50] rounded-full flex items-center justify-center text-white text-[18px] font-bold overflow-hidden shrink-0">
                          {profileImage
                            ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                            : initials
                          }
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[16px] font-bold text-[#101828] truncate">{displayName}</span>
                          <span className="text-[14px] text-gray-400 truncate">{email}</span>
                        </div>
                      </div>

                      <div className="h-px bg-gray-50 mx-4 mb-2" />

                      <div className="px-3 space-y-1">
                        {[
                          { label: 'Profile', icon: <User size={18} />, id: 'settings' },
                          { label: 'Subscription', icon: <CircleDollarSign size={18} />, id: 'subscription' },
                          { label: 'Support', icon: <HelpCircle size={18} />, id: 'settings' },
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => { onNavigate && onNavigate(item.id, item.label); setIsProfileOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[#101828] hover:bg-gray-50 rounded-xl transition-colors group"
                          >
                            <span className="text-gray-400 group-hover:text-[#101828] transition-colors">{item.icon}</span>
                            <span className="text-[14px] font-medium">{item.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="h-px bg-gray-50 mx-4 my-2" />

                      <div className="px-3">
                        <button
                          onClick={() => onNavigate && onNavigate('logout')}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[#1A96F3] hover:bg-blue-50 rounded-xl transition-colors group"
                        >
                          <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                          <span className="text-[14px] font-bold">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE drawer — stacks BELOW the 56px bar, outside the flex row ── */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-xl animate-in slide-in-from-top duration-200">

            {/* Credits banner inside drawer */}
            <div className="mx-4 mt-5 mb-2 bg-[#EFF6FF] border border-[#DBEAFE] rounded-[14px] px-5 py-4 flex items-center gap-4">
              <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-full h-full transform -rotate-90">
                  <circle cx="20" cy="20" r="16" stroke="#DBEAFE" strokeWidth="3.5" fill="transparent" />
                  <circle
                    cx="20" cy="20" r="16"
                    stroke="#1A96F3" strokeWidth="3.5"
                    strokeDasharray={2 * Math.PI * 16}
                    strokeDashoffset={2 * Math.PI * 16 * (1 - Math.min(creditsRemaining, 1))}
                    strokeLinecap="round" fill="transparent"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-semibold text-[#101828]">Free Trial</span>
                <span className="text-[13px] font-bold text-[#1A96F3]">Credits: {creditsRemaining}/1 Remaining</span>
              </div>
            </div>

            {/* User info */}
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-[50px] h-[50px] bg-[#2C3E50] rounded-full flex items-center justify-center text-white text-[18px] font-bold overflow-hidden shrink-0">
                {profileImage
                  ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  : initials
                }
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[16px] font-bold text-[#101828] truncate">{displayName}</span>
                <span className="text-[13px] text-gray-400 truncate mt-0.5">{email}</span>
              </div>
            </div>

            <div className="h-px bg-gray-100 mx-4 mb-2" />

            {/* Nav items */}
            <div className="px-3 pb-2">
              {[
                { label: 'Dashboard',    icon: <LayoutDashboard size={20} />, id: 'dashboard' },
                { label: 'Reports',      icon: <BarChart3 size={20} />,       id: 'reports' },
                { label: 'Profile',      icon: <User size={20} />,            id: 'settings' },
                { label: 'Subscription', icon: <CircleDollarSign size={20} />,id: 'subscription' },
                { label: 'Support',      icon: <HelpCircle size={20} />,      id: 'settings' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => { onNavigate && onNavigate(item.id, item.label); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                    currentView === item.id && item.id !== 'settings'
                      ? 'bg-[#EFF6FF] text-[#1A96F3]'
                      : 'text-[#101828] hover:bg-gray-50'
                  }`}
                >
                  <span className={currentView === item.id && item.id !== 'settings' ? 'text-[#1A96F3]' : 'text-gray-400'}>
                    {item.icon}
                  </span>
                  <span className="text-[15px] font-semibold">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="h-px bg-gray-100 mx-4" />

            {/* Sign out */}
            <div className="px-3 py-2 pb-4">
              <button
                onClick={() => { onNavigate && onNavigate('logout'); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-[#1A96F3] hover:bg-blue-50 rounded-xl transition-all"
              >
                <LogOut size={20} />
                <span className="text-[15px] font-bold">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;
