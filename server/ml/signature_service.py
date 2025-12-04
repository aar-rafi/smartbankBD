"""
Flask API for Signature Verification using Siamese Transformer
Endpoints:
    POST /verify-signature - Verify two signatures
    POST /extract-signature - Extract signature from cheque image
    GET /health - Health check
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
from PIL import Image
import os
import sys
import numpy as np

# Add parent directory to path to import model_loader
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from model_loader import ModelManager

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize model manager
model_manager = ModelManager()

# Configuration
# Default to the model in the server directory
DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'best_siamese_transformer.pth')
MODEL_PATH = os.environ.get('MODEL_PATH', DEFAULT_MODEL_PATH)
# Use port 5005 to avoid conflict with frontend (5000, 5001)
PORT = int(os.environ.get('ML_SERVICE_PORT', 5005))


def base64_to_image(base64_string):
    """Convert base64 string to PIL Image"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        return image
    except Exception as e:
        raise ValueError(f"Failed to decode base64 image: {str(e)}")


def image_to_base64(image):
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')


def estimate_dpi(img_height_px, cheque_height_inches=3.5):
    """Estimate DPI from image height assuming standard cheque height."""
    return img_height_px / cheque_height_inches


def find_signature_bbox(img_width, img_height):
    """
    Calculate signature bounding box from cheque using physical dimensions:
    - Cheque: 7.5" wide x 3.5" tall
    - Signature box: located at (3", 2.3") with width 4.5" and height 0.5"
    """
    # Estimate DPI from image height
    dpi = estimate_dpi(img_height)
    
    # Convert physical dimensions to pixels
    sig_x_inches = 3.0      # Starting X position
    sig_width_inches = 4.5  # Width of signature box
    sig_y_inches = 2.3      # Approximate Y position
    sig_height_inches = 0.5  # Height of signature box
    
    # Convert to pixels
    sig_x_px = int(sig_x_inches * dpi)
    sig_width_px = int(sig_width_inches * dpi)
    sig_y_px = int(sig_y_inches * dpi)
    sig_height_px = int(sig_height_inches * dpi)
    
    # Define bounding box
    x1 = max(0, sig_x_px)
    y1 = max(0, sig_y_px)
    x2 = min(img_width, sig_x_px + sig_width_px)
    y2 = min(img_height, sig_y_px + sig_height_px)
    
    return x1, y1, x2, y2


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'signature-verification-ml',
        'model_loaded': model_manager.is_model_loaded if hasattr(model_manager, 'is_model_loaded') else model_manager.model is not None,
        'mock_mode': model_manager.is_mock_mode,
        'device': str(model_manager.device) if model_manager.device else 'cpu (mock mode)'
    })


@app.route('/extract-signature', methods=['POST'])
def extract_signature():
    """
    Extract signature region from a cheque image
    
    Request Body:
    {
        "image": "base64_encoded_cheque_image"
    }
    
    Response:
    {
        "success": true,
        "result": {
            "bbox": [ymin, xmin, ymax, xmax],
            "normalized_bbox": [ymin, xmin, ymax, xmax],  // normalized to 0-1000
            "image_dim": [height, width],
            "extracted_signature": "base64_encoded_signature_image"
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        image_b64 = data.get('image')
        
        if not image_b64:
            return jsonify({
                'success': False,
                'error': 'Image data is required'
            }), 400
        
        # Convert base64 to image
        try:
            img = base64_to_image(image_b64)
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        
        # Get image dimensions
        width, height = img.size
        
        # Find signature bounding box
        x1, y1, x2, y2 = find_signature_bbox(width, height)
        
        # Crop signature region
        signature_crop = img.crop((x1, y1, x2, y2))
        
        # Convert cropped signature to base64
        signature_b64 = image_to_base64(signature_crop)
        
        # Normalize bbox to 0-1000 scale
        normalize = lambda val, max_val: round((val / max_val) * 1000)
        normalized_bbox = [
            normalize(y1, height),
            normalize(x1, width),
            normalize(y2, height),
            normalize(x2, width)
        ]
        
        return jsonify({
            'success': True,
            'result': {
                'bbox': [y1, x1, y2, x2],  # [ymin, xmin, ymax, xmax]
                'normalized_bbox': normalized_bbox,
                'image_dim': [height, width],
                'extracted_signature': signature_b64
            }
        })
    
    except Exception as e:
        print(f"Error in extract_signature: {str(e)}", file=sys.stderr)
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


@app.route('/verify-signature', methods=['POST'])
def verify_signature():
    """
    Verify two signatures using Siamese Transformer
    
    Request Body:
    {
        "signature1": "base64_encoded_image",
        "signature2": "base64_encoded_image"
    }
    
    Response:
    {
        "success": true,
        "result": {
            "distance": 0.234,
            "similarity": 0.876,
            "is_match": true,
            "confidence": 87.6
        }
    }
    """
    try:
        # Parse request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        signature1_b64 = data.get('signature1')
        signature2_b64 = data.get('signature2')
        
        if not signature1_b64 or not signature2_b64:
            return jsonify({
                'success': False,
                'error': 'Both signature1 and signature2 are required'
            }), 400
        
        # Convert base64 to images
        try:
            img1 = base64_to_image(signature1_b64)
            img2 = base64_to_image(signature2_b64)
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        
        # Preprocess images
        img1_tensor = model_manager.preprocess_image(img1)
        img2_tensor = model_manager.preprocess_image(img2)
        
        # Compute similarity
        result = model_manager.compute_similarity(img1_tensor, img2_tensor)
        
        return jsonify({
            'success': True,
            'result': result
        })
    
    except Exception as e:
        print(f"Error in verify_signature: {str(e)}", file=sys.stderr)
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print("="*60)
    print("🚀 Starting Signature Verification ML Service")
    print("="*60)
    
    # Initialize model
    try:
        model_manager.initialize(model_path=MODEL_PATH)
        print(f"✅ Model initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize model: {e}")
        print("⚠️  Service will start but predictions may fail")
    
    print(f"🌐 Starting Flask server on port {PORT}")
    print(f"📡 Endpoints:")
    print(f"   - POST http://localhost:{PORT}/verify-signature")
    print(f"   - POST http://localhost:{PORT}/extract-signature")
    print(f"   - GET  http://localhost:{PORT}/health")
    print("="*60)
    
    # Start Flask server
    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=False,  # Set to True for development
        threaded=True
    )
