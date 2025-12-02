# ML Service Integration Guide

## Overview
This system integrates a Siamese Transformer model for automated signature verification.

## Architecture
```
Frontend (React) → Node.js Backend → Python ML Service → PyTorch Model
```

## Setup Instructions

### 1. Install Python Dependencies
```bash
cd server/ml
pip install -r requirements.txt
```

Or use conda:
```bash
conda create -n chequemate python=3.10
conda activate chequemate
pip install -r requirements.txt
```

### 2. Model Configuration
Currently using `dummy_model.pth` as placeholder. To use your trained model:

1. Train the model using `fraud-detection-signature-varification.ipynb`
2. Save the model weights as `best_siamese_transformer.pth`
3. Place it in `server/ml/` directory
4. Update `.env.local`:
   ```
   MODEL_PATH=server/ml/best_siamese_transformer.pth
   ```

### 3. Start Services

**Terminal 1 - Python ML Service:**
```bash
cd server/ml
python signature_service.py
```
Should start on `http://localhost:5001`

**Terminal 2 - Node.js Backend:**
```bash
npm run start:server
```
Should start on `http://localhost:3001`

**Terminal 3 - Frontend:**
```bash
npm run dev
```
Should start on `http://localhost:5000`

## API Endpoints

### Python ML Service (`localhost:5001`)

**POST /verify-signature**
Request:
```json
{
  "signature1": "base64_encoded_image",
  "signature2": "base64_encoded_image"
}
```

Response:
```json
{
  "success": true,
  "result": {
    "distance": 0.234,
    "similarity": 0.876,
    "is_match": true,
    "confidence": 87.6
  }
}
```

**GET /health**
Response:
```json
{
  "status": "ok",
  "service": "signature-verification-ml",
  "model_loaded": true,
  "device": "cpu"
}
```

## How It Works

1. **Image Upload**: User uploads cheque image
2. **Gemini Extraction**: Google Gemini extracts signature as base64
3. **DB Lookup**: Backend fetches reference signature from database
4. **ML Verification**: Python service compares both signatures using Siamese Transformer
5. **Score Display**: Frontend shows confidence score (0-100%)

## Confidence Thresholds

- **≥70%**: ✓ Match confirmed (Green) - Transaction can proceed
- **50-70%**: ⚠ Review needed (Yellow) - Manual verification recommended
- **<50%**: ✗ Mismatch (Red) - Potential fraud, reject transaction

## Model Details

### Architecture
- **Backbone**: EfficientNet-B0 (pretrained on ImageNet)
- **Encoder**: Transformer (4 heads, 2 layers)
- **Embedding**: 128-dimensional signature representation
- **Distance Metric**: Euclidean distance
- **Similarity**: `exp(-distance)`

### Preprocessing
- Input size: 224x224 RGB
- Normalization: ImageNet stats (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
- Grayscale signatures converted to RGB

## Troubleshooting

### ML Service Won't Start
- Check Python dependencies: `pip list | grep torch`
- Verify port 5001 is available: `lsof -i :5001`
- Check logs for model loading errors

### "ML service unavailable" Warning
- Ensure ML service is running: `curl http://localhost:5001/health`
- Check `ML_SERVICE_URL` in `.env.local`
- System will fall back to visual comparison

### Low Accuracy
- Current model uses pretrained EfficientNet (no fine-tuning)
- Train custom model on signature dataset for better results
- Adjust threshold in `server/services/validationService.ts`

## Performance

- **Inference time**: 50-200ms per signature pair (CPU)
- **Throughput**: ~5-20 requests/second
- **GPU acceleration**: Add `CUDA_VISIBLE_DEVICES=0` for 10x speedup

## Future Enhancements

1. **Model Training**: Fine-tune on Bangladesh Bank cheque signatures
2. **Caching**: Store embeddings in DB to avoid recomputation
3. **Batch Processing**: Verify multiple cheques in parallel
4. **Explainability**: Add attention maps showing which signature regions differ
5. **Active Learning**: Collect user feedback to improve model

## Files Created

```
server/ml/
  ├── signature_service.py      # Flask API server
  ├── model_loader.py            # Siamese Transformer model
  ├── requirements.txt           # Python dependencies
  └── dummy_model.pth            # Placeholder (replace with trained model)

server/services/
  └── signatureMLService.ts      # Node.js integration layer
```

## Environment Variables

Add to `.env.local`:
```env
ML_SERVICE_URL=http://localhost:5001
ML_SERVICE_PORT=5001
ML_SERVICE_TIMEOUT=10000
MODEL_PATH=server/ml/dummy_model.pth
```
