
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, DataRow } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeColumns = async (sampleData: DataRow[], idListSample: string[]): Promise<AnalysisResult> => {
  const columns = Object.keys(sampleData[0] || {});
  const dataString = JSON.stringify(sampleData.slice(0, 5));
  const idsString = idListSample.join(", ");

  const prompt = `
    I have a dataset with these columns: ${columns.join(", ")}.
    Here is a sample of the data: ${dataString}
    I want to filter this data using a list of IDs. Here is a sample of IDs I have: ${idsString}
    
    Which column in the dataset is most likely the "ID" column that should be used for filtering?
    Please respond in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedColumn: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
          },
          required: ["suggestedColumn", "confidence", "reasoning"],
        },
      },
    });

    return JSON.parse(response.text || "{}") as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      suggestedColumn: columns[0] || "",
      confidence: 0,
      reasoning: "Error communicating with AI assistant."
    };
  }
};

export const generateSummary = async (stats: any, filteredSample: DataRow[]): Promise<string> => {
  const prompt = `
    Synthesize a quick executive summary for these filtering results:
    - Total Rows: ${stats.totalRows}
    - Filtered Rows: ${stats.filteredRows}
    - Match Rate: ${stats.matchRate}%
    
    Sample of filtered results: ${JSON.stringify(filteredSample.slice(0, 3))}
    
    Briefly explain what was found and if there are any obvious patterns (e.g., categories, dates, or common values).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "No summary available.";
  } catch (error) {
    return "Could not generate summary.";
  }
};
