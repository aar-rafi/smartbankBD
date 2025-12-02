import { ChequeData } from "../../../shared/types";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper to compute SHA-256 hash of the image data
async function computeImageHash(base64Image: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(base64Image);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export const analyzeChequeImage = async (base64Image: string, mimeType: string): Promise<ChequeData> => {
  try {
    // 1. Check Cache
    const imageHash = await computeImageHash(base64Image);
    const cacheKey = `cheque_analysis_${imageHash}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      console.log("Returning cached analysis result");
      return JSON.parse(cachedData);
    }

    // 2. Call API if not cached
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

    // 3. Save to Cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result.data));
    } catch (e) {
      console.warn("Failed to save to cache (likely quota exceeded):", e);
    }

    return result.data;
  } catch (error) {
    console.error("Analysis error:", error);
    throw error;
  }
};