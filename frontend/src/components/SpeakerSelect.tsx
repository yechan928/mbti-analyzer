import type { Message } from "../types/api";

type Props = {
  speakers: string[];
  messages: Message[];
  selected: string | null;
  onSelect: (speaker: string) => void;
};

export function SpeakerSelect({
  speakers,
  messages,
  selected,
  onSelect,
}: Props) {
  const messageCount = selected
    ? messages.filter((m) => m.speaker === selected).length
    : 0;

  return (
    <div className="w-full">
      <label className="mb-2 block text-sm font-medium text-slate-700">
        분석할 화자 선택
      </label>
      <select
        value={selected ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <option value="" disabled>
          화자를 선택하세요
        </option>
        {speakers.map((speaker) => (
          <option key={speaker} value={speaker}>
            {speaker}
          </option>
        ))}
      </select>
      {selected && messageCount < 3 && (
        <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          ⚠ 메시지가 {messageCount}개뿐이라 분석 정확도가 낮을 수 있어요
        </div>
      )}
      {selected && messageCount >= 3 && (
        <div className="mt-2 text-sm text-slate-500">
          메시지 {messageCount}개
        </div>
      )}
    </div>
  );
}
