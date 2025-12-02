import { GoogleGenAI, Schema, Type } from "@google/genai";
import { ChequeData } from "../../shared/types.js";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import util from "util";
import { BypassConfig, isDemoCheque } from "../config/bypass.js";

const execPromise = util.promisify(exec);

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

        // 2. Run Python Script for signature extraction
        const scriptPath = path.resolve("ml/signature_extract.py");
        const pythonPath = path.resolve(process.env.PYTHON_PATH || "database/venv/bin/python");
        const command = `${pythonPath} "${scriptPath}" "${inputPath}" "${outputPath}" --json`;

        console.log("Running Python script:", command);
        const { stdout, stderr } = await execPromise(command);
        if (stderr) console.error("Python stderr:", stderr);

        let pythonResult;
        try {
            pythonResult = JSON.parse(stdout);
        } catch (e) {
            console.error("Failed to parse Python output:", e);
            throw new Error("Failed to parse signature extraction results");
        }

        // Normalize BBox
        const [h, w] = pythonResult.image_dim;
        const [ymin, xmin, ymax, xmax] = pythonResult.bbox;
        const normalize = (val: number, max: number) => Math.round((val / max) * 1000);
        const normalizedBox = [
            normalize(ymin, h),
            normalize(xmin, w),
            normalize(ymax, h),
            normalize(xmax, w)
        ];

        // Read extracted signature image
        let extractedSignatureImage = null;
        let signatureDetectedByPython = false;
        try {
            const sigBuffer = await fs.readFile(pythonResult.output_file);
            extractedSignatureImage = sigBuffer.toString("base64");
            signatureDetectedByPython = true;
            console.log("Signature extracted by Python script successfully");
        } catch (e) {
            console.warn("Could not read extracted signature:", e);
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
            // Use Python extraction result for hasSignature if it found one
            const mergedData: ChequeData = {
                ...extractionData,
                hasSignature: signatureDetectedByPython || extractionData.hasSignature,
                signatureBox: normalizedBox,
                extractedSignatureImage,
                // Store paths for later verification at drawer bank
                chequeImagePath: inputPath,
                signatureImagePath: pythonResult.output_file,
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

            // Use Python extraction result for hasSignature if it found one
            const mergedData: ChequeData = {
                ...extractionData,
                hasSignature: signatureDetectedByPython || extractionData.hasSignature,
                signatureBox: normalizedBox,
                extractedSignatureImage,
                // Store paths for later verification at drawer bank
                chequeImagePath: inputPath,
                signatureImagePath: pythonResult.output_file,
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
