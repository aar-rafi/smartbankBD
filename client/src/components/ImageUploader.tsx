import React, { useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, isLoading }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
  }, [onImageSelected]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onImageSelected(file);
    }
  }, [onImageSelected]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${isLoading
          ? 'border-muted bg-muted/50 cursor-not-allowed opacity-50'
          : 'border-muted-foreground/25 hover:border-primary hover:bg-muted/30 cursor-pointer'
        }`}
      onDrop={isLoading ? undefined : handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isLoading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full ${isLoading ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
          <Upload className="h-8 w-8" />
        </div>
        <div>
          <p className="text-lg font-medium text-foreground">
            {isLoading ? "Processing..." : "Upload Cheque Image"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Drag and drop or click to browse
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
