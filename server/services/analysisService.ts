import { GoogleGenAI, Schema, Type } from "@google/genai";
import { ChequeData } from "../../shared/types.js";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

// Initialize Gemini
// API key must be provided via environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const GEMINI_MODEL = "gemini-2.5-pro"; // Centralized model configuration

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

// Schema 3: AI Detection
const aiDetectionSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        isAiGenerated: { type: Type.BOOLEAN, description: "True if the image contains SynthID watermarks, digital artifacts, or inconsistencies typical of AI-generated images." },
        synthIdConfidence: { type: Type.NUMBER, description: "Confidence score (0-100) that the image is AI-generated/contains SynthID." },
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
        // Remove header if present (e.g., "data:image/png;base64,")
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        await fs.writeFile(inputPath, buffer);

        // 2. Run Python Script
        // Script is now in ../ml relative to services/analysisService.ts (which is in dist/server/services)
        // Actually, in source it is server/services -> server/ml.
        // When running from dist/server/services/analysisService.js, we need to go up to dist/server then to ml?
        // Wait, the python script is NOT compiled to dist. It stays in server/ml.
        // So if we are in dist/server/services, we need to go ../../ml/signature_extract.py?
        // Let's check where we are running from.
        // We are running `node dist/server/server.js`.
        // `__dirname` will be `.../dist/server/services`.
        // So `path.resolve` with `../ml` might be tricky if we rely on relative paths from the source file.
        // Better to use `path.join(process.cwd(), 'server/ml/signature_extract.py')` if we assume CWD is project root?
        // The server is started from `server` directory usually? "start": "node dist/server/server.js".
        // If we run `npm run start -w server`, CWD is `.../server`.
        // So `path.resolve("ml/signature_extract.py")` should work if CWD is `server`.

        // Previous code was: path.resolve("../new_code/signature_extract.py")
        // If CWD was `server`, then `../new_code` worked.
        // Now file is in `server/ml`. So `ml/signature_extract.py` relative to CWD `server`.

        const scriptPath = path.resolve("ml/signature_extract.py");
        // Use the venv python executable
        const pythonPath = path.resolve("database/venv/bin/python");
        const command = `${pythonPath} "${scriptPath}" "${inputPath}" "${outputPath}" --json`;

        console.log("Running Python script:", command);
        const { stdout, stderr } = await execPromise(command);
        if (stderr) console.error("Python stderr:", stderr);

        console.log("Python stdout:", stdout);
        let pythonResult;
        try {
            pythonResult = JSON.parse(stdout);
        } catch (e) {
            console.error("Failed to parse Python output:", e);
            // Fallback or throw?
            throw new Error("Failed to parse signature extraction results");
        }

        // Normalize BBox
        // Python output: [ymin, xmin, ymax, xmax] in pixels
        // We need 0-1000
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
        try {
            const sigBuffer = await fs.readFile(pythonResult.output_file);
            extractedSignatureImage = sigBuffer.toString("base64");
        } catch (e) {
            console.warn("Could not read extracted signature:", e);
        }

        // 3. Run Gemini Analysis
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType,
            },
        };

        const extractionPromise = ai.models.generateContent({
            model: GEMINI_MODEL,
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

        const aiDetectionPromise = ai.models.generateContent({
            model: GEMINI_MODEL,
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

        const [extractionResponse, aiResponse] = await Promise.all([
            extractionPromise,
            aiDetectionPromise
        ]);

        const extractionText = extractionResponse?.text;
        const extractionData = extractionText ? JSON.parse(extractionText) : {};

        const aiText = aiResponse?.text;
        const aiData = aiText ? JSON.parse(aiText) : { isAiGenerated: false, synthIdConfidence: 0 };

        // Combine Data
        const mergedData: ChequeData = {
            ...extractionData,
            signatureBox: normalizedBox,
            extractedSignatureImage: extractedSignatureImage,
            ...aiData
        };

        // Post-processing
        if (mergedData.micrCode) {
            mergedData.micrCode = mergedData.micrCode.replace(/[|':]/g, ' ');
        }

        return mergedData;

    } catch (error) {
        console.error("Analysis error:", error);
        throw error;
    } finally {
        // Cleanup
        try {
            await fs.unlink(inputPath);
            await fs.unlink(outputPath);
        } catch (e) {
            // Ignore cleanup errors
        }
    }
};
