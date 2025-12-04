import { GoogleGenAI, Schema, Type } from "@google/genai";
import { ChequeData } from "../../shared/types.js";
import fs from "fs/promises";
import path from "path";
import { BypassConfig, isDemoCheque } from "../config/bypass.js";

// ML Service URL for signature extraction
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5005";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const GEMINI_MODEL = "gemini-2.5-pro";

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

const aiDetectionSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        isAiGenerated: { type: Type.BOOLEAN, description: "True if the image contains SynthID watermarks or AI generation artifacts." },
        synthIdConfidence: { type: Type.NUMBER, description: "Confidence score (0-100) that the image is AI-generated." },
    },
    required: ["isAiGenerated", "synthIdConfidence"],
};

// Helper function to call ML service for signature extraction
interface MLExtractResponse {
    success: boolean;
    error?: string;
    result?: {
        bbox: number[];
        normalized_bbox: number[];
        image_dim: number[];
        extracted_signature: string;
    };
}

async function extractSignatureFromML(base64Image: string): Promise<{
    bbox: number[];
    normalized_bbox: number[];
    image_dim: number[];
    extracted_signature: string;
}> {
    const response = await fetch(`${ML_SERVICE_URL}/extract-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
    });
    
    if (!response.ok) {
        throw new Error(`ML service error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as MLExtractResponse;
    if (!data.success || !data.result) {
        throw new Error(data.error || 'Failed to extract signature');
    }
    
    return data.result;
}

export const analyzeCheque = async (base64Image: string, mimeType: string): Promise<ChequeData> => {
    const timestamp = Date.now();
    const tempDir = path.resolve("temp");
    const inputPath = path.join(tempDir, `upload_${timestamp}.png`);
    const outputPath = path.join(tempDir, `signature_${timestamp}.png`);

    try {
        // 1. Save Image
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        await fs.writeFile(inputPath, buffer);

        // 2. Call ML Service for signature extraction via HTTP
        console.log("Calling ML service for signature extraction...");
        let mlResult;
        try {
            mlResult = await extractSignatureFromML(base64Data);
            console.log("Signature extraction successful");
        } catch (e) {
            console.error("Failed to extract signature via ML service:", e);
            throw new Error("Failed to extract signature from cheque image");
        }

        // Normalize BBox - already normalized from ML service
        const normalizedBox = mlResult.normalized_bbox;
        const [h, w] = mlResult.image_dim;

        // Get extracted signature image from ML service response
        let extractedSignatureImage: string | null = mlResult.extracted_signature || null;
        let signatureDetectedByML = !!extractedSignatureImage;
        
        // Also save the extracted signature to disk for later verification
        if (extractedSignatureImage) {
            try {
                const sigBuffer = Buffer.from(extractedSignatureImage, "base64");
                await fs.writeFile(outputPath, sigBuffer);
                console.log("Signature saved to:", outputPath);
            } catch (e) {
                console.warn("Could not save extracted signature to disk:", e);
            }
        }

        // 3. Run Gemini Analysis
        const imagePart = {
            inlineData: { data: base64Data, mimeType },
        };

        const extractionPromise = ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: {
                parts: [
                    imagePart,
                    {
                        text: `Analyze this bank cheque image and extract the requested information into JSON format. 
            Be precise with extracting printed and handwritten text. 
            If a field is not present or illegible, return an empty string or null.
            For the 'micrCode', replace special characters like '|', ''', ':' with spaces.
            For 'hasSignature', look specifically at the signature line area for handwritten ink markings.`
                    },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: extractionSchema,
                systemInstruction: "You are an expert financial document processing AI.",
            },
        });

        // Only run AI detection if not bypassed
        let aiData = { isAiGenerated: false, synthIdConfidence: 0 };
        
        if (!BypassConfig.skipAIDetection) {
            const aiDetectionPromise = ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: {
                    parts: [
                        imagePart,
                        {
                            text: `Analyze this cheque image to determine if it is AI-generated.
                Examine paper texture, ink consistency, and digital artifacts.
                Only flag as AI-generated if there are clear signs of generative synthesis.
                If uncertain, lean towards AUTHENTIC (isAiGenerated: false).
                Return: { "isAiGenerated": boolean, "synthIdConfidence": number }`
                        },
                    ],
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: aiDetectionSchema,
                    systemInstruction: "You are a forensic document analyst. Be conservative in flagging fraud.",
                },
            });

            const [extractionResponse, aiResponse] = await Promise.all([
                extractionPromise,
                aiDetectionPromise
            ]);

            const extractionText = extractionResponse?.text;
            const extractionData = extractionText ? JSON.parse(extractionText) : {};

            const aiText = aiResponse?.text;
            aiData = aiText ? JSON.parse(aiText) : { isAiGenerated: false, synthIdConfidence: 0 };

            // Check if this is a demo cheque - bypass AI detection
            if (isDemoCheque(extractionData.accountHolderName)) {
                console.log("Demo cheque detected - bypassing AI detection");
                aiData = { isAiGenerated: false, synthIdConfidence: 5 };
            }

            // Combine and return
            // Use ML extraction result for hasSignature if it found one
            const mergedData: ChequeData = {
                ...extractionData,
                hasSignature: signatureDetectedByML || extractionData.hasSignature,
                signatureBox: normalizedBox,
                extractedSignatureImage,
                // Store paths for later verification at drawer bank
                chequeImagePath: inputPath,
                signatureImagePath: outputPath,
                ...aiData
            };

            if (mergedData.micrCode) {
                mergedData.micrCode = mergedData.micrCode.replace(/[|':]/g, ' ');
            }

            return mergedData;
        } else {
            // AI detection bypassed - only run extraction
            const extractionResponse = await extractionPromise;
            const extractionText = extractionResponse?.text;
            const extractionData = extractionText ? JSON.parse(extractionText) : {};

            // Use ML extraction result for hasSignature if it found one
            const mergedData: ChequeData = {
                ...extractionData,
                hasSignature: signatureDetectedByML || extractionData.hasSignature,
                signatureBox: normalizedBox,
                extractedSignatureImage,
                // Store paths for later verification at drawer bank
                chequeImagePath: inputPath,
                signatureImagePath: outputPath,
                isAiGenerated: false,
                synthIdConfidence: 0
            };

            if (mergedData.micrCode) {
                mergedData.micrCode = mergedData.micrCode.replace(/[|':]/g, ' ');
            }

            return mergedData;
        }

    } catch (error) {
        console.error("Analysis error:", error);
        throw error;
    }
    // NOTE: Don't delete temp files - they're needed for drawer bank verification
};
