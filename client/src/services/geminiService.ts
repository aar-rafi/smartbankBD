import { ChequeData } from "../../../shared/types";

// Use relative /api path - Vite proxy handles forwarding to backend
const API_URL = '';

// Helper to compute hash of the image data
// Uses crypto.subtle if available (HTTPS), otherwise falls back to simple hash
async function computeImageHash(base64Image: string): Promise<string> {
  // Check if crypto.subtle is available (requires secure context/HTTPS)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(base64Image);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('crypto.subtle failed, using fallback hash');
    }
  }
  
  // Fallback: simple hash for non-secure contexts (HTTP)
  let hash = 0;
  const str = base64Image.slice(0, 10000); // Use first 10k chars for speed
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `fallback_${Math.abs(hash).toString(16)}_${base64Image.length}`;
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