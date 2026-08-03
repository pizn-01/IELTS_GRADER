/** Shared type-accent tokens for blog list + related cards. */
export const TYPE_STYLES = {
  guide: {
    chip: 'bg-[#EFF6FF] text-[#1D4ED8]',
    accent: '#3B82F6',
    bar: 'bg-[#3B82F6]',
  },
  sample: {
    chip: 'bg-[#ECFDF5] text-[#047857]',
    accent: '#059669',
    bar: 'bg-[#059669]',
  },
  plan: {
    chip: 'bg-[#FFF7ED] text-[#C2410C]',
    accent: '#EA580C',
    bar: 'bg-[#EA580C]',
  },
  trust: {
    chip: 'bg-[#EEF2FF] text-[#4338CA]',
    accent: '#4F46E5',
    bar: 'bg-[#4F46E5]',
  },
  comparison: {
    chip: 'bg-[#FDF2F8] text-[#BE185D]',
    accent: '#DB2777',
    bar: 'bg-[#DB2777]',
  },
};

export function getTypeStyle(type) {
  return (
    TYPE_STYLES[type] || {
      chip: 'bg-[#F3F4F6] text-[#4B5563]',
      accent: '#6B7280',
      bar: 'bg-[#9CA3AF]',
    }
  );
}

export function cleanPostTitle(title = '') {
  return title.replace(/\s*\|\s*IELTS AI Tutor.*$/i, '');
}
