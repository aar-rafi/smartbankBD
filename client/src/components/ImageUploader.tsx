import React, { useCallback } from 'react';

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
      className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors duration-200 ${
        isLoading ? 'border-gray-300 bg-gray-50 cursor-not-allowed' : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer'
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
        <div className="p-4 bg-indigo-100 rounded-full text-indigo-600">
          <span className="material-symbols-outlined text-4xl">add_a_photo</span>
        </div>
        <div>
          <p className="text-lg font-medium text-gray-700">
            {isLoading ? "Processing..." : "Upload Cheque Image"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Drag and drop or click to browse
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
