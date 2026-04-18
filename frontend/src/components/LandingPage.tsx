type Props = {
  onStart: () => void;
};

const STEPS = [
  {
    num: "01",
    title: "대화 내보내기",
    desc: "카카오톡 대화방 → 우측 상단 메뉴 → 대화 내용 내보내기",
    icon: "💬",
  },
  {
    num: "02",
    title: "파일 업로드",
    desc: "내보낸 .txt 파일을 업로드하세요",
    icon: "📂",
  },
  {
    num: "03",
    title: "화자 선택 후 분석",
    desc: "분석할 인물과 기간을 고르면 AI가 MBTI를 추정합니다",
    icon: "🔍",
  },
];

export function LandingPage({ onStart }: Props) {
  return (
    <div className="space-y-8">
      {/* 히어로 */}
      <div className="rounded-2xl bg-white px-8 py-14 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white shadow">
          🧠
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          MBTI Analyzer
        </h1>
        <p className="mt-3 text-base text-slate-500">
          카카오톡 대화를 업로드하면<br />AI가 특정 인물의 MBTI를 추정해드립니다
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
        >
          무료로 시작하기
          <span aria-hidden>→</span>
        </button>
        <p className="mt-3 text-xs text-slate-400">
          파일은 서버에 저장되지 않습니다
        </p>
      </div>

      {/* 사용 방법 */}
      <div>
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-slate-400">
          사용 방법
        </p>
        <div className="grid gap-3">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="flex items-start gap-4 rounded-2xl bg-white px-6 py-5 shadow-sm"
            >
              <span className="text-2xl">{step.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400">{step.num}</span>
                  <span className="text-sm font-semibold text-slate-800">{step.title}</span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
