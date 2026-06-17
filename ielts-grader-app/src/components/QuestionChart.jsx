import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
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

// ── Chart type detection from question text ───────────────────────────────────
export function detectChartType(prompt = '') {
  const t = prompt.toLowerCase();
  if (t.includes('bar chart') || t.includes('bar graph')) return 'bar';
  if (t.includes('pie chart')) return 'pie';
  if (
    t.includes('proportion') &&
    (t.includes('purpose') || t.includes('sector') || t.includes('six area') || t.includes('areas of'))
  ) return 'pie';
  if (
    t.includes('graph') ||
    t.includes('line graph') ||
    (t.includes('between') && (t.includes('year') || t.includes('decade'))) ||
    (t.includes('over') && t.includes('year'))
  ) return 'line';
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
      {payload[0]?.value}
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
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={`bar-${i}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
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

// ── Main export ───────────────────────────────────────────────────────────────
const QuestionChart = ({ type, seed }) => {
  const wrapper = 'bg-[#F3F4F6] rounded-[12px] p-3';
  if (type === 'line') return <div className={wrapper}><LineChartView data={makeLineData(seed)} /></div>;
  if (type === 'bar')  return <div className={wrapper}><BarChartView  data={makeBarData(seed)}  /></div>;
  if (type === 'pie')  return <div className={wrapper}><PieChartView  data={makePieData(seed)}  /></div>;
  return null;
};

export default QuestionChart;
