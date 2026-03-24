
import React from 'react';
import { DataRow } from '../types';

interface DataTableProps {
  data: DataRow[];
  maxRows?: number;
}

const DataTable: React.FC<DataTableProps> = ({ data, maxRows = 50 }) => {
  if (data.length === 0) return null;

  const columns = Object.keys(data[0]);
  const displayData = data.slice(0, maxRows);

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {displayData.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > maxRows && (
        <div className="p-3 text-center bg-gray-50 text-xs text-gray-400 border-t border-gray-200">
          Showing first {maxRows} of {data.length} rows
        </div>
      )}
    </div>
  );
};

export default DataTable;
