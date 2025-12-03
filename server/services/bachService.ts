/**
 * BACH Package Generation Service
 * ================================
 * Generates realistic BACH (Bangladesh Automated Clearing House) package files
 * following the actual BACH protocol structure.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const BACH_OUTPUT_DIR = path.resolve(process.cwd(), '..', 'bach_packages');

interface BACHPackageData {
    chequeId: number;
    chequeNumber: string;
    amount: number;
    payeeName: string;
    drawerAccount: string;
    drawerBankCode: string;
    presentingBankCode: string;
    micrCode: string;
    issueDate: string;
    chequeImagePath?: string;
    signatureImagePath?: string;
}

interface BACHPackageResult {
    packageName: string;
    packagePath: string;
    files: string[];
    encrypted: boolean;
}

/**
 * Generate BACH package header file
 */
function generateBatchHeader(data: BACHPackageData, batchNumber: string): string {
    const now = new Date();
    const header = [
        `BACH OUTWARD CLEARING BATCH`,
        `========================================`,
        `Batch ID: ${batchNumber}`,
        `Created: ${now.toISOString()}`,
        `Presenting Bank: ${data.presentingBankCode}`,
        `Destination Bank: ${data.drawerBankCode}`,
        `Total Items: 1`,
        `Total Amount: ${data.amount.toFixed(2)} BDT`,
        `========================================`,
        `Format Version: BACH-2.1`,
        `Encryption: AES-256-CBC`,
        `Checksum: ${crypto.randomBytes(16).toString('hex')}`,
    ].join('\n');
    
    return header;
}

/**
 * Generate BACH items data file (MICR + metadata)
 */
function generateItemsData(data: BACHPackageData): string {
    const itemId = data.chequeNumber.replace(/\D/g, '').slice(-5).padStart(5, '0');
    
    // Simulated MICR line format: Cheque# | Routing# | Account#
    const micrLine = data.micrCode || `⑆${data.chequeNumber}⑆ ⑈${data.drawerBankCode}⑈ ${data.drawerAccount}⑇`;
    
    const items = [
        `# BACH Items Data File`,
        `# Format: CSV with MICR encoding`,
        ``,
        `ITEM_ID,CHEQUE_NO,AMOUNT,PAYEE,DRAWER_ACCOUNT,MICR_LINE,STATUS`,
        `${itemId},${data.chequeNumber},${data.amount.toFixed(2)},"${data.payeeName}",${data.drawerAccount},"${micrLine}",PENDING`,
        ``,
        `# End of items`,
        `# Total: 1 item(s)`,
        `# Checksum: ${crypto.createHash('md5').update(data.chequeNumber + data.amount).digest('hex')}`,
    ].join('\n');
    
    return items;
}

/**
 * Generate a "encrypted" package manifest
 */
function generateEncryptedManifest(packageName: string, files: string[]): string {
    const manifest = {
        package: packageName,
        version: '2.1',
        encryption: 'AES-256-CBC',
        iv: crypto.randomBytes(16).toString('hex'),
        files: files.map(f => ({
            name: f,
            size: Math.floor(Math.random() * 50000) + 1000,
            checksum: crypto.randomBytes(16).toString('hex')
        })),
        signature: crypto.randomBytes(32).toString('hex'),
        timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(manifest, null, 2);
}

/**
 * Create a simple grayscale/binary version of an image (placeholder)
 * In production, this would actually convert the image
 */
async function createImageVariant(
    sourcePath: string | undefined, 
    outputPath: string, 
    variant: 'FG' | 'FB' | 'BB'
): Promise<void> {
    if (sourcePath) {
        try {
            // Try to copy the actual image
            await fs.copyFile(sourcePath, outputPath);
            return;
        } catch (e) {
            // Fall through to create placeholder
        }
    }
    
    // Create a placeholder "image" file with some binary-looking data
    const header = variant === 'FG' ? 'TIFF-GRAYSCALE' : 
                   variant === 'FB' ? 'TIFF-BINARY-FRONT' : 'TIFF-BINARY-BACK';
    
    const placeholder = Buffer.concat([
        Buffer.from(`${header}\n`),
        Buffer.from(`Placeholder image for BACH package\n`),
        Buffer.from(`Variant: ${variant}\n`),
        Buffer.from(`Generated: ${new Date().toISOString()}\n`),
        crypto.randomBytes(1024) // Some random bytes to simulate image data
    ]);
    
    await fs.writeFile(outputPath, placeholder);
}

/**
 * Generate complete BACH package for a cheque
 */
export async function generateBACHPackage(data: BACHPackageData): Promise<BACHPackageResult> {
    // Create output directory
    await fs.mkdir(BACH_OUTPUT_DIR, { recursive: true });
    
    // Generate package name: OUTWARD_YYYY-MM-DD_BANKCODE_BATCH.ENC
    const date = new Date().toISOString().split('T')[0];
    const batchNumber = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
    const packageName = `OUTWARD_${date}_${data.presentingBankCode}_${batchNumber}`;
    
    // Create package directory
    const packageDir = path.join(BACH_OUTPUT_DIR, packageName);
    const imagesDir = path.join(packageDir, 'images');
    await fs.mkdir(imagesDir, { recursive: true });
    
    const files: string[] = [];
    const itemId = data.chequeNumber.replace(/\D/g, '').slice(-5).padStart(5, '0');
    
    // 1. Generate batch_header.dat
    const headerContent = generateBatchHeader(data, batchNumber);
    await fs.writeFile(path.join(packageDir, 'batch_header.dat'), headerContent);
    files.push('batch_header.dat');
    
    // 2. Generate items.dat
    const itemsContent = generateItemsData(data);
    await fs.writeFile(path.join(packageDir, 'items.dat'), itemsContent);
    files.push('items.dat');
    
    // 3. Generate image files
    const fgPath = path.join(imagesDir, `IMG${itemId}_FG.TIF`);
    const fbPath = path.join(imagesDir, `IMG${itemId}_FB.TIF`);
    const bbPath = path.join(imagesDir, `IMG${itemId}_BB.TIF`);
    
    await createImageVariant(data.chequeImagePath, fgPath, 'FG');
    await createImageVariant(data.chequeImagePath, fbPath, 'FB');
    await createImageVariant(undefined, bbPath, 'BB'); // Back is always placeholder
    
    files.push(`images/IMG${itemId}_FG.TIF`);
    files.push(`images/IMG${itemId}_FB.TIF`);
    files.push(`images/IMG${itemId}_BB.TIF`);
    
    // 4. Generate encrypted manifest (.ENC file)
    const manifest = generateEncryptedManifest(packageName, files);
    await fs.writeFile(path.join(BACH_OUTPUT_DIR, `${packageName}.ENC`), manifest);
    
    return {
        packageName: `${packageName}.ENC`,
        packagePath: packageDir,
        files,
        encrypted: true
    };
}

/**
 * List all BACH packages
 */
export async function listBACHPackages(): Promise<string[]> {
    try {
        await fs.mkdir(BACH_OUTPUT_DIR, { recursive: true });
        const files = await fs.readdir(BACH_OUTPUT_DIR);
        return files.filter(f => f.endsWith('.ENC'));
    } catch (e) {
        return [];
    }
}

/**
 * Get BACH package details
 */
export async function getBACHPackageDetails(packageName: string): Promise<object | null> {
    try {
        const manifestPath = path.join(BACH_OUTPUT_DIR, packageName);
        const content = await fs.readFile(manifestPath, 'utf-8');
        return JSON.parse(content);
    } catch (e) {
        return null;
    }
}

