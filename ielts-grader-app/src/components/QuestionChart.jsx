import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

// ── Deterministic seeding ─────────────────────────────────────────────────────
function hashStr(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}

function seededInt(h, salt, min, max) {
  const v = ((h * (salt + 1) * 2654435761) >>> 0);
  return min + (v % (max - min + 1));
}

// ── Text-derived chart parameters ─────────────────────────────────────────────
// Charts are synthetic (no real dataset is attached to imported questions), but
// we pull whatever hints exist in the prompt so the legend/labels feel grounded
// instead of generic "Jan–Jun" placeholders on every single chart.
function extractEntities(seed, fallback) {
  const stop = '(?:between|from|since|during|among|across|over|within|as|where|which|that)';
  const entityWord = `[A-Z][A-Za-z.&'-]*(?:\\s(?!${stop}\\b)[A-Za-z.&'-]+){0,2}`;
  const re = new RegExp(`(?:in|for|among|across)\\s+(${entityWord}(?:,\\s*${entityWord})*(?:,?\\s+and\\s+${entityWord})?)`);
  const match = seed.match(re);
  if (!match) return fallback;
  const parts = match[1]
    .split(/,\s*|\s+and\s+/)
    .map((s) => s.trim())
    .filter((s) => s && s.length <= 24 && !/\d/.test(s) && s.split(' ').length <= 3);
  return parts.length >= 2 ? parts.slice(0, 4) : fallback;
}

function extractYears(seed, fallback) {
  const matches = seed.match(/\b(19|20)\d{2}\b/g) || [];
  const unique = [...new Set(matches)];
  return unique.length >= 2 ? unique.slice(0, 2) : fallback;
}

const COUNT_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
function extractRowCount(seed, fallback = 4) {
  const match = seed
    .toLowerCase()
    .match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b\s+(?:world\s+)?(?:countries|cities|regions|categories|groups|areas|classes|sectors|stages)\b/);
  if (!match) return fallback;
  return COUNT_WORDS[match[1]] || fallback;
}

// ── Data generators ───────────────────────────────────────────────────────────
function makeLineData(seed) {
  const h = hashStr(seed);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  return months.map((month, i) => ({
    month,
    Coherence: Math.min(94, Math.max(22,
      seededInt(h, i + 1, 28, 68) + Math.round(Math.sin(i * 0.9 + (h % 6)) * 16),
    )),
    Vocabulary: Math.min(96, Math.max(30,
      seededInt(h + 1, i + 1, 44, 88) + Math.round(Math.cos(i * 0.7 + (h % 4)) * 20),
    )),
  }));
}

function makeBarData(seed) {
  const h = hashStr(seed);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const colors = ['#8B5CF6', '#EF4444', '#3B82F6', '#F59E0B', '#14B8A6', '#22C55E'];
  return months.map((month, i) => ({
    month,
    value: seededInt(h, (i + 1) * 7, 10, 98),
    color: colors[i],
  }));
}

function makePieData(seed) {
  const h = hashStr(seed);
  const a = 44 + seededInt(h, 3, 0, 12);
  const b = 16 + seededInt(h, 7, 0, 8);
  const c = 12 + seededInt(h, 11, 0, 7);
  const d = Math.max(5, 100 - a - b - c);
  const colors = ['#94A3B8', '#BFDBFE', '#60A5FA', '#3B82F6'];
  return {
    segments: [a, b, c, d].map((value, i) => ({ value, color: colors[i] })),
    center: String(4 + (h % 6)),
  };
}

function makeGroupedBarData(seed, entities) {
  const h = hashStr(seed);
  const categories = ['Group 1', 'Group 2', 'Group 3', 'Group 4'];
  return categories.map((category, ci) => {
    const row = { category };
    let sum = 0;
    entities.forEach((label, ei) => {
      const value = seededInt(h, (ci + 1) * 13 + (ei + 1) * 5, 15, 95);
      row[label] = value;
      sum += value;
    });
    row.__avg = Math.round(sum / entities.length);
    return row;
  });
}

function makeMixedData(seed) {
  const h = hashStr(seed);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, i) => ({
    month,
    volume: seededInt(h, (i + 1) * 4, 20, 90),
    rate: seededInt(h + 2, (i + 1) * 6, 15, 80),
  }));
}

// ── Chart type detection from question text ───────────────────────────────────
export function detectChartType(prompt = '') {
  const t = prompt.toLowerCase();

  if (t.includes('two pie charts') || t.includes('pie charts')) return 'pieComparative';
  if (t.includes('pie chart')) return 'pie';
  if (/\bthe table\b/.test(t) || /\btable\s+(below|shows|illustrates|highlights|provides|compares|depicts)\b/.test(t)) return 'table';
  if (t.includes('mixed chart')) return 'mixed';
  if (t.includes('grouped bar chart')) return 'groupedBar';
  if (t.includes('time-series bar chart')) {
    return (t.includes('by mode') || t.includes('different modes')) ? 'groupedBar' : 'bar';
  }
  if (t.includes('bar chart') || t.includes('bar graph')) return 'bar';
  if (
    t.includes('graph') ||
    t.includes('line graph') ||
    (t.includes('between') && (t.includes('year') || t.includes('decade'))) ||
    (t.includes('over') && t.includes('year'))
  ) return 'line';
  if (
    t.includes('proportion') &&
    (t.includes('purpose') || t.includes('sector') || t.includes('six area') || t.includes('areas of'))
  ) return 'pie';
  if (t.includes('proportion') || (t.includes('percentage') && t.includes('different'))) return 'bar';
  return 'bar';
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#101828',
      color: '#fff',
      fontSize: 13,
      fontWeight: 700,
      padding: '5px 12px',
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    }}>
      {payload.map((p) => (
        <div key={p.dataKey}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

// ── Line chart ────────────────────────────────────────────────────────────────
function LineChartView({ data }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -22, bottom: 4 }}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<DarkTooltip />} cursor={false} />
        <Legend
          iconType="circle"
          iconSize={10}
          wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
        />
        <Line
          type="monotone"
          dataKey="Coherence"
          stroke="#4ECDC4"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 7, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="Vocabulary"
          stroke="#818CF8"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 7, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChartView({ data }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -22, bottom: 4 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<DarkTooltip />} cursor={false} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={`bar-${i}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Grouped bar chart with an overlaid average line ───────────────────────────
function GroupedBarChartView({ data, entities }) {
  const colors = ['#8B5CF6', '#3B82F6', '#F59E0B', '#22C55E'];
  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: -22, bottom: 4 }} barCategoryGap="24%">
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<DarkTooltip />} cursor={false} />
        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
        {entities.map((label, i) => (
          <Bar key={label} dataKey={label} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} barSize={16} />
        ))}
        <Line
          type="monotone"
          dataKey="__avg"
          name="Average"
          stroke="#101828"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={{ r: 3, fill: '#101828' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Mixed bar + line combo chart ──────────────────────────────────────────────
function MixedChartView({ data }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: -22, bottom: 4 }}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<DarkTooltip />} cursor={false} />
        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
        <Bar dataKey="volume" name="Total" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={22} />
        <Line type="monotone" dataKey="rate" name="Rate (%)" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Pie / donut chart ─────────────────────────────────────────────────────────
function PieChartView({ data }) {
  const { segments, center } = data;
  const RADIAN = Math.PI / 180;

  const renderLabel = ({ cx, cy, midAngle, outerRadius, value }) => {
    const r = outerRadius + 24;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="#6B7280"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
      >
        {value}%
      </text>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 250 }}>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={segments}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            dataKey="value"
            labelLine={false}
            label={renderLabel}
            paddingAngle={2}
          >
            {segments.map((seg, i) => (
              <Cell key={`seg-${i}`} fill={seg.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 36, fontWeight: 700, color: '#1F2937' }}>{center}</span>
      </div>
    </div>
  );
}

// ── Two comparative pie charts (e.g. "spending in 2005 and 2015") ─────────────
function PieComparativeView({ seed }) {
  const [yearA, yearB] = extractYears(seed, ['Period A', 'Period B']);
  const dataA = makePieData(`${seed}-a`);
  const dataB = makePieData(`${seed}-b`);
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="text-center">
        <PieChartView data={dataA} />
        <div className="text-[12px] font-bold text-gray-600 mt-1">{yearA}</div>
      </div>
      <div className="text-center">
        <PieChartView data={dataB} />
        <div className="text-[12px] font-bold text-gray-600 mt-1">{yearB}</div>
      </div>
    </div>
  );
}

// ── Data table (e.g. "the table below highlights...") ────────────────────────
function TableView({ seed }) {
  const h = hashStr(seed);
  const rowCount = extractRowCount(seed, 4);
  const cellStyle = { padding: '8px 10px', border: '1px solid #E5E7EB', textAlign: 'left' };
  const headStyle = { ...cellStyle, background: '#F3F4F6', fontWeight: 700, color: '#374151' };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: '#374151' }}>
        <thead>
          <tr>
            <th style={headStyle}>Category</th>
            <th style={headStyle}>Value A</th>
            <th style={headStyle}>Value B</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }, (_, i) => (
            <tr key={i} style={{ background: i % 2 ? '#F9FAFB' : '#fff' }}>
              <td style={cellStyle}>{`Category ${i + 1}`}</td>
              <td style={cellStyle}>{seededInt(h, (i + 1) * 3, 10, 95)}</td>
              <td style={cellStyle}>{seededInt(h, (i + 1) * 7, 10, 95)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
const QuestionChart = ({ type, seed = '' }) => {
  const wrapper = 'bg-[#F3F4F6] rounded-[12px] p-3';

  if (type === 'line') return <div className={wrapper}><LineChartView data={makeLineData(seed)} /></div>;
  if (type === 'bar') return <div className={wrapper}><BarChartView data={makeBarData(seed)} /></div>;
  if (type === 'pie') return <div className={wrapper}><PieChartView data={makePieData(seed)} /></div>;
  if (type === 'groupedBar') {
    const entities = extractEntities(seed, ['Group A', 'Group B', 'Group C']);
    return <div className={wrapper}><GroupedBarChartView data={makeGroupedBarData(seed, entities)} entities={entities} /></div>;
  }
  if (type === 'mixed') return <div className={wrapper}><MixedChartView data={makeMixedData(seed)} /></div>;
  if (type === 'pieComparative') return <div className={wrapper}><PieComparativeView seed={seed} /></div>;
  if (type === 'table') return <div className={wrapper}><TableView seed={seed} /></div>;
  return null;
};

export default QuestionChart;
