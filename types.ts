
export interface DataRow {
  [key: string]: any;
}

export interface AnalysisResult {
  suggestedColumn: string;
  confidence: number;
  reasoning: string;
}

export interface Statistics {
  totalRows: number;
  filteredRows: number;
  removedRows: number;
  matchRate: number;
}
