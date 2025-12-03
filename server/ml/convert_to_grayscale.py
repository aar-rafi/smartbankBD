#!/usr/bin/env python3
"""
Convert an image to grayscale
Usage: python convert_to_grayscale.py <input_path> <output_path>
"""
import sys
import os
from PIL import Image

def convert_to_grayscale(input_path, output_path):
    """Convert image to grayscale and save"""
    try:
        img = Image.open(input_path)
        
        # Convert to grayscale (L mode)
        gray_img = img.convert('L')
        
        # Save as PNG to preserve quality
        gray_img.save(output_path, 'PNG')
        return True
    except Exception as e:
        print(f"Error converting to grayscale: {e}", file=sys.stderr)
        return False

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python convert_to_grayscale.py <input_path> <output_path>", file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    if not os.path.exists(input_path):
        print(f"Input file does not exist: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    success = convert_to_grayscale(input_path, output_path)
    sys.exit(0 if success else 1)
