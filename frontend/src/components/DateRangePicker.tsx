import type { Message } from "../types/api";

const MAX_CHARS = 6000;
const MIN_MESSAGES = 20;

// 최신 메시지부터 역순으로 누적해 6000자 한도 내 최초 날짜를 반환
function computeEarliestAllowedDate(messages: Message[], maxDate: string): string {
  let total = 0;
  let earliest = maxDate;
  const inRange = messages.filter((m) => m.date <= maxDate).reverse();
  for (const m of inRange) {
    total += m.text.length + 10;
    if (total > MAX_CHARS) break;
    earliest = m.date;
  }
  return earliest;
}

// 이 날짜부터 끝까지 타겟 화자 메시지가 정확히 MIN_MESSAGES개인 날짜 (선택 가능한 최대 시작일)
function computeLatestStartDate(messages: Message[], maxDate: string, speaker: string): string {
  const inRange = messages.filter((m) => m.date <= maxDate);
  let count = 0;
  for (let i = inRange.length - 1; i >= 0; i--) {
    if (inRange[i].speaker === speaker) {
      count++;
      if (count === MIN_MESSAGES) return inRange[i].date;
    }
  }
  return "";
}

type Props = {
  minDate: string;
  maxDate: string;
  messages: Message[];
  selectedSpeaker: string;
  dateFrom: string | null;
  onDateFrom: (date: string) => void;
};

export function DateRangePicker({
  minDate,
  maxDate,
  messages,
  selectedSpeaker,
  dateFrom,
  onDateFrom,
}: Props) {
  const earliestAllowed = computeEarliestAllowedDate(messages, maxDate);
  const latestStart = computeLatestStartDate(messages, maxDate, selectedSpeaker);

  if (!latestStart) {
    return (
      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
        해당 화자의 메시지가 {MIN_MESSAGES}개 미만이라 분석이 어렵습니다.
      </div>
    );
  }

  // 선택한 날짜에 대한 안내 메시지 계산
  let hint: { type: "warn" | "info"; text: string } | null = null;
  if (dateFrom) {
    if (dateFrom > latestStart) {
      hint = {
        type: "warn",
        text: `분석하려면 메시지가 ${MIN_MESSAGES}개 이상 필요해요. 시작일을 ${latestStart} 이전으로 선택해주세요.`,
      };
    } else if (dateFrom < earliestAllowed) {
      hint = {
        type: "warn",
        text: `선택한 범위가 너무 넓어요. 시작일을 ${earliestAllowed} 이후로 선택해주세요.`,
      };
    } else {
      const ranged = messages.filter((m) => m.date >= dateFrom && m.date <= maxDate);
      const targetCount = ranged.filter((m) => m.speaker === selectedSpeaker).length;
      const estimatedChars = ranged.reduce((sum, m) => sum + m.text.length + 10, 0);
      hint = {
        type: "info",
        text: `선택 범위: ${targetCount}개 메시지, 약 ${estimatedChars.toLocaleString()}자`,
      };
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        분석 시작일 선택
      </label>

      {hint && (
        <p className={`text-sm ${hint.type === "warn" ? "text-amber-600" : "text-slate-500"}`}>
          {hint.text}
        </p>
      )}

      <div className="flex items-center gap-3">
        <input
          type="date"
          min={minDate}
          max={maxDate}
          value={dateFrom ?? ""}
          onChange={(e) => onDateFrom(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <span className="text-slate-400">~</span>
        <span className="text-sm text-slate-500">{maxDate} (마지막 날짜)</span>
      </div>
    </div>
  );
}
