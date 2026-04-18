import type { AnalyzeResponse, ParseResponse } from "../types/api";

export type State =
  | { status: "landing" }
  | { status: "idle" }
  | { status: "parsing" }
  | {
      status: "ready";
      parsed: ParseResponse;
      selected: string | null;
      dateFrom: string | null;
    }
  | { status: "analyzing"; parsed: ParseResponse; selected: string; dateFrom: string; streamText: string; currentStage: string }
  | {
      status: "done";
      parsed: ParseResponse;
      selected: string;
      result: AnalyzeResponse;
    }
  | { status: "error"; message: string };

export type Action =
  | { type: "START" }
  | { type: "PARSE_START" }
  | { type: "PARSE_OK"; parsed: ParseResponse }
  | { type: "SELECT"; speaker: string }
  | { type: "SET_DATE_FROM"; date: string }
  | { type: "ANALYZE_START" }
  | { type: "STREAM_CHUNK"; text: string }
  | { type: "SET_STAGE"; stage: string }
  | { type: "ANALYZE_OK"; result: AnalyzeResponse }
  | { type: "FAIL"; message: string }
  | { type: "RESET" };

export const initialState: State = { status: "landing" };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START":
      return { status: "idle" };
    case "PARSE_START":
      return { status: "parsing" };
    case "PARSE_OK":
      return { status: "ready", parsed: action.parsed, selected: null, dateFrom: null };
    case "SELECT":
      if (state.status !== "ready") return state;
      return { ...state, selected: action.speaker };
    case "SET_DATE_FROM":
      if (state.status !== "ready") return state;
      return { ...state, dateFrom: action.date };
    case "ANALYZE_START":
      if (state.status !== "ready" || !state.selected || !state.dateFrom) return state;
      return {
        status: "analyzing",
        parsed: state.parsed,
        selected: state.selected,
        dateFrom: state.dateFrom,
        streamText: "",
        currentStage: "",
      };
    case "SET_STAGE":
      if (state.status !== "analyzing") return state;
      return { ...state, currentStage: action.stage };
    case "STREAM_CHUNK":
      if (state.status !== "analyzing") return state;
      return { ...state, streamText: state.streamText + action.text };
    case "ANALYZE_OK":
      if (state.status !== "analyzing") return state;
      return {
        status: "done",
        parsed: state.parsed,
        selected: state.selected,
        result: action.result,
      };
    case "FAIL":
      return { status: "error", message: action.message };
    case "RESET":
      return { status: "landing" };
    default:
      return state;
  }
}
