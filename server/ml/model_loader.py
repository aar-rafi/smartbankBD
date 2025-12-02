"""
Siamese Transformer Model Loader
Loads and manages the signature verification model
"""
import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models
from PIL import Image
import numpy as np
from torchvision import transforms

class SiameseTransformer(nn.Module):
    """
    Siamese Network with EfficientNet backbone + Transformer encoder
    Same architecture as in fraud-detection-signature-varification.ipynb
    """
    def __init__(self, embedding_dim=128, transformer_heads=4, transformer_layers=2, dropout=0.1):
        super(SiameseTransformer, self).__init__()
        
        # Load EfficientNet backbone (pretrained on ImageNet)
        efficientnet = models.efficientnet_b0(pretrained=True)
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
        # Extract features with backbone
        features = self.backbone(x)
        
        # Reshape for transformer: (batch, channels, H, W) -> (batch, H*W, channels)
        features = features.view(features.size(0), self.feature_dim, -1)
        features = features.permute(0, 2, 1)
        
        # Add positional embedding
        features = features + self.pos_embedding
        
        # Pass through transformer
        features = self.transformer(features)
        
        # Global average pooling
        embedding = torch.mean(features, dim=1)
        
        # Project to final embedding space
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
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance
    
    def initialize(self, model_path='dummy_model.pth', device=None):
        """Initialize model and preprocessing pipeline"""
        if self._model is not None:
            return  # Already initialized
        
        # Set device
        if device is None:
            self._device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        else:
            self._device = device
        
        print(f"🔧 Initializing Siamese Transformer on {self._device}")
        
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
    
    def preprocess_image(self, image_data):
        """
        Preprocess image for model input
        Args:
            image_data: PIL Image or numpy array
        Returns:
            torch.Tensor: Preprocessed image tensor
        """
        if isinstance(image_data, np.ndarray):
            image_data = Image.fromarray(image_data)
        
        # Convert grayscale to RGB if needed
        if image_data.mode == 'L':
            image_data = image_data.convert('RGB')
        elif image_data.mode != 'RGB':
            image_data = image_data.convert('RGB')
        
        # Apply transforms
        tensor = self._transform(image_data)
        return tensor.unsqueeze(0).to(self._device)  # Add batch dimension
    
    def compute_similarity(self, img1_tensor, img2_tensor):
        """
        Compute similarity between two signature images
        Args:
            img1_tensor: Preprocessed image tensor
            img2_tensor: Preprocessed image tensor
        Returns:
            dict: {
                'distance': float,
                'similarity': float (0-1),
                'is_match': bool,
                'confidence': float (0-100)
            }
        """
        with torch.no_grad():
            # Get embeddings
            emb1, emb2 = self._model(img1_tensor, img2_tensor)
            
            # Calculate Euclidean distance
            distance = F.pairwise_distance(emb1, emb2).item()
            
            # Convert distance to similarity score (0-1)
            # Lower distance = higher similarity
            # Using exponential decay: similarity = e^(-distance)
            similarity = np.exp(-distance)
            
            # Decision threshold (can be tuned)
            threshold = 0.5
            is_match = distance < threshold
            
            # Confidence as percentage
            confidence = similarity * 100
            
            return {
                'distance': float(distance),
                'similarity': float(similarity),
                'is_match': bool(is_match),
                'confidence': float(confidence)
            }
    
    @property
    def model(self):
        return self._model
    
    @property
    def device(self):
        return self._device
