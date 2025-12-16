import React, { useCallback, useState } from 'react';
import { Upload, CheckCircle2, ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImagesSelected: (frontFile: File, backFile: File) => void;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelected, isLoading }) => {
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);

  const triggerUpload = useCallback((front: File | null, back: File | null) => {
    if (front && back) {
      onImagesSelected(front, back);
    }
  }, [onImagesSelected]);

  const handleFrontFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFrontImage(file);
      triggerUpload(file, backImage);
    }
  }, [triggerUpload, backImage]);

  const handleBackFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBackImage(file);
      triggerUpload(frontImage, file);
    }
  }, [triggerUpload, frontImage]);

  const handleFrontDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setFrontImage(file);
      triggerUpload(file, backImage);
    }
  }, [triggerUpload, backImage]);

  const handleBackDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setBackImage(file);
      triggerUpload(frontImage, file);
    }
  }, [triggerUpload, frontImage]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const UploadBox = ({ 
    label, 
    file, 
    onChange, 
    onDrop, 
    icon: Icon = Upload 
  }: { 
    label: string; 
    file: File | null; 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    icon?: React.ElementType;
  }) => (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 min-h-[200px] flex items-center justify-center ${
        isLoading
          ? 'border-muted bg-muted/50 cursor-not-allowed opacity-50'
          : file 
            ? 'border-green-400 bg-green-50/50' 
            : 'border-muted-foreground/25 hover:border-primary hover:bg-muted/30 cursor-pointer'
      }`}
      onDrop={isLoading ? undefined : onDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        accept="image/*"
        onChange={onChange}
        disabled={isLoading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full ${
          file 
            ? 'bg-green-100 text-green-600' 
            : isLoading 
              ? 'bg-muted text-muted-foreground' 
              : 'bg-primary/10 text-primary'
        }`}>
          {file ? <CheckCircle2 className="h-8 w-8" /> : <Icon className="h-8 w-8" />}
        </div>
        <div>
          <p className="text-base font-medium text-foreground">
            {file ? file.name.slice(0, 25) + (file.name.length > 25 ? '...' : '') : label}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {file ? 'Uploaded' : 'Drag & drop or click'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UploadBox 
          label="Front Side" 
          file={frontImage} 
          onChange={handleFrontFileChange}
          onDrop={handleFrontDrop}
          icon={Upload}
        />
        <UploadBox 
          label="Back Side" 
          file={backImage} 
          onChange={handleBackFileChange}
          onDrop={handleBackDrop}
          icon={ImageIcon}
        />
      </div>
      
      {/* Status message */}
      <div className="text-center">
        {isLoading ? (
          <p className="text-sm text-muted-foreground animate-pulse">Processing cheque image...</p>
        ) : frontImage && backImage ? (
          <p className="text-sm text-green-600 font-medium">Both sides uploaded - Processing...</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Upload both sides of the cheque to proceed
            {frontImage && !backImage && ' (Back side required)'}
            {!frontImage && backImage && ' (Front side required)'}
          </p>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
