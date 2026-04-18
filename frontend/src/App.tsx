import { useReducer } from "react";
import { AnalyzeButton } from "./components/AnalyzeButton";
import { DateRangePicker } from "./components/DateRangePicker";
import { FileUpload } from "./components/FileUpload";
import { LandingPage } from "./components/LandingPage";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ResultReport } from "./components/ResultReport";
import { SpeakerSelect } from "./components/SpeakerSelect";
import { analyze, parseFile } from "./lib/api";
import { initialState, reducer } from "./lib/reducer";

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleFile = async (file: File) => {
    dispatch({ type: "PARSE_START" });
    try {
      const parsed = await parseFile(file);
      dispatch({ type: "PARSE_OK", parsed });
    } catch (e) {
      dispatch({
        type: "FAIL",
        message: e instanceof Error ? e.message : "파싱 실패",
      });
    }
  };

  const handleAnalyze = async () => {
    if (state.status !== "ready" || !state.selected || !state.dateFrom) return;
    dispatch({ type: "ANALYZE_START" });
    try {
      const result = await analyze(
        {
          target_speaker: state.selected,
          messages: state.parsed.messages,
          date_from: state.dateFrom,
          date_to: state.parsed.max_date,
        },
        (text) => dispatch({ type: "STREAM_CHUNK", text }),
        (stage) => dispatch({ type: "SET_STAGE", stage }),
      );
      dispatch({ type: "ANALYZE_OK", result });
    } catch (e) {
      dispatch({
        type: "FAIL",
        message: e instanceof Error ? e.message : "분석 실패",
      });
    }
  };

  const isLanding = state.status === "landing";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 네비게이션 바 */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => dispatch({ type: "RESET" })}
            className="flex items-center gap-2 transition hover:opacity-70"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">🧠</span>
            <span className="text-sm font-bold text-slate-900">MBTI Analyzer</span>
          </button>
          {!isLanding && (
            <button
              type="button"
              onClick={() => dispatch({ type: "RESET" })}
              className="text-sm text-slate-400 transition hover:text-slate-700"
            >
              ← 처음으로
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-xl space-y-6 px-4 py-10">

        {state.status === "landing" && (
          <LandingPage onStart={() => dispatch({ type: "START" })} />
        )}

        {(state.status === "idle" || state.status === "parsing") && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">파일 업로드</h2>
              <p className="mt-1 text-sm text-slate-500">
                카카오톡 iOS 내보내기 .txt 파일을 선택하세요
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <FileUpload
                onFile={handleFile}
                disabled={state.status === "parsing"}
              />
              {state.status === "parsing" && (
                <div className="mt-4 text-center text-sm text-slate-500">파일 읽는 중...</div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                카카오톡 내보내기 방법 (iOS)
              </p>
              <ol className="space-y-2">
                {[
                  "분석할 대화방을 엽니다",
                  "우측 상단 ≡ 메뉴를 탭합니다",
                  "\"대화 내용 내보내기\"를 선택합니다",
                  "\"텍스트\" 형식으로 내보낸 뒤 .txt 파일을 저장합니다",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {state.status === "ready" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">분석 설정</h2>
              <p className="mt-1 text-sm text-slate-500">
                분석할 화자와 기간을 선택하세요
              </p>
            </div>
          <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
            <SpeakerSelect
              speakers={state.parsed.speakers}
              messages={state.parsed.messages}
              selected={state.selected}
              onSelect={(speaker) => dispatch({ type: "SELECT", speaker })}
            />
            {state.selected && (
              <DateRangePicker
                minDate={state.parsed.min_date}
                maxDate={state.parsed.max_date}
                messages={state.parsed.messages}
                selectedSpeaker={state.selected}
                dateFrom={state.dateFrom}
                onDateFrom={(date) => dispatch({ type: "SET_DATE_FROM", date })}
              />
            )}
            <AnalyzeButton
              disabled={!state.selected || !state.dateFrom}
              onClick={handleAnalyze}
            />
          </div>
          </div>
        )}

        {state.status === "analyzing" && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <LoadingSpinner streamText={state.streamText} currentStage={state.currentStage} />
          </div>
        )}

        {state.status === "done" && (
          <ResultReport
            speaker={state.selected}
            result={state.result}
            onReset={() => dispatch({ type: "RESET" })}
          />
        )}

        {state.status === "error" && (
          <div className="rounded-2xl bg-red-50 p-6 text-center">
            <div className="text-red-700">{state.message}</div>
            <button
              type="button"
              onClick={() => dispatch({ type: "RESET" })}
              className="mt-4 rounded-xl bg-white px-6 py-3 text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              다시 시작
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

