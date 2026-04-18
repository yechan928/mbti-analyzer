import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

const MBTI_FACTS = [
  "MBTI는 1940년대 Isabel Briggs Myers와 그녀의 어머니가 개발했어요.",
  "전 세계에서 매년 약 5천만 명이 MBTI 검사를 받아요.",
  "가장 흔한 유형은 ISFJ로 전체 인구의 약 14%를 차지해요.",
  "가장 드문 유형은 INFJ로 전체 인구의 약 1~2%예요.",
  "E(외향)와 I(내향)는 에너지를 어디서 얻는지를 나타내요.",
  "S(감각)와 N(직관)은 정보를 어떻게 인식하는지를 나타내요.",
  "T(사고)와 F(감정)는 결정을 어떻게 내리는지를 나타내요.",
  "J(판단)와 P(인식)는 외부 세계를 어떻게 대하는지를 나타내요.",
  "같은 유형이라도 개인마다 성격이 다를 수 있어요. MBTI는 경향성이에요.",
  "대화 스타일만으로도 E/I, J/P 성향이 꽤 잘 드러나요.",
  "카카오톡 답장 속도와 길이도 성격 유형의 단서가 될 수 있어요.",
];

const FACT_INTERVAL = 4; // 초마다 팁 전환

type Props = {
  streamText: string;
  currentStage: string;
};

export function LoadingSpinner({ streamText, currentStage }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // 팁 페이드 전환
  useEffect(() => {
    if (streamText) return;
    const id = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setFactIndex((i) => (i + 1) % MBTI_FACTS.length);
        setFadeIn(true);
      }, 300);
    }, FACT_INTERVAL * 1000);
    return () => clearInterval(id);
  }, [streamText]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamText]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeLabel = minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* 상태 바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          <span className="text-sm font-medium text-slate-600">
            {currentStage || "분석 준비 중"}
          </span>
        </div>
        <span className="text-xs text-slate-400">{timeLabel}</span>
      </div>

      {streamText ? (
        /* 토큰 도착 후 — 스트리밍 보고서 */
        <div
          ref={scrollRef}
          className="h-72 overflow-y-auto rounded-xl bg-slate-50 p-4 text-sm"
        >
          <article className="prose prose-sm prose-slate max-w-none">
            <ReactMarkdown>{streamText}</ReactMarkdown>
          </article>
        </div>
      ) : (
        /* 첫 토큰 전 — MBTI 정보 */
        <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 p-6 text-center">
          <span className="text-2xl">🧠</span>
          <p
            className="text-sm leading-relaxed text-slate-500 transition-opacity duration-300"
            style={{ opacity: fadeIn ? 1 : 0 }}
          >
            {MBTI_FACTS[factIndex]}
          </p>
          <p className="text-xs text-slate-300">AI가 대화를 분석하는 동안 잠시 읽어보세요</p>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">최대 2분 정도 걸릴 수 있어요</p>
    </div>
  );
}
