
import React from 'react';
import { Statistics } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StatsCardsProps {
  stats: Statistics;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const chartData = [
    { name: 'Kept', value: stats.filteredRows, color: '#3b82f6' },
    { name: 'Removed', value: stats.removedRows, color: '#94a3b8' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-tight">Total Records</p>
        <p className="text-3xl font-bold text-gray-900">{stats.totalRows.toLocaleString()}</p>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <p className="text-sm text-blue-600 font-medium mb-1 uppercase tracking-tight">Matched Records</p>
        <p className="text-3xl font-bold text-blue-700">{stats.filteredRows.toLocaleString()}</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-400 font-medium mb-1 uppercase tracking-tight">Match Rate</p>
        <p className="text-3xl font-bold text-gray-600">{stats.matchRate}%</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
        <div className="h-24 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" hide />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
