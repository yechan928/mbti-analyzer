import html2canvas from "html2canvas";
import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { AnalyzeResponse } from "../types/api";

type Props = {
  speaker: string;
  result: AnalyzeResponse;
  onReset: () => void;
};

export function ResultReport({ speaker, result, onReset }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("캡처 실패"))), "image/png")
      );
      const file = new File([blob], `mbti-${speaker}-${result.mbti || "result"}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${speaker}님의 MBTI 분석 결과` });
      } else {
        // 파일 공유 미지원 — 이미지 다운로드로 폴백
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        alert("이미지 생성에 실패했어요");
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.report_markdown);
      alert("결과가 클립보드에 복사됐어요");
    } catch {
      alert("복사 실패 — 브라우저가 클립보드 접근을 막았어요");
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("캡처 실패"))), "image/png")
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `mbti-${speaker}-${result.mbti || "result"}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("이미지 생성에 실패했어요");
    }
  };

  return (
    <div className="space-y-6">
      <div ref={cardRef} className="space-y-6">
        {result.mbti && (
          <div className="rounded-2xl bg-indigo-50 p-8 text-center">
            <div className="text-sm font-medium text-indigo-600">
              {speaker}님의 추정 MBTI
            </div>
            <div className="mt-2 text-6xl font-bold tracking-wider text-indigo-700">
              {result.mbti}
            </div>
          </div>
        )}

        <article className="prose prose-slate max-w-none rounded-2xl bg-white p-8 shadow-sm">
          <ReactMarkdown>{result.report_markdown}</ReactMarkdown>
        </article>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 rounded-xl bg-indigo-600 px-6 py-3 text-white shadow-sm transition hover:bg-indigo-700"
        >
          공유하기
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-6 py-3 text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          복사하기
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-6 py-3 text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          다운로드
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 rounded-xl bg-slate-800 px-6 py-3 text-white shadow-sm transition hover:bg-slate-900"
        >
          다시 분석하기
        </button>
      </div>
    </div>
  );
}
