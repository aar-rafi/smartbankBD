"""
Siamese Transformer Model Loader
Loads and manages the signature verification model
Includes fallback to mock mode if PyTorch is unavailable or incompatible
"""
import os
import numpy as np
from PIL import Image

# Try to import PyTorch, fall back to mock mode if unavailable or incompatible
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
        Siamese Network with EfficientNet backbone + Transformer encoder
        Same architecture as in fraud-detection-signature-varification.ipynb
        """
        def __init__(self, embedding_dim=128, transformer_heads=4, transformer_layers=2, dropout=0.1):
            super(SiameseTransformer, self).__init__()
            
            # Load EfficientNet backbone (pretrained on ImageNet)
            efficientnet = models.efficientnet_b0(weights='IMAGENET1K_V1')
            self.backbone = efficientnet.features
            
            self.feature_dim = 1280  # EfficientNet-B0 output channels
            self.seq_len = 7 * 7     # Spatial dimension after backbone
            
            # Positional embedding for transformer
            self.pos_embedding = nn.Parameter(torch.randn(1, self.seq_len, self.feature_dim))
            
            # Transformer encoder
            encoder_layer = nn.TransformerEncoderLayer(
                d_model=self.feature_dim, 
                nhead=transformer_heads, 
                dim_feedforward=self.feature_dim * 2,
                dropout=dropout,
                batch_first=True
            )
            self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=transformer_layers)
            
            # Final embedding projection
            self.fc = nn.Sequential(
                nn.Linear(self.feature_dim, 256),
                nn.BatchNorm1d(256),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(256, embedding_dim)
            )

        def forward_one(self, x):
            """Extract embedding for one image"""
            features = self.backbone(x)
            features = features.view(features.size(0), self.feature_dim, -1)
            features = features.permute(0, 2, 1)
            features = features + self.pos_embedding
            features = self.transformer(features)
            embedding = torch.mean(features, dim=1)
            embedding = self.fc(embedding)
            return embedding

        def forward(self, img1, img2):
            """Forward pass for both images"""
            out1 = self.forward_one(img1)
            out2 = self.forward_one(img2)
            return out1, out2


class ModelManager:
    """Singleton model manager to load model once and reuse"""
    _instance = None
    _model = None
    _device = None
    _transform = None
    _mock_mode = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance
    
    def initialize(self, model_path='dummy_model.pth', device=None):
        """Initialize model and preprocessing pipeline"""
        if self._model is not None or self._mock_mode:
            return  # Already initialized
        
        if not TORCH_AVAILABLE:
            print("🔧 Initializing in MOCK mode (PyTorch unavailable)")
            self._mock_mode = True
            return
        
        # Set device
        if device is None:
            self._device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        else:
            self._device = device
        
        print(f"🔧 Initializing Siamese Transformer on {self._device}")
        
        try:
            # Create model
            self._model = SiameseTransformer(
                embedding_dim=128,
                transformer_heads=4,
                transformer_layers=2,
                dropout=0.1
            )
            
            # Load weights if exists
            if os.path.exists(model_path):
                print(f"📦 Loading model weights from {model_path}")
                try:
                    state_dict = torch.load(model_path, map_location=self._device)
                    self._model.load_state_dict(state_dict)
                    print("✅ Model weights loaded successfully")
                except Exception as e:
                    print(f"⚠️  Warning: Could not load weights: {e}")
                    print("📋 Using pretrained EfficientNet backbone (ImageNet)")
            else:
                print(f"⚠️  Model file not found: {model_path}")
                print("📋 Using pretrained EfficientNet backbone (ImageNet)")
            
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
            print("📋 Falling back to MOCK mode")
            self._mock_mode = True
            self._model = None
    
    def preprocess_image(self, image_data):
        """
        Preprocess image for model input
        Args:
            image_data: PIL Image or numpy array
        Returns:
            torch.Tensor or PIL Image (in mock mode)
        """
        if isinstance(image_data, np.ndarray):
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
            'mock_mode': True
        }
    
    def compute_similarity(self, img1_tensor, img2_tensor):
        """
        Compute similarity between two signature images
        """
        if self._mock_mode or not TORCH_AVAILABLE:
            return self._compute_mock_similarity(img1_tensor, img2_tensor)
        
        with torch.no_grad():
            emb1, emb2 = self._model(img1_tensor, img2_tensor)
            distance = F.pairwise_distance(emb1, emb2).item()
            similarity = np.exp(-distance)
            threshold = 0.5
            is_match = distance < threshold
            confidence = similarity * 100
            
            return {
                'distance': float(distance),
                'similarity': float(similarity),
                'is_match': bool(is_match),
                'confidence': float(confidence),
                'mock_mode': False
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
