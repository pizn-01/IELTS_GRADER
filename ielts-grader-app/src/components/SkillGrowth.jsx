import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Frown } from 'lucide-react';
import { motion } from 'framer-motion';

const defaultData = [
  { name: 'W1', overall: 6.6, response: 6.1, coherence: 5.8, vocabulary: 7.2, grammar: 6.3 },
  { name: 'W2', overall: 7.8, response: 7.3, coherence: 7.0, vocabulary: 8.4, grammar: 7.5 },
  { name: 'W3', overall: 7.4, response: 6.9, coherence: 6.6, vocabulary: 8.0, grammar: 7.1 },
  { name: 'W4', overall: 7.6, response: 7.1, coherence: 6.8, vocabulary: 8.2, grammar: 7.3 },
  { name: 'W5', overall: 8.2, response: 7.7, coherence: 7.4, vocabulary: 8.8, grammar: 7.9 },
  { name: 'W6', overall: 8.0, response: 7.5, coherence: 7.2, vocabulary: 8.6, grammar: 7.7 },
  { name: 'W7', overall: 8.0, response: 7.5, coherence: 7.2, vocabulary: 8.6, grammar: 7.7 },
  { name: 'W8', overall: 8.2, response: 7.7, coherence: 7.4, vocabulary: 8.8, grammar: 7.9 },
];

const SkillGrowth = ({ hasData = true, rawSeriesData = null, isLoading = false }) => {
  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 md:p-8 overflow-hidden bg-white min-h-[400px] flex flex-col justify-center items-center"
      >
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading skill growth...</p>
      </motion.div>
    );
  }

  let chartSeries = defaultData;
  if (rawSeriesData && rawSeriesData.length > 0) {
    chartSeries = rawSeriesData.map((d, i) => ({
      ...d,
      overall: d.overall || 0,
      vocabulary: d.vocabulary || 0,
      grammar: d.grammar || 0,
      response: d.response || 0,
      coherence: d.coherence || 0,
      x: d.x !== undefined ? d.x : i + 1,
    }));
  }

  if (!hasData) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="card min-h-[400px] flex flex-col p-6 md:p-8 bg-white"
      >
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#1a1f36]">Skill Growth</h2>
          <p className="text-sm text-gray-500">Visually map out how your criteria scores have evolved across your attempts.</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
          <div className="w-16 h-16 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50">
            <Frown size={32} className="text-gray-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium">No data to display yet</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="card p-6 md:p-8 overflow-hidden bg-white"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="text-lg font-bold text-[#1a1f36]">Skill Growth</h2>
          <p className="text-sm text-gray-500 max-w-[500px]">Visually map out how your criteria scores have evolved across your attempts.</p>
        </div>
      </div>
      
      <div className="h-[300px] md:h-[400px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartSeries} margin={{ top: 10, right: 20, left: -10, bottom: 30 }}>
            <defs>
              <filter id="shadow" height="200%" width="200%" x="-50%" y="-50%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="blur" />
                <feOffset in="blur" dx="0" dy="4" result="offsetBlur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.15" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={true} horizontal={false} />
            <CartesianGrid stroke="#F1F5F9" vertical={false} horizontal={true} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
              dy={15}
            />
            <YAxis 
              domain={[0, 9]} 
              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
              interval={0}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
              dx={-10}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                padding: '12px', 
                fontSize: '12px',
                backgroundColor: '#fff'
              }}
              cursor={{ stroke: '#F1F5F9', strokeWidth: 2 }}
            />
            
            <Line type="monotone" dataKey="coherence" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
            <Line type="monotone" dataKey="response" stroke="#F59E0B" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
            <Line type="monotone" dataKey="grammar" stroke="#3B82F6" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
            <Line type="monotone" dataKey="overall" stroke="#EF4444" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
            <Line type="monotone" dataKey="vocabulary" stroke="#8B5CF6" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-12 flex flex-wrap justify-center gap-x-10 md:gap-x-14 gap-y-4 text-[12px] font-bold text-[#101828]">
         <div className="flex items-center gap-3">
           <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0"></div> Overall Band
         </div>
         <div className="flex items-center gap-3">
           <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0"></div> Task Response
         </div>
         <div className="flex items-center gap-3">
           <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0"></div> Coherence
         </div>
         <div className="flex items-center gap-3">
           <div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shrink-0"></div> Vocabulary
         </div>
         <div className="flex items-center gap-3">
           <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shrink-0"></div> Grammar
         </div>
      </div>
    </motion.div>
  );
};

export default SkillGrowth;
