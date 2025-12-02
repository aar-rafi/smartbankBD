"""
Flask API for Signature Verification using Siamese Transformer
Endpoints:
    POST /verify-signature - Verify two signatures
    GET /health - Health check
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
from PIL import Image
import os
import sys

# Add parent directory to path to import model_loader
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from model_loader import ModelManager

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize model manager
model_manager = ModelManager()

# Configuration
MODEL_PATH = os.environ.get('MODEL_PATH', os.path.join(os.path.dirname(__file__), 'dummy_model.pth'))
PORT = int(os.environ.get('ML_SERVICE_PORT', 5001))


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


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'signature-verification-ml',
        'model_loaded': model_manager.model is not None,
        'device': str(model_manager.device) if model_manager.device else 'not initialized'
    })


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
    print(f"   - GET  http://localhost:{PORT}/health")
    print("="*60)
    
    # Start Flask server
    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=False,  # Set to True for development
        threaded=True
    )
