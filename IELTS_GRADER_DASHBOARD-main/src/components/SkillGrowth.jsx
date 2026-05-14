import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Frown } from 'lucide-react';
import { motion } from 'framer-motion';

const data = [
  { name: 'W1', overall: 6.6, response: 6.1, coherence: 5.8, vocabulary: 7.2, grammar: 6.3 },
  { name: '', overall: 7.1, response: 6.6, coherence: 6.3, vocabulary: 7.7, grammar: 6.8 },
  { name: 'W2', overall: 6.7, response: 6.2, coherence: 5.9, vocabulary: 7.3, grammar: 6.4 },
  { name: '', overall: 7.8, response: 7.3, coherence: 7.0, vocabulary: 8.4, grammar: 7.5 },
  { name: 'W3', overall: 7.3, response: 6.8, coherence: 6.5, vocabulary: 7.9, grammar: 7.0 },
  { name: '', overall: 7.9, response: 7.4, coherence: 7.1, vocabulary: 8.4, grammar: 7.6 },
  { name: 'W4', overall: 7.6, response: 7.1, coherence: 6.8, vocabulary: 8.1, grammar: 7.3 },
  { name: '', overall: 7.8, response: 7.3, coherence: 7.0, vocabulary: 8.3, grammar: 7.5 },
  { name: 'W5', overall: 8.2, response: 7.7, coherence: 7.4, vocabulary: 8.7, grammar: 7.9 },
  { name: '', overall: 7.4, response: 6.9, coherence: 6.6, vocabulary: 7.9, grammar: 7.1 },
  { name: 'W6', overall: 7.9, response: 7.4, coherence: 7.1, vocabulary: 8.4, grammar: 7.6 },
  { name: '', overall: 6.4, response: 5.9, coherence: 5.6, vocabulary: 6.9, grammar: 6.1 },
  { name: 'W7', overall: 7.9, response: 7.4, coherence: 7.1, vocabulary: 8.4, grammar: 7.6 },
  { name: '', overall: 7.3, response: 6.8, coherence: 6.5, vocabulary: 7.8, grammar: 7.0 },
  { name: 'W8', overall: 8.1, response: 7.6, coherence: 7.3, vocabulary: 8.6, grammar: 7.8 },
];

const SkillGrowth = ({ hasData = true }) => {
  if (!hasData) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="card h-[400px] md:h-[500px] flex flex-col p-6 md:p-8"
      >
        <div className="mb-6">
          <h2 className="text-lg font-bold">Skill Growth</h2>
          <p className="text-sm text-gray-500">Visually map out how your criteria scores have evolved across your attempts.</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex flex-col items-center justify-center gap-1.5 opacity-50">
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
            </div>
            <div className="w-6 h-0.5 bg-gray-400 rounded-full"></div>
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
      className="card border-none shadow-none p-0 overflow-hidden"
    >
      <div className="mb-8">
        <h2 className="text-lg font-bold">Skill Growth</h2>
        <p className="text-sm text-gray-500 max-w-[500px]">Visually map out how your criteria scores have evolved across your attempts.</p>
      </div>
      
      <div className="h-[300px] md:h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
            <defs>
              <filter id="shadow" height="200%" width="200%" x="-50%" y="-50%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                <feOffset in="blur" dx="0" dy="6" result="offsetBlur" />
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
              tick={{ fontSize: 11, fill: '#101828', fontWeight: 500 }}
              dy={15}
            />
            <YAxis 
              domain={[5.5, 9.0]} 
              ticks={[5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#101828', fontWeight: 500 }}
              dx={5}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px', fontSize: '12px' }}
            />
            <Line type="monotone" dataKey="vocabulary" stroke="#8B5CF6" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
            <Line type="monotone" dataKey="overall" stroke="#EF4444" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
            <Line type="monotone" dataKey="grammar" stroke="#3B82F6" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
            <Line type="monotone" dataKey="response" stroke="#F59E0B" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
            <Line type="monotone" dataKey="coherence" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} style={{ filter: 'url(#shadow)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-8 md:mt-12 flex flex-wrap justify-start sm:justify-center gap-x-6 md:gap-x-10 gap-y-3 text-[11px] md:text-[12px] font-bold text-[#101828]">
         <div className="flex items-center gap-2">
           <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0"></div> Overall Band
         </div>
         <div className="flex items-center gap-2">
           <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0"></div> Task Response
         </div>
         <div className="flex items-center gap-2">
           <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0"></div> Coherence
         </div>
         <div className="flex items-center gap-2">
           <div className="w-2.5 h-2.5 rounded-full bg-[#A855F7] shrink-0"></div> Vocabulary
         </div>
         <div className="flex items-center gap-2">
           <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shrink-0"></div> Grammar
         </div>
      </div>
    </motion.div>
  );
};

export default SkillGrowth;
