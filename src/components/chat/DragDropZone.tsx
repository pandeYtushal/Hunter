import React, { useState, useEffect } from "react";
import { Upload } from "lucide-react";

interface DragDropZoneProps {
  onDropFile: (file: File) => void;
  children: React.ReactNode;
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({ onDropFile, children }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onDropFile(files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 flex flex-col min-h-0"
    >
      {isDragging && (
        <div className="absolute inset-0 bg-[#0c0c0e]/85 backdrop-blur-sm border-2 border-dashed border-[#ff6b35] m-3 rounded-2xl flex flex-col items-center justify-center gap-3 z-50 animate-scale-up select-none pointer-events-none">
          <Upload className="h-10 w-10 text-[#ff6b35] animate-bounce" />
          <h3 className="text-sm font-bold text-zinc-150 uppercase tracking-wider">Drop Image to Attach</h3>
          <p className="text-xs text-zinc-500 font-medium">Supports PNG, JPEG, WEBP files up to 5MB</p>
        </div>
      )}
      {children}
    </div>
  );
};
