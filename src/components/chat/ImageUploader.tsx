import React, { useRef } from "react";
import { Paperclip } from "lucide-react";

interface ImageUploaderProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      // Reset input value to allow uploading same file again
      e.target.value = "";
    }
  };

  return (
    <div className="inline-block">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#1a1a1a] text-zinc-400 hover:text-zinc-150 hover:bg-zinc-800 disabled:opacity-40 transition cursor-pointer"
        title="Upload Image (PNG, JPEG, WEBP)"
      >
        <Paperclip size={14} />
      </button>
    </div>
  );
};
