import { useRef, type ChangeEvent } from "react";

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

export function FileUpload({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="text-lg font-medium text-slate-700">
          카카오톡 대화 파일 업로드
        </div>
        <div className="mt-2 text-sm text-slate-500">
          iOS 내보내기 .txt 파일을 선택하세요
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
