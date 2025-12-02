"""
Siamese Transformer Model Loader
Loads the trained signature verification model from fraud-detection-signature-varification.ipynb
Uses exact same architecture as training notebook
"""
import os
import numpy as np
from PIL import Image

# Configuration matching training notebook
CONFIG = {
    'embedding_dim': 128,
    'transformer_heads': 4,
    'transformer_layers': 2,
    'dropout': 0.1,
    'margin': 1.0,
    'threshold': 0.5  # Distance threshold for matching
}

# Try to import PyTorch
TORCH_AVAILABLE = False
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torchvision import models, transforms
    TORCH_AVAILABLE = True
    print("✅ PyTorch loaded successfully")
except Exception as e:
    print(f"⚠️  PyTorch import failed: {e}")
    print("📋 Running in MOCK mode - using simple image comparison")


# Only define the model class if torch is available
if TORCH_AVAILABLE:
    class SiameseTransformer(nn.Module):
        """
        Siamese Network with EfficientNet-B0 backbone + Transformer encoder
        EXACT architecture from fraud-detection-signature-varification.ipynb
        """
        def __init__(self):
            super(SiameseTransformer, self).__init__()
            
            # 1. EfficientNet-B0 Backbone 🚀
            # We strip the final classification head (the 'classifier' sequential block) 
            efficientnet = models.efficientnet_b0(weights='IMAGENET1K_V1')
            # EfficientNet stores its features in the 'features' attribute, 
            # which is an nn.Sequential block. We use this directly.
            self.backbone = efficientnet.features
            # Output shape for 224x224 input: [Batch, 1280, 7, 7]
            
            # 2. Transformer Logic
            # EFFICIENTNET-B0 OUTPUT CHANNEL COUNT IS 1280
            self.feature_dim = 1280 
            self.seq_len = 7 * 7  # 49 patches (assuming 224x224 input)
            
            # Positional Embedding (Learnable)
            # Size: [1, 49, 1280]
            self.pos_embedding = nn.Parameter(torch.randn(1, self.seq_len, self.feature_dim))
            
            # Transformer Encoder Layer
            # d_model = 1280
            encoder_layer = nn.TransformerEncoderLayer(
                d_model=self.feature_dim, 
                nhead=CONFIG['transformer_heads'], 
                dim_feedforward=self.feature_dim * 2,  # Using 2x dimension for feedforward 
                dropout=CONFIG['dropout'],
                batch_first=True
            )
            self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=CONFIG['transformer_layers'])
            
            # 3. Final Embedder Head
            # Input to first Linear layer = 1280
            self.fc = nn.Sequential(
                nn.Linear(self.feature_dim, 256),
                nn.BatchNorm1d(256),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(256, CONFIG['embedding_dim'])
            )

        def forward_one(self, x):
            # x: [Batch, 3, 224, 224]
            
            # Extract features -> [Batch, 1280, 7, 7]
            features = self.backbone(x)
            
            # Flatten spatial dims to sequence -> [Batch, 1280, 49]
            features = features.view(features.size(0), self.feature_dim, -1)
            
            # Transpose for Transformer -> [Batch, 49, 1280]
            features = features.permute(0, 2, 1)
            
            # Add Positional Encoding
            features = features + self.pos_embedding
            
            # Pass through Transformer
            features = self.transformer(features)
            
            # Global Average Pooling (Aggregating the sequence)
            # [Batch, 49, 1280] -> [Batch, 1280]
            embedding = torch.mean(features, dim=1)
            
            # Final Projection
            embedding = self.fc(embedding)
            return embedding

        def forward(self, img1, img2):
            out1 = self.forward_one(img1)
            out2 = self.forward_one(img2)
            return out1, out2

    class ContrastiveLoss(nn.Module):
        """Contrastive Loss (same as training notebook)"""
        def __init__(self, margin=1.0):
            super(ContrastiveLoss, self).__init__()
            self.margin = margin

        def forward(self, output1, output2, label):
            # Euclidean distance
            euclidean_distance = F.pairwise_distance(output1, output2)
            
            # Loss formula:
            loss = torch.mean((1 - label) * torch.pow(euclidean_distance, 2) +
                              (label) * torch.pow(torch.clamp(self.margin - euclidean_distance, min=0.0), 2))
            return loss


class ModelManager:
    """Singleton model manager to load model once and reuse"""
    _instance = None
    _model = None
    _device = None
    _transform = None
    _mock_mode = False
    _model_loaded = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance
    
    def initialize(self, model_path=None, device=None):
        """Initialize model and preprocessing pipeline"""
        if self._model is not None or self._mock_mode:
            return  # Already initialized
        
        if not TORCH_AVAILABLE:
            print("🔧 Initializing in MOCK mode (PyTorch unavailable)")
            self._mock_mode = True
            return
        
        # Default model path - look in project root
        if model_path is None:
            # Check common locations
            possible_paths = [
                os.path.join(os.path.dirname(__file__), '..', '..', 'best_siamese_transformer.pth'),
                os.path.join(os.path.dirname(__file__), 'best_siamese_transformer.pth'),
                'best_siamese_transformer.pth',
                os.environ.get('MODEL_PATH', '')
            ]
            for path in possible_paths:
                if path and os.path.exists(path):
                    model_path = path
                    break
        
        # Set device
        if device is None:
            self._device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        else:
            self._device = device
        
        print(f"🔧 Initializing Siamese Transformer on {self._device}")
        
        try:
            # Create model with EXACT architecture from training notebook
            self._model = SiameseTransformer()
            
            # Load trained weights
            if model_path and os.path.exists(model_path):
                print(f"📦 Loading trained model weights from {model_path}")
                try:
                    state_dict = torch.load(model_path, map_location=self._device, weights_only=True)
                    self._model.load_state_dict(state_dict)
                    self._model_loaded = True
                    print("✅ Trained model weights loaded successfully!")
                except Exception as e:
                    print(f"⚠️  Warning: Could not load weights: {e}")
                    print("📋 Using pretrained EfficientNet backbone (ImageNet) - predictions may be less accurate")
            else:
                print(f"⚠️  Model file not found at: {model_path}")
                print("📋 Using pretrained EfficientNet backbone (ImageNet) - predictions may be less accurate")
            
            # Move to device and set to eval mode
            self._model.to(self._device)
            self._model.eval()
            
            # Define preprocessing transform (same as training)
            self._transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            print("✅ Model initialization complete")
        except Exception as e:
            print(f"❌ Model initialization failed: {e}")
            import traceback
            traceback.print_exc()
            print("📋 Falling back to MOCK mode")
            self._mock_mode = True
            self._model = None
    
    def preprocess_image(self, image_data):
        """
        Preprocess image for model input
        Args:
            image_data: PIL Image, numpy array, or file path
        Returns:
            torch.Tensor or PIL Image (in mock mode)
        """
        # Handle file path
        if isinstance(image_data, str):
            image_data = Image.open(image_data)
        elif isinstance(image_data, np.ndarray):
            image_data = Image.fromarray(image_data)
        
        # Convert grayscale to RGB if needed
        if image_data.mode == 'L':
            image_data = image_data.convert('RGB')
        elif image_data.mode != 'RGB':
            image_data = image_data.convert('RGB')
        
        if self._mock_mode or not TORCH_AVAILABLE:
            return image_data  # Return PIL image in mock mode
        
        # Apply transforms
        tensor = self._transform(image_data)
        return tensor.unsqueeze(0).to(self._device)  # Add batch dimension
    
    def _compute_mock_similarity(self, img1, img2):
        """
        Compute a deterministic similarity score based on image properties
        This is used when PyTorch is not available
        """
        # Resize both images to same size for comparison
        img1_resized = img1.resize((64, 64)).convert('L')
        img2_resized = img2.resize((64, 64)).convert('L')
        
        # Convert to numpy arrays
        arr1 = np.array(img1_resized, dtype=np.float32).flatten()
        arr2 = np.array(img2_resized, dtype=np.float32).flatten()
        
        # Normalize
        arr1 = (arr1 - arr1.mean()) / (arr1.std() + 1e-8)
        arr2 = (arr2 - arr2.mean()) / (arr2.std() + 1e-8)
        
        # Compute cosine similarity
        dot_product = np.dot(arr1, arr2)
        norm1 = np.linalg.norm(arr1)
        norm2 = np.linalg.norm(arr2)
        
        cosine_sim = dot_product / (norm1 * norm2 + 1e-8)
        
        # Convert to distance (lower = more similar)
        distance = 1 - cosine_sim
        
        # Convert to similarity percentage (0-100)
        similarity = (cosine_sim + 1) / 2
        confidence = similarity * 100
        
        return {
            'distance': float(max(0, distance)),
            'similarity': float(max(0, min(1, similarity))),
            'is_match': bool(similarity > 0.6),
            'confidence': float(max(0, min(100, confidence))),
            'mock_mode': True,
            'model_loaded': False
        }
    
    def compute_similarity(self, img1_tensor, img2_tensor):
        """
        Compute similarity between two signature images
        Uses Euclidean distance in embedding space (same as training)
        """
        if self._mock_mode or not TORCH_AVAILABLE:
            return self._compute_mock_similarity(img1_tensor, img2_tensor)
        
        with torch.no_grad():
            # Get embeddings from both images
            emb1, emb2 = self._model(img1_tensor, img2_tensor)
            
            # Euclidean distance (same as ContrastiveLoss)
            distance = F.pairwise_distance(emb1, emb2).item()
            
            # Convert distance to similarity score (0-1)
            # Using exponential decay: similarity = exp(-distance)
            # Lower distance = higher similarity
            similarity = np.exp(-distance)
            
            # Threshold check (same as training: margin=1.0, threshold=0.5)
            threshold = CONFIG['threshold']
            is_match = distance < threshold
            
            # Confidence as percentage (0-100)
            # This represents how similar the signatures are, NOT decision confidence
            # Higher score = more similar signatures
            # Scale similarity (typically 0.6-1.0 for matches) to 0-100%
            confidence = similarity * 100
            
            return {
                'distance': float(distance),
                'similarity': float(similarity),
                'is_match': bool(is_match),
                'confidence': float(max(0, min(100, confidence))),
                'mock_mode': False,
                'model_loaded': self._model_loaded
            }
    
    @property
    def model(self):
        return self._model
    
    @property
    def device(self):
        return self._device
    
    @property
    def is_mock_mode(self):
        return self._mock_mode
    
    @property
    def is_model_loaded(self):
        return self._model_loaded
