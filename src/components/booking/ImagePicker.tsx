import { useRef } from 'react';
import { Camera, ImagePlus } from 'lucide-react';

interface ImagePickerProps {
  onFiles: (files: FileList) => void;
}

export default function ImagePicker({ onFiles }: ImagePickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="flex gap-3 mt-3">
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-input border border-border/60 rounded-md text-text-s active:text-text-p active:bg-elevated transition-colors cursor-pointer press-scale min-h-[48px]"
      >
        <Camera size={18} />
        <span className="text-sm">Camera</span>
      </button>
      <button
        type="button"
        onClick={() => galleryRef.current?.click()}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-input border border-border/60 rounded-md text-text-s active:text-text-p active:bg-elevated transition-colors cursor-pointer press-scale min-h-[48px]"
      >
        <ImagePlus size={18} />
        <span className="text-sm">Gallery</span>
      </button>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
