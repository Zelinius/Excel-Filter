
import React, { useState, useCallback, useMemo } from 'react';
import { DataRow, Statistics, AnalysisResult } from './types';
import { analyzeColumns, generateSummary } from './services/geminiService';
import DataTable from './components/DataTable';
import StatsCards from './components/StatsCards';

const App: React.FC = () => {
  const [data, setData] = useState<DataRow[]>([]);
  const [idsInput, setIdsInput] = useState<string>('');
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filteredData, setFilteredData] = useState<DataRow[]>([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiSuggestion, setAiSuggestion] = useState<AnalysisResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const stats: Statistics = useMemo(() => {
    const total = data.length;
    const filtered = filteredData.length;
    const removed = total - filtered;
    const rate = total > 0 ? Math.round((filtered / total) * 100) : 0;
    return { totalRows: total, filteredRows: filtered, removedRows: removed, matchRate: rate };
  }, [data, filteredData]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        // Strip UTF-8 BOM if present
        const cleanText = text.replace(/^\uFEFF/, '');
        parseCSV(cleanText);
      } catch (err) {
        console.error("File read error:", err);
        setImportError("Failed to read the file. Please ensure it's a valid text-based CSV.");
      }
    };
    reader.onerror = () => setImportError("Error reading file.");
    reader.readAsText(file);
    event.target.value = '';
  };

  /**
   * More robust CSV line splitter that handles quoted fields correctly
   */
  const splitCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let curVal = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          curVal += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(curVal.trim());
        curVal = "";
      } else {
        curVal += char;
      }
    }
    result.push(curVal.trim());
    return result;
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 1) {
      setImportError("The file appears to be empty.");
      return;
    }

    try {
      const headers = splitCSVLine(lines[0]);
      if (headers.length === 0 || (headers.length === 1 && headers[0] === "")) {
        throw new Error("No headers found in the first line.");
      }

      const rows: DataRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = splitCSVLine(lines[i]);
        const obj: DataRow = {};
        headers.forEach((header, index) => {
          // If the header name is empty, provide a fallback
          const h = header || `Column_${index + 1}`;
          obj[h] = values[index] !== undefined ? values[index] : '';
        });
        rows.push(obj);
      }

      if (rows.length === 0) {
        setImportError("No data rows found after headers.");
        return;
      }

      setData(rows);
      setIsFiltered(false);
      setFilteredData([]);
      setAiSummary('');
      setAiSuggestion(null);
      // Initialize filter column to the first non-empty header
      const firstHeader = headers.find(h => h.trim() !== '') || headers[0];
      setFilterColumn(firstHeader);
    } catch (err) {
      console.error("CSV Parse error:", err);
      setImportError("Failed to parse CSV structure. Check for inconsistent columns or quotes.");
    }
  };

  const handleIdListInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIdsInput(e.target.value);
  };

  const runFilter = () => {
    if (!filterColumn || data.length === 0) return;

    const idList = idsInput
      .split(/[\n,]/)
      .map(id => id.trim().toLowerCase())
      .filter(id => id !== '');

    if (idList.length === 0) {
      setFilteredData([]);
      setIsFiltered(false);
      return;
    }

    const result = data.filter(row => {
      const val = String(row[filterColumn] || '').toLowerCase().trim();
      return idList.includes(val);
    });

    setFilteredData(result);
    setIsFiltered(true);
    setAiSummary('');
  };

  const clearFilter = () => {
    setIsFiltered(false);
    setFilteredData([]);
    setAiSummary('');
  };

  const askAIForHelp = async () => {
    if (data.length === 0) return;
    setIsAnalyzing(true);
    
    const idListSample = idsInput
      .split(/[\n,]/)
      .map(id => id.trim())
      .filter(id => id !== '')
      .slice(0, 10);

    const result = await analyzeColumns(data.slice(0, 10), idListSample);
    setAiSuggestion(result);
    if (result.suggestedColumn) {
      setFilterColumn(result.suggestedColumn);
    }
    setIsAnalyzing(false);
  };

  const askAIForSummary = async () => {
    if (filteredData.length === 0) return;
    setIsSummarizing(true);
    const summary = await generateSummary(stats, filteredData);
    setAiSummary(summary);
    setIsSummarizing(false);
  };

  const downloadFilteredData = () => {
    const dataToExport = isFiltered ? filteredData : data;
    if (dataToExport.length === 0) return;
    
    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(row => headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', isFiltered ? 'filtered_results.csv' : 'full_dataset.csv');
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 py-4 px-8 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-file-excel text-xl"></i>
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Excel Filter <span className="text-blue-600">AI</span></h1>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={downloadFilteredData}
              disabled={data.length === 0}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <i className="fas fa-download mr-2"></i> Export {isFiltered ? 'Filtered' : 'All'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">1. Data Import</h2>
            <div className="space-y-4">
              <label className="block w-full cursor-pointer group">
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${importError ? 'border-red-300 bg-red-50' : 'border-gray-200 group-hover:border-blue-400'}`}>
                  <i className={`fas fa-cloud-upload-alt text-3xl mb-2 ${importError ? 'text-red-400' : 'text-gray-300 group-hover:text-blue-500'}`}></i>
                  <p className={`text-sm font-medium ${importError ? 'text-red-600' : 'text-gray-600'}`}>
                    {importError ? 'Import Failed' : 'Drop CSV file here'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                </div>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
              
              {importError && (
                <div className="p-3 bg-red-100 text-red-700 text-xs rounded-lg border border-red-200">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  {importError}
                </div>
              )}

              {data.length > 0 && !importError && (
                <div className="bg-blue-50 p-3 rounded-lg flex items-center text-blue-700 text-sm">
                  <i className="fas fa-check-circle mr-2"></i>
                  <span>Loaded {data.length.toLocaleString()} records</span>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">2. ID List</h2>
            <textarea
              className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none resize-none text-sm font-mono custom-scrollbar"
              placeholder="Paste IDs here (one per line or comma separated)..."
              value={idsInput}
              onChange={handleIdListInput}
            />
            {idsInput && !isFiltered && (
              <p className="mt-2 text-[10px] text-blue-500 font-bold uppercase tracking-tighter animate-pulse">
                <i className="fas fa-info-circle mr-1"></i> Ready to filter
              </p>
            )}
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">3. Filter Settings</h2>
              <button 
                onClick={askAIForHelp}
                disabled={data.length === 0 || isAnalyzing}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? <i className="fas fa-spinner fa-spin mr-1"></i> : <i className="fas fa-magic mr-1"></i>}
                AI Suggest Column
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Match against column</label>
                <select 
                  className={`w-full p-3 border rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 transition-all ${
                    aiSuggestion ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200 focus:ring-blue-400'
                  }`}
                  value={filterColumn}
                  onChange={(e) => setFilterColumn(e.target.value)}
                >
                  {data.length > 0 ? (
                    Object.keys(data[0]).map(h => <option key={h} value={h}>{h}</option>)
                  ) : (
                    <option value="">No data loaded</option>
                  )}
                </select>
              </div>

              {aiSuggestion && (
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 relative">
                  <button onClick={() => setAiSuggestion(null)} className="absolute top-2 right-2 text-green-300 hover:text-green-500">
                    <i className="fas fa-times-circle"></i>
                  </button>
                  <p className="text-[10px] text-green-800 font-bold mb-1 uppercase">AI Selection: {aiSuggestion.suggestedColumn}</p>
                  <p className="text-xs text-green-700 leading-tight">"{aiSuggestion.reasoning}"</p>
                </div>
              )}

              <div className="flex gap-2">
                <button 
                  onClick={runFilter}
                  disabled={data.length === 0}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:transform active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  <i className="fas fa-filter mr-2"></i> Apply Filter
                </button>
                {isFiltered && (
                  <button 
                    onClick={clearFilter}
                    className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                    title="Reset to full data"
                  >
                    <i className="fas fa-undo"></i>
                  </button>
                )}
              </div>
            </div>
          </section>
        </aside>

        <div className="lg:col-span-8">
          {data.length > 0 ? (
            <div className="space-y-6">
              {isFiltered && <StatsCards stats={stats} />}
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 min-h-[400px]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {isFiltered ? 'Filtered Results' : 'Full Dataset Preview'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {isFiltered ? 
                        `Found ${filteredData.length.toLocaleString()} matches from ${data.length.toLocaleString()} total records` : 
                        `Displaying all ${data.length.toLocaleString()} records`}
                    </p>
                  </div>
                  {isFiltered && filteredData.length > 0 && !aiSummary && (
                    <button 
                      onClick={askAIForSummary}
                      disabled={isSummarizing}
                      className="text-xs bg-indigo-50 px-4 py-2 rounded-full text-indigo-600 hover:bg-indigo-100 font-semibold flex items-center transition-all border border-indigo-100"
                    >
                      {isSummarizing ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-sparkles mr-2 text-yellow-500"></i>}
                      Generate Result Summary
                    </button>
                  )}
                </div>

                {aiSummary && (
                  <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 text-blue-200/50">
                      <i className="fas fa-brain text-5xl translate-x-4 -translate-y-4"></i>
                    </div>
                    <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center">
                      <i className="fas fa-robot mr-2"></i> AI Data Insight
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed relative z-10">
                      {aiSummary}
                    </p>
                  </div>
                )}

                {isFiltered && filteredData.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                      <i className="fas fa-search-minus text-2xl text-gray-300"></i>
                    </div>
                    <h4 className="text-lg font-bold text-gray-800 mb-1">No matching records</h4>
                    <p className="text-sm text-gray-400 max-w-xs mx-auto">
                      No IDs from your list were found in the "{filterColumn}" column. Check your ID formatting or try a different target column.
                    </p>
                    <button 
                      onClick={clearFilter}
                      className="mt-4 text-sm text-blue-600 font-semibold hover:underline"
                    >
                      Show full dataset
                    </button>
                  </div>
                ) : (
                  <DataTable data={isFiltered ? filteredData : data} />
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-table text-4xl text-gray-200"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Ready to filter your data?</h3>
              <p className="text-gray-400 max-w-sm">
                Upload a CSV file and paste your list of IDs on the left to get started. 
                Our AI will help you identify the right columns and summarize your findings.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 px-8 text-center text-xs text-gray-400">
        <p>&copy; 2024 Excel ID Filter AI Assistant. Optimized for large datasets.</p>
      </footer>
    </div>
  );
};

export default App;
