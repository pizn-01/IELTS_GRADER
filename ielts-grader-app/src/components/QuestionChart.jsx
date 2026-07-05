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

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// ── Text-derived chart parameters ─────────────────────────────────────────────
// Charts are synthetic (imported questions carry no dataset), but every label —
// series names, x-axis ticks, table headers — is pulled from the question text
// so the visual matches what the prompt describes.

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function extractEntities(seed, fallback) {
  const stop = '(?:between|from|since|during|among|across|over|within|as|where|which|that)';
  const entityWord = `(?:the\\s+)?[A-Z][A-Za-z.&'-]*(?:\\s(?!${stop}\\b)[A-Za-z.&'-]+){0,2}`;
  const re = new RegExp(`(?:in|for|among|across)\\s+(${entityWord}(?:,\\s*${entityWord})*(?:,?\\s+and\\s+${entityWord})?)`);
  const match = seed.match(re);
  if (!match) return fallback;
  const parts = match[1]
    .split(/,\s*|\s+and\s+/)
    .map((s) => s.replace(/^the\s+/i, '').trim())
    .filter((s) => s && s.length <= 24 && !/\d/.test(s) && s.split(' ').length <= 3);
  return parts.length >= 2 ? parts.slice(0, 4) : fallback;
}

// "between 1990 and 2015" / "from 2001 to 2018" → evenly spaced year ticks
function extractYearTicks(seed, count) {
  const years = (seed.match(/\b(?:19|20)\d{2}\b/g) || []).map(Number);
  if (years.length < 2) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  if (max - min < count - 1) return null;
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => String(Math.round(min + step * i)));
}

// "shows literacy rates and primary school completion percentages in ..." →
// ['Literacy rates', 'Primary school completion percentages']
function extractMeasures(seed, fallback) {
  const m = seed.match(
    /(?:shows|illustrates|highlights|compares|depicts|provides information about)\s+(?:the\s+)?(.+?)\s+(?:in|for|across|among|between|by|using)\s/i
  );
  if (!m) return fallback;
  const parts = m[1]
    .split(/\s+and\s+(?:the\s+)?/i)
    .map((s) => s.trim())
    .filter((s) => s && s.length <= 48);
  if (parts.length >= 2) return [capitalize(parts[0]), capitalize(parts[1])];
  if (parts.length === 1) return [capitalize(parts[0]), fallback[1]];
  return fallback;
}

const COUNT_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
function extractRowCount(seed, fallback = 4) {
  const match = seed
    .toLowerCase()
    .match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b\s+(?:world\s+)?(?:countries|cities|regions|categories|groups|areas|classes|sectors|stages|nations)\b/);
  if (!match) return fallback;
  return COUNT_WORDS[match[1]] || fallback;
}

// Domain-specific group labels for prompts that name their series implicitly
function extractGroupLabels(seed, fallback) {
  const t = seed.toLowerCase();
  if (t.includes('by mode') || t.includes('different modes') || t.includes('travel modes')) {
    return ['Car', 'Bus', 'Train', 'Bicycle'];
  }
  if (t.includes('by gender')) return ['Male', 'Female'];
  if (t.includes('age group') || t.includes('age groups')) return ['18–30', '31–50', '51+'];
  return extractEntities(seed, fallback);
}

const SERIES_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

// ── Data generators ───────────────────────────────────────────────────────────
// Each entity gets a base level + trend slope so lines/bars look like real
// time-series data rather than random noise.
function makeTrendSeries(seed, entities, ticks) {
  const h = hashStr(seed);
  return ticks.map((tick, i) => {
    const row = { tick };
    entities.forEach((label, j) => {
      const base = seededInt(h, j * 17 + 3, 25, 60);
      const slope = seededInt(h, j * 29 + 7, -5, 8);
      const noise = seededInt(h, i * 7 + j * 13, -5, 5);
      row[label] = clamp(base + slope * i + noise, 5, 95);
    });
    return row;
  });
}

function makeSingleSeries(seed, ticks) {
  const h = hashStr(seed);
  const slope = seededInt(h, 5, -4, 9);
  return ticks.map((tick, i) => ({
    tick,
    value: clamp(seededInt(h, 11, 25, 55) + slope * i + seededInt(h, (i + 1) * 7, -6, 6), 8, 96),
  }));
}

function makePieData(seed) {
  const h = hashStr(seed);
  const a = 44 + seededInt(h, 3, 0, 12);
  const b = 16 + seededInt(h, 7, 0, 8);
  const c = 12 + seededInt(h, 11, 0, 7);
  const d = Math.max(5, 100 - a - b - c);
  const colors = ['#94A3B8', '#BFDBFE', '#60A5FA', '#3B82F6'];
  const labels = ['Category A', 'Category B', 'Category C', 'Category D'];
  return [a, b, c, d].map((value, i) => ({ name: labels[i], value, color: colors[i] }));
}

function makeGroupedBarData(seed, entities, categories) {
  const h = hashStr(seed);
  return categories.map((category, ci) => {
    const row = { category };
    let sum = 0;
    entities.forEach((label, ei) => {
      const value = seededInt(h, (ci + 1) * 13 + (ei + 1) * 5, 15, 95);
      row[label] = value;
      sum += value;
    });
    row.Average = Math.round(sum / entities.length);
    return row;
  });
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
      fontSize: 12,
      fontWeight: 700,
      padding: '6px 12px',
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    }}>
      {payload.map((p) => (
        <div key={p.dataKey}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

const axisTickStyle = { fontSize: 11, fill: '#9CA3AF' };
const legendStyle = { fontSize: 11, paddingTop: 6 };

// ── Multi-line chart (entities over years) ────────────────────────────────────
function LineChartView({ seed }) {
  const entities = extractEntities(seed, ['Series A', 'Series B', 'Series C']);
  const ticks = extractYearTicks(seed, 6) || ['2000', '2004', '2008', '2012', '2016', '2020'];
  const data = makeTrendSeries(seed, entities, ticks);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -22, bottom: 4 }}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="tick" tick={axisTickStyle} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<DarkTooltip />} cursor={false} />
        <Legend iconType="circle" iconSize={10} wrapperStyle={legendStyle} />
        {entities.map((label, i) => (
          <Line
            key={label}
            type="monotone"
            dataKey={label}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Single-series bar chart (values over years) ───────────────────────────────
function BarChartView({ seed }) {
  const [measure] = extractMeasures(seed, ['Value', 'Value']);
  const ticks = extractYearTicks(seed, 6) || ['2000', '2004', '2008', '2012', '2016', '2020'];
  const data = makeSingleSeries(seed, ticks);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -22, bottom: 4 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="tick" tick={axisTickStyle} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<DarkTooltip />} cursor={false} />
        <Legend iconType="circle" iconSize={10} wrapperStyle={legendStyle} />
        <Bar dataKey="value" name={measure} fill="#3B82F6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Grouped bar chart with an overlaid average line ───────────────────────────
function GroupedBarChartView({ seed }) {
  const entities = extractGroupLabels(seed, ['Group A', 'Group B', 'Group C']);
  const categories = extractYearTicks(seed, 4) || ['Category 1', 'Category 2', 'Category 3', 'Category 4'];
  const data = makeGroupedBarData(seed, entities, categories);
  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: -22, bottom: 4 }} barCategoryGap="24%">
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="category" tick={axisTickStyle} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<DarkTooltip />} cursor={false} />
        <Legend iconType="circle" iconSize={10} wrapperStyle={legendStyle} />
        {entities.map((label, i) => (
          <Bar key={label} dataKey={label} fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={[4, 4, 0, 0]} barSize={16} />
        ))}
        <Line
          type="monotone"
          dataKey="Average"
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
function MixedChartView({ seed }) {
  const [barName, lineName] = extractMeasures(seed, ['Total volume', 'Rate (%)']);
  const ticks = extractYearTicks(seed, 6) || ['2000', '2004', '2008', '2012', '2016', '2020'];
  const h = hashStr(seed);
  const data = ticks.map((tick, i) => ({
    tick,
    [barName]: clamp(seededInt(h, 11, 30, 60) + seededInt(h, 5, -3, 7) * i + seededInt(h, (i + 1) * 4, -5, 5), 10, 95),
    [lineName]: clamp(seededInt(h + 2, 13, 20, 50) + seededInt(h + 2, 5, -3, 7) * i + seededInt(h + 2, (i + 1) * 6, -5, 5), 5, 90),
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: -22, bottom: 4 }}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="tick" tick={axisTickStyle} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          tick={axisTickStyle}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<DarkTooltip />} cursor={false} />
        <Legend iconType="circle" iconSize={10} wrapperStyle={legendStyle} />
        <Bar dataKey={barName} fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={22} />
        <Line type="monotone" dataKey={lineName} stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Pie / donut chart with legend ─────────────────────────────────────────────
function PieChartView({ seed, title = null }) {
  const segments = makePieData(seed);
  const RADIAN = Math.PI / 180;

  const renderLabel = ({ cx, cy, midAngle, outerRadius, value }) => {
    const r = outerRadius + 18;
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
    <div>
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie
            data={segments}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            dataKey="value"
            nameKey="name"
            labelLine={false}
            label={renderLabel}
            paddingAngle={2}
          >
            {segments.map((seg, i) => (
              <Cell key={`seg-${i}`} fill={seg.color} />
            ))}
          </Pie>
          <Tooltip content={<DarkTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {title && <div className="text-center text-[12px] font-bold text-gray-600">{title}</div>}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
        {segments.map((seg) => (
          <span key={seg.name} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: seg.color }} />
            {seg.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Two comparative pie charts (e.g. "spending in 2005 and 2015") ─────────────
function PieComparativeView({ seed }) {
  const years = extractYearTicks(seed, 2) || ['Period A', 'Period B'];
  return (
    <div className="grid grid-cols-2 gap-3">
      <PieChartView seed={`${seed}-a`} title={years[0]} />
      <PieChartView seed={`${seed}-b`} title={years[1]} />
    </div>
  );
}

// ── Data table with headers derived from the prompt ───────────────────────────
function TableView({ seed }) {
  const h = hashStr(seed);
  const rowCount = extractRowCount(seed, 4);
  const measures = extractMeasures(seed, ['Value A', 'Value B']);
  const entities = extractEntities(seed, []);
  const rowLabels = Array.from({ length: rowCount }, (_, i) => entities[i] || `Category ${i + 1}`);

  const cellStyle = { padding: '8px 10px', border: '1px solid #E5E7EB', textAlign: 'left' };
  const headStyle = { ...cellStyle, background: '#F3F4F6', fontWeight: 700, color: '#374151' };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: '#374151' }}>
        <thead>
          <tr>
            <th style={headStyle}>Category</th>
            {measures.map((m) => <th key={m} style={headStyle}>{m}</th>)}
          </tr>
        </thead>
        <tbody>
          {rowLabels.map((label, i) => (
            <tr key={label} style={{ background: i % 2 ? '#F9FAFB' : '#fff' }}>
              <td style={{ ...cellStyle, fontWeight: 600 }}>{label}</td>
              <td style={cellStyle}>{seededInt(h, (i + 1) * 3, 10, 95)}</td>
              <td style={cellStyle}>{seededInt(h, (i + 1) * 7, 10, 95)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Real SVG chart (from the question bank's own chart data) ─────────────────
// Only ever fed markup stored on the exam_tasks row itself (server-controlled
// question bank, never user input) — but still reject anything that isn't a
// bare <svg>...</svg> as a safety net before it goes through
// dangerouslySetInnerHTML.
function isSafeSvg(markup) {
  return typeof markup === 'string' && /^\s*<svg[\s>]/i.test(markup) && !/<script/i.test(markup);
}

function SvgChartView({ svg }) {
  return (
    <div
      className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function ImageChartView({ src }) {
  return (
    <img src={src} alt="" className="max-w-full h-auto mx-auto block" />
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
const QuestionChart = ({ type, seed = '', svg = null, image = null }) => {
  const wrapper = 'bg-[#F3F4F6] rounded-[12px] p-3';

  if (isSafeSvg(svg)) return <div className={wrapper}><SvgChartView svg={svg} /></div>;

  if (image) return <div className={wrapper}><ImageChartView src={image} /></div>;

  if (type === 'line') return <div className={wrapper}><LineChartView seed={seed} /></div>;
  if (type === 'bar') return <div className={wrapper}><BarChartView seed={seed} /></div>;
  if (type === 'pie') return <div className={wrapper}><PieChartView seed={seed} /></div>;
  if (type === 'groupedBar') return <div className={wrapper}><GroupedBarChartView seed={seed} /></div>;
  if (type === 'mixed') return <div className={wrapper}><MixedChartView seed={seed} /></div>;
  if (type === 'pieComparative') return <div className={wrapper}><PieComparativeView seed={seed} /></div>;
  if (type === 'table') return <div className={wrapper}><TableView seed={seed} /></div>;
  return null;
};

export default QuestionChart;
