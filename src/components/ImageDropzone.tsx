import { useRef, useState } from 'react';
import { UploadCloud, ImagePlus } from 'lucide-react';

interface ImageDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  label?: string;
}

export function ImageDropzone({
  onFileSelected,
  disabled = false,
  label = 'اسحب الصورة وأفلتها هنا، أو اضغط لاختيار ملف',
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFileSelected(files[0]);
  };

  const handleCreateSampleImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 1200, 800);
    grad.addColorStop(0, '#081912');
    grad.addColorStop(0.5, '#13422E');
    grad.addColorStop(1, '#2D1E4F');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 800);

    // Geometric rings
    ctx.strokeStyle = '#A3E635';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(600, 400, 210, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(167, 139, 250, 0.7)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(600, 400, 280, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#F2F7F4';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DAQ · دقيقة', 600, 415);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const sampleFile = new File([blob], 'daq-sample.png', { type: 'image/png' });
      onFileSelected(sampleFile);
    }, 'image/png');
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-2xl border-2 border-dashed p-5 sm:p-8 text-center transition-colors ${
          isDragging
            ? 'border-[#65A30D] dark:border-[#A3E635] bg-[#A3E635]/10'
            : 'border-[#BFD3C4] dark:border-[#244E3B] bg-[#F4F8F5] dark:bg-[#081912]/70 hover:border-[#65A30D] dark:hover:border-[#A3E635]/60'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          aria-label="اختيار صورة للرفع"
          className="sr-only"
          id="daq-image-upload-input"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#EAF2EC] dark:bg-[#143326] text-[#4D7C0F] dark:text-[#A3E635] flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">{label}</p>
            <p className="text-xs text-[#5B7869] dark:text-[#86A896] mt-1">
              الصيغ المدعومة: JPG, PNG, WebP · المعالجة تتم محلياً بالكامل
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 mt-1 w-full sm:w-auto">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              <ImagePlus className="w-4 h-4 shrink-0" />
              <span>اختيار صورة من جهازك</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={handleCreateSampleImage}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] dark:hover:border-[#A3E635]/60 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>تجربة بصورة جاهزة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
