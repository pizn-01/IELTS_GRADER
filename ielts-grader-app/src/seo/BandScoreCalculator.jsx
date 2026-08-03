import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const BANDS = [9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4];

/** Round to nearest half band (common practice-calculator convention). */
export function roundToHalfBand(n) {
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 2) / 2;
}

/** Writing band from Task 1 + Task 2 with Task 2 weighted 2×. */
export function writingBandFromTasks(task1, task2) {
  const t1 = Number(task1);
  const t2 = Number(task2);
  if (![t1, t2].every((x) => Number.isFinite(x))) return null;
  return roundToHalfBand((t1 + 2 * t2) / 3);
}

/** Task band from four equally weighted criteria. */
export function taskBandFromCriteria(tr, cc, lr, gra) {
  const vals = [tr, cc, lr, gra].map(Number);
  if (!vals.every((x) => Number.isFinite(x))) return null;
  return roundToHalfBand(vals.reduce((a, b) => a + b, 0) / 4);
}

function BandSelect({ id, label, value, onChange }) {
  return (
    <label className="block text-[13px] font-semibold text-[#374151]">
      {label}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-[12px] border border-[#E5E7EB] bg-white px-3 py-2.5 text-[15px] text-[#1a1f36] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]"
      >
        <option value="">Select</option>
        {BANDS.map((b) => (
          <option key={b} value={String(b)}>
            {b.toFixed(1)}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Interactive IELTS Writing band calculator for /ielts-writing-band-score.
 * Combines Task 1 + Task 2 (2× weight) and optional four-criterion average.
 */
export default function BandScoreCalculator() {
  const [task1, setTask1] = useState('6.5');
  const [task2, setTask2] = useState('7.0');
  const [tr, setTr] = useState('6.5');
  const [cc, setCc] = useState('7.0');
  const [lr, setLr] = useState('6.5');
  const [gra, setGra] = useState('7.0');

  const writingBand = useMemo(() => writingBandFromTasks(task1, task2), [task1, task2]);
  const criterionBand = useMemo(() => taskBandFromCriteria(tr, cc, lr, gra), [tr, cc, lr, gra]);
  const lowest = useMemo(() => {
    const vals = [Number(tr), Number(cc), Number(lr), Number(gra)].filter(Number.isFinite);
    return vals.length === 4 ? Math.min(...vals) : null;
  }, [tr, cc, lr, gra]);

  return (
    <section className="mb-12 rounded-[20px] border border-[#E5E7EB] bg-[#F8FAFC] p-5 md:p-7">
      <h2 className="text-[26px] md:text-[30px] font-extrabold text-[#1a1f36] mb-2 tracking-tight font-['Nunito',_sans-serif]">
        IELTS Writing band score calculator
      </h2>
      <p className="text-[15px] text-[#6B7280] leading-relaxed mb-6 max-w-2xl">
        Estimate your Writing band from Task 1 and Task 2 scores (Task 2 counts double). Optionally average four
        criterion scores for one task. This is a practice formula tool — not an official IELTS calculator.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-5">
          <h3 className="text-[16px] font-bold text-[#1a1f36] mb-4">Task 1 + Task 2 (weighted)</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <BandSelect id="calc-t1" label="Task 1 band" value={task1} onChange={setTask1} />
            <BandSelect id="calc-t2" label="Task 2 band" value={task2} onChange={setTask2} />
          </div>
          <p className="text-[13px] text-[#6B7280] mb-3 m-0">
            Formula: (Task 1 + 2 × Task 2) ÷ 3, rounded to the nearest 0.5
          </p>
          <div className="rounded-[12px] bg-[#1a1f36] text-white px-4 py-3">
            <p className="text-[12px] uppercase tracking-wide text-white/70 m-0 mb-1">Estimated Writing band</p>
            <p className="text-[28px] font-extrabold m-0 font-['Nunito',_sans-serif]">
              {writingBand != null ? writingBand.toFixed(1) : '—'}
            </p>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-5">
          <h3 className="text-[16px] font-bold text-[#1a1f36] mb-4">One task: four criteria average</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <BandSelect id="calc-tr" label="TR / TA" value={tr} onChange={setTr} />
            <BandSelect id="calc-cc" label="Coherence" value={cc} onChange={setCc} />
            <BandSelect id="calc-lr" label="Lexical" value={lr} onChange={setLr} />
            <BandSelect id="calc-gra" label="Grammar" value={gra} onChange={setGra} />
          </div>
          <p className="text-[13px] text-[#6B7280] mb-3 m-0">
            Average of four criteria, rounded to the nearest 0.5. Raise the lowest criterion first.
          </p>
          <div className="rounded-[12px] bg-[#EFF6FF] border border-[#BFDBFE] px-4 py-3">
            <p className="text-[12px] uppercase tracking-wide text-[#3B82F6] m-0 mb-1">Estimated task band</p>
            <p className="text-[28px] font-extrabold text-[#1a1f36] m-0 font-['Nunito',_sans-serif]">
              {criterionBand != null ? criterionBand.toFixed(1) : '—'}
            </p>
            {lowest != null && (
              <p className="text-[13px] text-[#6B7280] m-0 mt-1">
                Lowest criterion: <strong className="text-[#1a1f36]">{lowest.toFixed(1)}</strong> — that is usually
                your practice priority.
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="text-[14px] text-[#6B7280] mt-5 mb-0">
        Want real criterion scores from your essay?{' '}
        <Link to="/ielts-essay-checker" className="text-[#3B82F6] font-semibold no-underline hover:underline">
          Check your essay free
        </Link>{' '}
        or read{' '}
        <Link to="/blog/how-ielts-writing-is-scored" className="text-[#3B82F6] font-semibold no-underline hover:underline">
          how IELTS writing is scored
        </Link>
        .
      </p>
    </section>
  );
}
