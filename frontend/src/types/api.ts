export type Message = {
  speaker: string;
  text: string;
  date: string; // "YYYY-MM-DD"
};

export type ParseResponse = {
  messages: Message[];
  speakers: string[];
  min_date: string; // "YYYY-MM-DD"
  max_date: string; // "YYYY-MM-DD"
};

export type AnalyzeRequest = {
  target_speaker: string;
  messages: Message[];
  date_from: string; // "YYYY-MM-DD"
  date_to: string;   // "YYYY-MM-DD"
};

export type AnalyzeResponse = {
  mbti: string;
  report_markdown: string;
  message_count: number;
};
