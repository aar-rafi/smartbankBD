# Here is the complete, copy-pasteable code block to replace the placeholder in your Kaggle notebook.
# This code uses the Hugging Face transformers library, which is the industry standard for loading pre-trained ViT models.
# 📋 The Code to Copy
# Replace the entire --- PLACEHOLDER FOR YOUR MODEL LOADING CODE --- block in Cell 2 with this:
from transformers import ViTModel, ViTConfig
import torch.nn as nn

# 1. Define the Siamese Architecture
class SiameseViT(nn.Module):
    def __init__(self, model_name='google/vit-base-patch16-224'):
        super(SiameseViT, self).__init__()
        # Load pre-trained ViT as the feature extractor
        self.encoder = ViTModel.from_pretrained(model_name)
        
        # Optional: Add a fully connected layer to compress the embedding
        # (e.g., from 768 dim -> 128 dim for compact signatures)
        self.fc = nn.Sequential(
            nn.Linear(768, 256),
            nn.ReLU(),
            nn.Linear(256, 128)
        )

    def forward_one(self, x):
        # ViT output returns a BaseModelOutputWithPooling object
        outputs = self.encoder(x)
        
        # We take the 'pooler_output' (CLS token) which represents the whole image
        # If pooler_output is None (depends on model), use last_hidden_state[:, 0]
        if outputs.pooler_output is not None:
            x = outputs.pooler_output
        else:
            x = outputs.last_hidden_state[:, 0]
            
        x = self.fc(x)
        return x

    def forward(self, x1, x2):
        out1 = self.forward_one(x1)
        out2 = self.forward_one(x2)
        return out1, out2

# 2. Instantiate and Load
try:
    print("⏳ Initializing SiameseViT model...")
    model = SiameseViT()
    
    # CASE A: If you have your own trained weights file (e.g., uploaded to Kaggle datasets)
    # weights_path = "/kaggle/input/your-dataset-name/my_siamese_weights.pth"
    # model.load_state_dict(torch.load(weights_path, map_location=device))
    # print(f"✅ Loaded custom weights from {weights_path}")

    # CASE B: If you are just testing (No custom training yet), 
    # the 'from_pretrained' in __init__ already loaded ImageNet weights.
    # It won't be perfect for signatures, but it will run and give you embeddings!
    print("✅ Loaded pre-trained ViT ImageNet weights (Demo Mode)")
    
    model.to(device)
    model.eval()

except Exception as e:
    print(f"❌ Error loading model: {e}")

# 🧠 What This Code Does
#  * SiameseViT Class: It creates a custom class that wraps the Google ViT model.
#  * forward_one: This is the "twin" logic. It extracts the features from one image. It grabs the [CLS] token (the standard way ViT represents a whole image) and passes it through a small linear layer (self.fc) to make the data smaller and easier to compare.
#  * forward: Takes two images, runs forward_one on both, and returns two vectors.
#  * Loading Logic:
#    * If you haven't trained anything yet, this code still works! It uses the default "ImageNet" knowledge. It might think a signature looks like a "nematode" or "spider web," but it will still produce consistent vectors you can compare for your hackathon demo.
#    * If you have a .pth file, just uncomment the CASE A lines and point to your file path.
# 🖼️ Critical: The "Transform" (Preprocessing)
# Because ViT is picky about image size (224 \times 224), you must update your verify_signature function to process the images before feeding them to this model.
# Add this transform code right after your imports:
from torchvision import transforms
from PIL import Image
import io

# Define the standard ViT transformation
transform = transforms.Compose([
    transforms.Resize((224, 224)),  # ViT requires exactly 224x224
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])

# Helper to load bytes into a tensor
def process_image(file_bytes):
    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    return transform(image).unsqueeze(0).to(device) # Add batch dimension
