import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Frown } from 'lucide-react';
import { motion } from 'framer-motion';

const defaultData = [
  { name: 'W1', overall: 6.8, response: 6.3, coherence: 6.0, vocabulary: 7.4, grammar: 6.5 },
  { name: '1.5', overall: 7.2, response: 6.7, coherence: 6.4, vocabulary: 7.8, grammar: 6.9 },
  { name: 'W2', overall: 6.8, response: 6.3, coherence: 6.0, vocabulary: 7.4, grammar: 6.5 },
  { name: '2.5', overall: 8.0, response: 7.5, coherence: 7.2, vocabulary: 8.6, grammar: 7.7 },
  { name: 'W3', overall: 7.4, response: 6.9, coherence: 6.6, vocabulary: 8.0, grammar: 7.1 },
  { name: '3.5', overall: 8.0, response: 7.5, coherence: 7.2, vocabulary: 8.6, grammar: 7.7 },
  { name: 'W4', overall: 7.6, response: 7.1, coherence: 6.8, vocabulary: 8.2, grammar: 7.3 },
  { name: '4.5', overall: 7.8, response: 7.3, coherence: 7.0, vocabulary: 8.4, grammar: 7.5 },
  { name: 'W5', overall: 8.2, response: 7.7, coherence: 7.4, vocabulary: 8.8, grammar: 7.9 },
  { name: '5.5', overall: 7.6, response: 7.1, coherence: 6.8, vocabulary: 8.2, grammar: 7.3 },
  { name: 'W6', overall: 8.0, response: 7.5, coherence: 7.2, vocabulary: 8.6, grammar: 7.7 },
  { name: '6.5', overall: 6.4, response: 5.9, coherence: 5.6, vocabulary: 7.0, grammar: 6.1 },
  { name: 'W7', overall: 8.0, response: 7.5, coherence: 7.2, vocabulary: 8.6, grammar: 7.7 },
  { name: '7.5', overall: 7.6, response: 7.1, coherence: 6.8, vocabulary: 8.2, grammar: 7.3 },
  { name: 'W8', overall: 8.2, response: 7.7, coherence: 7.4, vocabulary: 8.8, grammar: 7.9 },
];

const SkillGrowth = ({ hasData = true, rawSeriesData = null }) => {
  const chartSeries = rawSeriesData?.length > 0 ? rawSeriesData : defaultData;

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
          <h2 className="text-lg font-bold">Skill Growth</h2>
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
          <h2 className="text-lg font-bold">Skill Growth</h2>
          <p className="text-sm text-gray-500 max-w-[500px]">Visually map out how your criteria scores have evolved across your attempts.</p>
        </div>
      </div>
      
      <div className="h-[300px] md:h-[400px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartSeries} margin={{ top: 10, right: 20, left: -20, bottom: 30 }}>
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
              ticks={['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']}
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
              dy={15}
            />
            <YAxis 
              domain={[5.5, 9.0]} 
              ticks={[5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
              dx={5}
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
            
            {/* Z-Index fix: bottom-to-top rendering to match Dashboard-2.png */}
            <Line type="monotone" dataKey="coherence" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
            <Line type="monotone" dataKey="response" stroke="#F59E0B" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
            <Line type="monotone" dataKey="grammar" stroke="#3B82F6" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
            <Line type="monotone" dataKey="overall" stroke="#EF4444" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
            <Line type="monotone" dataKey="vocabulary" stroke="#8B5CF6" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend refined to match Dashboard-2.png exactly */}
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
