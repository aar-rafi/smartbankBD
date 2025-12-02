import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('../.env.local') });

async function test() {
    try {
        const { analyzeCheque } = await import('./services/analysisService.js');
        const imagePath = '/home/torr20/.gemini/antigravity/brain/f2dc2c64-5f50-49cd-a332-be3ebfdbe599/uploaded_image_1764677256919.png';
        const imageBuffer = await fs.readFile(imagePath);
        const base64Image = imageBuffer.toString('base64');

        console.log('Starting analysis...');
        const result = await analyzeCheque(base64Image, 'image/png');
        console.log('Analysis result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
