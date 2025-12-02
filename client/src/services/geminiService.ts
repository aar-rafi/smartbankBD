import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ChequeData } from "../../../shared/types";

// Initialize the client
// API key must be provided via environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema 1: Field Extraction
const extractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    bankName: { type: Type.STRING, description: "Name of the bank printed on the cheque (top left)" },
    branchName: { type: Type.STRING, description: "Branch name of the bank (usually below bank name)" },
    routingNumber: { type: Type.STRING, description: "Routing number (usually below branch name)" },
    chequeNumber: { type: Type.STRING, description: "Cheque number (top right or bottom MICR)" },
    date: { type: Type.STRING, description: "Date on the cheque" },
    payeeName: { type: Type.STRING, description: "Name of the payee (Pay to...)" },
    amountWords: { type: Type.STRING, description: "Sum of taka in words" },
    amountDigits: { type: Type.NUMBER, description: "Sum of taka in digits" },
    accountHolderName: { type: Type.STRING, description: "Name of the account holder" },
    accountNumber: { type: Type.STRING, description: "Account number" },
    hasSignature: { type: Type.BOOLEAN, description: "True if a handwritten signature is present in the signature area, false otherwise" },
    micrCode: { type: Type.STRING, description: "Full MICR code line from the bottom of the cheque" },
  },
};

// Schema 2: Signature Localization
const signatureBoxSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    signatureBox: {
      type: Type.ARRAY,
      items: { type: Type.NUMBER },
      description: "Bounding box of the handwritten signature as [ymin, xmin, ymax, xmax] normalized to 0-1000. Example: [850, 600, 950, 900]. Returns null if no signature found."
    },
  },
};

// Schema 3: AI Detection
const aiDetectionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isAiGenerated: { type: Type.BOOLEAN, description: "True if the image contains SynthID watermarks, digital artifacts, or inconsistencies typical of AI-generated images." },
    synthIdConfidence: { type: Type.NUMBER, description: "Confidence score (0-100) that the image is AI-generated/contains SynthID." },
  },
  required: ["isAiGenerated", "synthIdConfidence"],
};

export const analyzeChequeImage = async (base64Image: string, mimeType: string): Promise<ChequeData> => {
  try {
    const modelId = "gemini-2.5-pro";

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    // Call 1: Extract Text Data
    const extractionPromise = ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          imagePart,
          {
            text: `Analyze this bank cheque image and extract the requested information into JSON format. 
            
            Be precise with extracting printed and handwritten text. 
            If a field is not present or illegible, return an empty string or null. Do not use placeholders like "N/A" or "Not Detected".
            
            For the 'micrCode', replace special characters like '|', ''', ':' with spaces in the output.
            
            For 'hasSignature', look specifically at the signature line area (usually bottom right) for handwritten ink markings.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
        systemInstruction: "You are an expert financial document processing AI.",
      },
    });

    // Call 2: Signature Bounding Box
    const signaturePromise = ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          imagePart,
          {
            text: `Identify the bounding box of the handwritten signature on this cheque. Return [ymin, xmin, ymax, xmax] normalized to 0-1000. If no signature is found, return null.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: signatureBoxSchema,
      },
    });

    // Call 3: AI Detection - ENHANCED
    const aiDetectionPromise = ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          imagePart,
          {
            text: `Analyze this cheque image thoroughly to determine if it is AI-generated or manipulated. Examine the following aspects:

1. PAPER TEXTURE & PHYSICAL CHARACTERISTICS:
   - Does the paper show natural fiber patterns and realistic texture?
   - Are there genuine wear marks, folds, or imperfections typical of real cheques?
   - Is the paper texture consistent across the entire image?

2. PRINTED TEXT ANALYSIS:
   - Is the bank's printed text sharp, consistent, and professionally printed?
   - Are there any unusual artifacts, blurring, or inconsistencies in printed text?
   - Does the font rendering look natural or artificially generated?

3. MICR CODE INSPECTION:
   - Does the MICR line at the bottom show authentic magnetic ink characteristics?
   - Are the MICR characters properly formed with correct spacing?
   - Look for digital artifacts or inconsistencies in MICR rendering

4. HANDWRITING & SIGNATURE:
   - Does handwritten text (date, amount, signature) show natural pen pressure variation?
   - Are there realistic ink flow patterns and natural imperfections?
   - Does the signature have authentic variation in line thickness?

5. VISUAL ARTIFACTS:
   - Check for AI generation artifacts: unnatural smoothing, pixel inconsistencies, compression anomalies
   - Look for telltale signs like: repeated patterns, symmetry where there shouldn't be, impossible details
   - Examine edges and boundaries for blending artifacts

6. LIGHTING & SHADOWS:
   - Are shadows and lighting consistent and physically plausible?
   - Check for inconsistent light sources or impossible shadow patterns

7. WATERMARKS & SECURITY FEATURES:
   - Examine for digital watermarks (SynthID, etc.) that indicate AI generation
   - Check if security features look authentic or artificially rendered

SCORING GUIDELINES:
- 0-20: Definitely authentic, all characteristics match real cheque
- 21-40: Likely authentic, minor irregularities but probably scanning/photo artifacts
- 41-60: Uncertain, some suspicious elements present
- 61-80: Likely AI-generated, multiple suspicious artifacts detected
- 81-100: Definitely AI-generated, clear artificial generation patterns

Be thorough and analytical. Do not default to false without genuine analysis. Consider the totality of evidence.

Return ONLY: { "isAiGenerated": boolean, "synthIdConfidence": number }`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: aiDetectionSchema,
        systemInstruction: "You are an expert forensic analyst specializing in detecting forged, synthetic, and AI-generated financial documents. You have deep knowledge of cheque security features, printing characteristics, and AI generation artifacts.",
      },
    });

    // Execute all calls in parallel
    const [extractionResponse, signatureResponse, aiResponse] = await Promise.all([
      extractionPromise,
      signaturePromise,
      aiDetectionPromise
    ]);

    // Parse Extraction Data
    const extractionText = extractionResponse.text;
    if (!extractionText) throw new Error("No response from extraction model");
    const extractionData = JSON.parse(extractionText);

    // Parse Signature Box Data
    const signatureText = signatureResponse.text;
    const signatureData = signatureText ? JSON.parse(signatureText) : { signatureBox: null };

    // Parse AI Detection Data
    const aiText = aiResponse.text;
    const aiData = aiText ? JSON.parse(aiText) : { isAiGenerated: false, synthIdConfidence: 0 };

    // Combine Data
    const mergedData: ChequeData = {
      ...extractionData,
      ...signatureData,
      ...aiData
    };

    // Post-processing for MICR code
    if (mergedData.micrCode) {
      mergedData.micrCode = mergedData.micrCode.replace(/[|':]/g, ' ');
    }

    return mergedData;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    throw error;
  }
};