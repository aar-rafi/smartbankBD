import { ChequeData } from "../../../shared/types";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const analyzeChequeImage = async (base64Image: string, mimeType: string): Promise<ChequeData> => {
  try {
    const response = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image, mimeType }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Analysis failed');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Analysis error:", error);
    throw error;
  }
};