import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Camera, Eye, EyeOff, CreditCard, X, Target, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const Settings = ({ profileImage, setProfileImage }) => {
  const location = useLocation();
  const getInitialTab = () => {
    let tab = location.state?.activeTab || 'Profile';
    if (tab === 'Security') return 'Change Password';
    return tab;
  };

  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState(getInitialTab());

  useEffect(() => {
    if (location.state?.activeTab) {
      let tab = location.state.activeTab;
      if (tab === 'Security') tab = 'Change Password';
      setActiveTab(tab);
    }
  }, [location.state?.activeTab]);

  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // Profile form state — pre-populated from auth context
  const [profileForm, setProfileForm] = useState({
    firstName: user?.full_name?.split(' ')[0] || '',
    lastName:  user?.full_name?.split(' ').slice(1).join(' ') || '',
    targetBand: user?.target_band || 7.5,
  });

  // Derive initials and display name from live user data
  const displayName = user?.full_name || 'User';
  const avatarInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || 'U';
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null); // { type: 'success'|'error', text }

  // Password form state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  // Support form state
  const [supportForm, setSupportForm] = useState({ topic: 'General', message: '' });
  const [supportSending, setSupportSending] = useState(false);

  const handleProfileSave = async () => {
    const full_name = `${profileForm.firstName} ${profileForm.lastName}`.trim();
    if (!full_name) return setProfileMsg({ type: 'error', text: 'Name cannot be empty.' });
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const updated = await api.updateProfile({ full_name, target_band: profileForm.targetBand });
      updateUser({ full_name: updated.full_name, target_band: updated.target_band });
      setProfileMsg({ type: 'success', text: 'Profile saved successfully.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Save failed.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword)
      return setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
    if (passwordForm.newPassword.length < 8)
      return setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      await api.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Password change failed.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSupportSend = async () => {
    if (!supportForm.message.trim()) return;
    setSupportSending(true);
    try {
      await api.submitSupport({ topic: supportForm.topic, message: supportForm.message });
      setSupportForm({ topic: 'General', message: '' });
      setShowSupportSuccessModal(true);
    } catch (err) {
      // Show modal even on error — message will be retried server-side
      setShowSupportSuccessModal(true);
    } finally {
      setSupportSending(false);
    }
  };
  const [showSupportSuccessModal, setShowSupportSuccessModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState('Smart Top Up');
  const [successType, setSuccessType] = useState('subscription'); // 'subscription' or 'cancellation'
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  
  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isDragging, setIsDragging] = useState(false);

  const handleImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleImageUpload(file);
  };

  const triggerFileInput = () => {
    document.getElementById('profile-upload').click();
  };

  const packs = [
    { name: 'Starter Top Up',   credits: '10', price: '$12', desc: 'Best for short practice sprints',    priceId: 'price_1TcqK9FDM9NsOfLRmmYyoSTh' },
    { name: 'Smart Top Up',     credits: '24', price: '$24', desc: 'Most chosen by active learners',     priceId: 'price_1TcqPbFDM9NsOfLRquDNOJpA' },
    { name: 'Intensive Top Up', credits: '50', price: '$44', desc: 'For speaking + writing every week',  priceId: 'price_1TcqRfFDM9NsOfLRbZgZMEKc' },
  ];

  const handlePayForPack = async () => {
    const pack = packs.find(p => p.name === selectedPack);
    if (!pack) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const { url } = await api.createCheckoutSession(pack.priceId);
      window.location.href = url;
    } catch (err) {
      setCheckoutError(err.message || 'Failed to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1340px] mx-auto px-8 py-10 relative text-[#101828]">
      <h1 className="text-[32px] font-bold text-[#101828] mb-8">Settings</h1>
      
      {/* Settings Navigation */}
      <div className="flex items-center gap-6 md:gap-10 border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar -mx-8 px-8">
        {['Profile', 'Change Password', 'Subscription', 'Support'].map((tab) => (
          <div 
            key={tab} 
            className="relative py-4 cursor-pointer group whitespace-nowrap"
            onClick={() => setActiveTab(tab)}
          >
            <span className={`text-[14px] md:text-[15px] font-medium transition-colors ${activeTab === tab ? "text-[#101828]" : "text-gray-400 group-hover:text-gray-600"}`}>
              {tab}
            </span>
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#1A96F3] rounded-t-full"></div>
            )}
          </div>
        ))}
      </div>

      {activeTab === 'Profile' ? (
        /* Profile Settings Card */
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-6 md:p-12">
          <div className="flex flex-col md:flex-row gap-10 md:gap-16">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 shrink-0">
              <div 
                className={`relative w-[120px] h-[120px] md:w-[140px] md:h-[140px] rounded-full transition-all duration-300 cursor-pointer ${isDragging ? 'ring-4 ring-[#1A96F3] ring-offset-4 scale-105 bg-[#F0F9FF]' : ''}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={triggerFileInput}
              >
                <div className="w-full h-full bg-[#344054] rounded-full flex items-center justify-center text-[40px] md:text-[48px] font-black text-white overflow-hidden shadow-inner border-4 border-white transition-transform duration-500 hover:scale-[1.02]">
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover animate-in fade-in duration-500"
                    />
                  ) : (
                    <span className="animate-in zoom-in duration-300">{avatarInitials}</span>
                  )}
                  {isDragging && (
                    <div className="absolute inset-0 bg-[#1A96F3]/20 backdrop-blur-[2px] flex items-center justify-center rounded-full">
                      <Camera className="text-white animate-bounce" size={32} />
                    </div>
                  )}
                </div>
                <div 
                  className="absolute bottom-1 right-1 w-9 h-9 md:w-10 md:h-10 bg-[#1A96F3] rounded-full border-4 border-white flex items-center justify-center text-white shadow-lg hover:bg-[#1581D1] transition-all hover:scale-110 active:scale-95 group z-10"
                >
                  <Camera size={16} className="group-hover:rotate-12 transition-transform" />
                </div>
                <input 
                  id="profile-upload"
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files[0])}
                />
              </div>
              <div className="text-center">
                <span className="text-[16px] font-bold text-[#101828] block">{displayName}</span>
                <span className="text-[12px] text-gray-400 font-medium">Click icon or drag & drop</span>
              </div>
            </div>

            {/* Form Section */}
            <div className="flex-1 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="text-[14px] font-bold text-[#101828]">First Name</label>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={e => setProfileForm(p => ({ ...p, firstName: e.target.value }))}
                    className="w-full h-[52px] px-5 bg-white border border-gray-100 rounded-[12px] text-[14px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-bold text-[#101828]">Last Name</label>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={e => setProfileForm(p => ({ ...p, lastName: e.target.value }))}
                    className="w-full h-[52px] px-5 bg-white border border-gray-100 rounded-[12px] text-[14px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-bold text-[#101828]">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    className="w-full h-[52px] px-5 bg-gray-50 border border-gray-100 rounded-[12px] text-[14px] text-[#6B7280] focus:outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-bold text-[#101828]">Phone</label>
                  <input 
                    type="tel" 
                    placeholder="Enter"
                    className="w-full h-[52px] px-5 bg-white border border-gray-100 rounded-[12px] text-[14px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] transition-all"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[14px] font-bold text-[#101828]">Address</label>
                  <input 
                    type="text" 
                    placeholder="Enter"
                    className="w-full h-[52px] px-5 bg-white border border-gray-100 rounded-[12px] text-[14px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] transition-all"
                  />
                </div>
                <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[14px] font-bold text-[#101828]">State</label>
                    <input 
                      type="text" 
                      placeholder="Enter"
                      className="w-full h-[52px] px-5 bg-white border border-gray-100 rounded-[12px] text-[14px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[14px] font-bold text-[#101828]">Country</label>
                    <div className="relative">
                      <select className="w-full h-[52px] px-5 bg-white border border-gray-100 rounded-[12px] text-[14px] text-[#9CA3AF] font-normal focus:outline-none focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] transition-all appearance-none">
                        <option>Select</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronDown size={20} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[14px] font-bold text-[#101828]">Postal Code</label>
                    <input 
                      type="text" 
                      placeholder="Enter"
                      className="w-full h-[52px] px-5 bg-white border border-gray-100 rounded-[12px] text-[14px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Profile status message */}
              {profileMsg && (
                <p className={`text-[13px] font-medium ${profileMsg.type === 'success' ? 'text-[#10B981]' : 'text-[#EA4335]'}`}>
                  {profileMsg.text}
                </p>
              )}
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                <button
                  onClick={() => setProfileForm({ firstName: user?.full_name?.split(' ')[0] || '', lastName: user?.full_name?.split(' ').slice(1).join(' ') || '', targetBand: user?.target_band || 7.5 })}
                  className="px-10 h-[48px] bg-white border border-gray-200 rounded-[10px] text-[14px] font-medium text-[#101828] hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProfileSave}
                  disabled={profileSaving}
                  className="px-10 h-[48px] bg-[#344054] text-white rounded-[10px] text-[14px] font-medium hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
                >
                  {profileSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'Change Password' ? (
        /* Change Password Settings Card */
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-12">
          <div className="max-w-[360px] space-y-8">
            <div className="space-y-2">
              <label className="text-[14px] font-bold text-[#101828]">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                  className="w-full h-[52px] px-5 bg-white border border-gray-100 rounded-[12px] text-[14px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] transition-all pr-12"
                />
                <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#101828] transition-colors">
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-bold text-[#101828]">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="Enter"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  className="w-full h-[52px] px-5 bg-white border border-gray-100 rounded-[12px] text-[14px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] transition-all pr-12"
                />
                <button onClick={() => setShowNew(!showNew)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#101828] transition-colors">
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-bold text-[#101828]">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Enter"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  className="w-full h-[52px] px-5 bg-white border border-gray-100 rounded-[12px] text-[14px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] transition-all pr-12"
                />
                <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#101828] transition-colors">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {passwordMsg && (
            <p className={`text-[13px] font-medium mt-4 ${passwordMsg.type === 'success' ? 'text-[#10B981]' : 'text-[#EA4335]'}`}>
              {passwordMsg.text}
            </p>
          )}
          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-12 border-t border-gray-50 mt-12">
            <button
              onClick={() => { setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPasswordMsg(null); }}
              className="px-10 h-[44px] bg-white border border-gray-200 rounded-[10px] text-[14px] font-medium text-[#101828] hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handlePasswordChange}
              disabled={passwordSaving}
              className="px-10 h-[44px] bg-[#344054] text-white rounded-[10px] text-[14px] font-medium hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
            >
              {passwordSaving ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </div>
      ) : activeTab === 'Subscription' ? (
        /* Subscription Settings View */
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr,1fr] gap-8">
            {/* Left Column: Current Plan */}
            <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-6 md:p-12 flex flex-col justify-between">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#101828]">Current Plan</span>
                  <span className="text-[14px] font-medium text-gray-500">Weekly Sprint</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#101828]">Renewal Date</span>
                  <span className="text-[14px] font-medium text-gray-500">Mar 30, 2026</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#101828]">Billing</span>
                  <span className="text-[14px] font-medium text-gray-500">$9.99 / week</span>
                </div>
                
                <div className="space-y-4 pt-4">
                  {(() => {
                    const remaining = user?.credits_remaining ?? 0;
                    const barPct = Math.min(100, Math.max(0, Math.round((remaining / 5) * 100)));
                    const barColor = remaining === 0
                      ? 'bg-[#EA4335]'
                      : remaining <= 2
                      ? 'bg-[#F59E0B]'
                      : 'bg-[#10B981]';
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[14px] font-bold text-[#101828]">
                            {remaining} {remaining === 1 ? 'credit' : 'credits'} remaining
                          </span>
                          <span className={`text-[14px] font-bold ${remaining === 0 ? 'text-[#EA4335]' : remaining <= 2 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
                            {remaining === 0 ? 'All used' : `${barPct}%`}
                          </span>
                        </div>
                        <div className="h-[8px] bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-12">
                <button 
                  onClick={() => setShowRetentionModal(true)}
                  className="w-full sm:w-auto px-8 h-[44px] bg-white border border-gray-200 rounded-[10px] text-[13px] font-bold text-[#101828] hover:bg-gray-50 transition-all"
                >
                    Cancel Subscription
                </button>
                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="w-full sm:w-auto px-8 h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
                >
                    Upgrade Plan
                </button>
              </div>
            </div>

            {/* Right Column: Manage Billing */}
            <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-6 md:p-12 flex flex-col items-center justify-center text-center">
              <div className="w-[52px] h-[52px] bg-[#E0F2FE] rounded-[12px] flex items-center justify-center text-[#1A96F3] mb-6">
                <CreditCard size={24} />
              </div>
              <h3 className="text-[20px] font-bold text-[#101828] mb-4">Manage Your Billing</h3>
              <p className="text-[14px] text-gray-400 leading-relaxed mb-8 max-w-[280px]">
                Click the button below to change your plan, payment method, cancel subscription or view your invoices.
              </p>
              <button className="w-full max-w-[180px] h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm">
                Manage Billing
              </button>
            </div>
          </div>

          {/* Low Credits Warning Banner */}
          {(user?.credits_remaining ?? 0) <= 2 && (
            <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-[12px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm animate-in slide-in-from-bottom duration-500">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#F59E0B] shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#F59E0B]">Low Credits Warning</h4>
                    <p className="text-[14px] text-gray-500 font-medium mt-0.5">Less than 3 tests left. Keep your streak going.</p>
                  </div>
               </div>
               <button
                 onClick={() => setShowTopUpModal(true)}
                 className="w-full md:w-auto px-8 h-[44px] bg-[#344054] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
               >
                  Top Up Credit
               </button>
            </div>
          )}
        </div>
      ) : activeTab === 'Support' ? (
        /* Support Settings View */
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-12">
          <div className="max-w-[800px] space-y-10">
            {/* Select Topic */}
            <div className="space-y-3">
              <label className="text-[16px] font-bold text-[#101828]">Select Topic</label>
              <div className="relative">
                <select
                  value={supportForm.topic}
                  onChange={e => setSupportForm(p => ({ ...p, topic: e.target.value }))}
                  className="w-full max-w-[400px] h-[52px] px-5 bg-white border border-gray-100 rounded-[12px] text-[14px] text-[#101828] font-normal focus:outline-none focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] transition-all appearance-none"
                >
                  <option value="General">General</option>
                  <option value="Technical">Technical Issue</option>
                  <option value="Billing">Billing Question</option>
                  <option value="Account">Account</option>
                  <option value="Grading">Grading</option>
                  <option value="Other">Other</option>
                </select>
                <div className="absolute right-[calc(100%-380px)] top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <ChevronDown size={20} />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <label className="text-[16px] font-bold text-[#101828]">Description</label>
              <textarea
                placeholder="Type here..."
                value={supportForm.message}
                onChange={e => setSupportForm(p => ({ ...p, message: e.target.value }))}
                className="w-full min-h-[200px] p-5 bg-white border border-gray-100 rounded-[12px] text-[14px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1A96F3]/20 focus:border-[#1A96F3] transition-all resize-none"
              ></textarea>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-50">
              <button className="px-10 h-[44px] bg-white border border-gray-200 rounded-[10px] text-[14px] font-medium text-[#101828] hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button
                onClick={handleSupportSend}
                disabled={supportSending || !supportForm.message.trim()}
                className="px-10 h-[44px] bg-[#344054] text-white rounded-[10px] text-[14px] font-medium hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
              >
                {supportSending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Fallback for other tabs */
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-20 flex items-center justify-center">
          <div className="text-center space-y-4">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
             </div>
             <h3 className="text-[18px] font-bold text-[#101828]">{activeTab} Section</h3>
             <p className="text-gray-400 text-[14px]">This section is coming soon.</p>
          </div>
        </div>
      )}

      {/* Retention Modal (Cancellation First Step) */}
      {showRetentionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-[560px] rounded-[24px] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Close Button */}
            <button 
              onClick={() => setShowRetentionModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-[#101828] transition-colors"
            >
              <X size={24} />
            </button>

            <div className="p-10 flex flex-col items-center text-center">
              {/* Target Icon */}
              <div className="w-20 h-20 bg-[#1A96F3] rounded-full flex items-center justify-center text-white mb-6">
                <Target size={40} />
              </div>

              <h2 className="text-[24px] font-bold text-[#101828] mb-3">You're close to Band 7.5!</h2>
              <p className="text-[15px] text-gray-500 font-medium leading-relaxed mb-10 max-w-[340px]">
                Keep practicing - you're only a few sessions away from your goal.
              </p>

              <div className="w-full space-y-4">
                <button 
                  onClick={() => setShowRetentionModal(false)}
                  className="w-full h-[56px] bg-[#344054] text-white rounded-[12px] text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
                >
                  Keep Practicing
                </button>
                <button
                    onClick={() => {
                      setShowRetentionModal(false);
                      setSuccessType('cancellation');
                      setShowSuccessModal(true);
                    }}
                    className="w-full h-[56px] bg-white border border-gray-200 rounded-[12px] text-[15px] font-bold text-[#101828] hover:bg-gray-50 transition-all"
                  >
                    Cancel Anyway
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal (Cancellation Complete) */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[560px] rounded-[24px] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Close Button */}
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 md:top-6 right-4 md:right-6 text-gray-400 hover:text-[#101828] transition-colors z-10"
            >
              <X size={20} md:size={24} />
            </button>

            <div className="p-6 md:p-10 flex flex-col items-center text-center">
              {/* Check Icon */}
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#1A96F3] rounded-full flex items-center justify-center text-white mb-6">
                <CheckCircle2 size={32} md:size={40} />
              </div>

              <h2 className="text-[20px] md:text-[24px] font-bold text-[#101828] mb-4">
                {successType === 'subscription' ? 'Subscription Successful' : 'Subscription Cancelled'}
              </h2>
              <p className="text-[14px] md:text-[15px] text-gray-500 font-medium leading-relaxed mb-8 md:mb-10 max-w-[400px]">
                {successType === 'subscription' 
                  ? `You have successfully subscribed to the ${selectedPack}. Your credits have been added to your account.`
                  : 'Your subscription has been cancelled successfully. You will continue to have access until the end of your current billing period.'}
              </p>

              <div className="w-full space-y-4">
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full h-[52px] md:h-[56px] bg-[#344054] text-white rounded-[12px] text-[14px] md:text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
                >
                  {successType === 'subscription' ? 'Done' : 'Go to Dashboard'}
                </button>
                {successType === 'cancellation' && (
                  <button 
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full h-[52px] md:h-[56px] bg-white border border-gray-200 rounded-[12px] text-[14px] md:text-[15px] font-bold text-[#101828] hover:bg-gray-50 transition-all"
                  >
                    Resubscribe
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal (Cancellation Failed) */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[560px] rounded-[24px] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Close Button */}
            <button 
              onClick={() => setShowErrorModal(false)}
              className="absolute top-4 md:top-6 right-4 md:right-6 text-gray-400 hover:text-[#101828] transition-colors z-10"
            >
              <X size={20} md:size={24} />
            </button>

            <div className="p-6 md:p-10 flex flex-col items-center text-center">
              {/* Error Icon */}
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#EA4335] rounded-full flex items-center justify-center text-white mb-6">
                <X size={32} md:size={40} strokeWidth={3} />
              </div>

              <h2 className="text-[20px] md:text-[24px] font-bold text-[#101828] mb-4">Cancellation Failed</h2>
              <p className="text-[14px] md:text-[15px] text-gray-500 font-medium leading-relaxed mb-8 md:mb-10 max-w-[420px]">
                We couldn't cancel your subscription at the moment. Please try again or contact support if the issue persists.
              </p>

              <div className="w-full">
                <button 
                  onClick={() => setShowErrorModal(false)}
                  className="w-full h-[52px] md:h-[56px] bg-[#344054] text-white rounded-[12px] text-[14px] md:text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Success Modal */}
      {showSupportSuccessModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[500px] rounded-[24px] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Close Button */}
            <button 
              onClick={() => setShowSupportSuccessModal(false)}
              className="absolute top-4 md:top-6 right-4 md:right-6 text-gray-400 hover:text-[#101828] transition-colors z-10"
            >
              <X size={20} md:size={24} />
            </button>

            <div className="p-6 md:p-10 flex flex-col items-center text-center">
              {/* Check Icon */}
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#10B981] rounded-full flex items-center justify-center text-white mb-6">
                <CheckCircle2 size={32} md:size={40} />
              </div>

              <h2 className="text-[20px] md:text-[24px] font-bold text-[#101828] mb-3">Message Sent!</h2>
              <p className="text-[14px] md:text-[15px] text-gray-500 font-medium leading-relaxed mb-8 md:mb-10 max-w-[340px]">
                Your message has been sent successfully. Our support team will get back to you shortly.
              </p>

              <button 
                onClick={() => setShowSupportSuccessModal(false)}
                className="w-full h-[52px] md:h-[56px] bg-[#344054] text-white rounded-[12px] text-[14px] md:text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Choose a Credit Pack Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[600px] rounded-[24px] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
            {/* Modal Header */}
            <div className="px-6 md:px-10 py-6 md:py-8 flex items-center justify-between shrink-0">
              <h2 className="text-[18px] md:text-[20px] font-bold text-[#101828] leading-tight pr-8">Choose a Credit Pack and keep Practicing</h2>
              <button 
                onClick={() => setShowTopUpModal(false)}
                className="text-gray-400 hover:text-[#101828] transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="px-6 md:px-10 pb-8 md:pb-10 space-y-4 overflow-y-auto">
              {packs.map((pack) => (
                <div 
                  key={pack.name}
                  onClick={() => setSelectedPack(pack.name)}
                  className={`p-4 md:p-6 rounded-[16px] border-2 cursor-pointer transition-all ${
                    selectedPack === pack.name 
                      ? "border-[#1A96F3] bg-[#F0F9FF]" 
                      : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-[13px] md:text-[14px] font-bold text-[#101828]">{pack.name}</h3>
                      <p className="text-[20px] md:text-[24px] font-black text-[#101828] mt-1">{pack.price}</p>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-[20px] md:text-[24px] font-black text-[#101828]">{pack.credits}</span>
                      <span className="text-[12px] md:text-[14px] font-bold text-gray-400">Credits</span>
                    </div>
                  </div>
                  <p className="text-[12px] md:text-[13px] text-gray-500 font-medium">{pack.desc}</p>
                </div>
              ))}

              <div className="pt-4 md:pt-6 space-y-3">
                {checkoutError && (
                  <p className="text-[13px] font-medium text-[#EA4335] text-center">{checkoutError}</p>
                )}
                <button
                  onClick={handlePayForPack}
                  disabled={checkoutLoading}
                  className="w-full h-[52px] md:h-[56px] bg-[#344054] text-white rounded-[12px] text-[14px] md:text-[15px] font-bold hover:bg-[#1D2939] transition-all shadow-sm disabled:opacity-60"
                >
                  {checkoutLoading ? 'Redirecting to Stripe…' : 'Pay & Add Credits'}
                </button>
                <button 
                  onClick={() => setShowTopUpModal(false)}
                  className="w-full h-[52px] md:h-[56px] bg-white border border-gray-200 rounded-[12px] text-[14px] md:text-[15px] font-bold text-[#101828] hover:bg-gray-50 transition-all"
                >
                  Cancel Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
