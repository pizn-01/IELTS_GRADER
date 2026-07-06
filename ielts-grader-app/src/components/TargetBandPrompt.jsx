import React, { useState } from 'react';
import { Target, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DEFAULT_TARGET_BAND, IELTS_BAND_QUICK_PICKS } from '../constants/ieltsBands';

const TargetBandPrompt = ({
  isOpen,
  onClose,
  score = null,
  title = "What's your target band?",
}) => {
  const { updateUser } = useAuth();
  const [selected, setSelected] = useState(DEFAULT_TARGET_BAND);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const finish = async (payload) => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateProfile(payload);
      updateUser({
        target_band: updated.target_band,
        target_band_confirmed: updated.target_band_confirmed,
      });
      onClose?.();
    } catch (err) {
      setError(err.message || 'Could not save your target. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => finish({ target_band: selected, target_band_confirmed: true });
  const handleSkip = () => finish({ target_band_confirmed: true });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-[20px] shadow-xl border border-gray-100 w-full max-w-[480px] overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#1A96F3] shrink-0">
              <Target size={20} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#101828]">{title}</h2>
              <p className="text-[13px] text-[#667085] mt-1 leading-relaxed">
                {score != null
                  ? `You scored Band ${score}. We'll personalize your performance insights and pathway to this goal.`
                  : 'We use this to personalize your performance insights and progress pathway.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            aria-label="Skip for now"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          <div className="grid grid-cols-4 gap-2">
            {IELTS_BAND_QUICK_PICKS.map((band) => (
              <button
                key={band}
                type="button"
                onClick={() => setSelected(band)}
                className={`h-[44px] rounded-[10px] text-[14px] font-bold border transition-all ${
                  selected === band
                    ? 'bg-[#2C3E50] text-white border-transparent'
                    : 'border-gray-200 text-[#344054] hover:bg-gray-50'
                }`}
              >
                {band.toFixed(1)}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Or choose any band</label>
            <select
              value={selected}
              onChange={(e) => setSelected(parseFloat(e.target.value))}
              className="w-full h-[44px] border border-gray-200 rounded-[10px] px-3 text-[14px] text-[#101828] outline-none focus:border-[#1A96F3]"
            >
              {Array.from({ length: 9 }, (_, i) => 5.0 + i * 0.5).map((band) => (
                <option key={band} value={band}>{band.toFixed(1)}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-[13px] text-[#EA4335]">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="flex-1 h-[46px] rounded-[10px] border border-gray-200 text-[14px] font-medium text-[#344054] hover:bg-gray-50 disabled:opacity-60"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-[46px] rounded-[10px] bg-[#2C3E50] text-white text-[14px] font-semibold hover:bg-[#1D2939] disabled:opacity-60"
            >
              {saving ? 'Saving…' : `Set target Band ${selected.toFixed(1)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TargetBandPrompt;
