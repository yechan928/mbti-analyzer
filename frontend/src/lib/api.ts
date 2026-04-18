import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ParseResponse,
} from "../types/api";

const BASE_URL = "http://localhost:8000";

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const json = await res.json();
    return json.detail ?? "알 수 없는 오류";
  } catch {
    return await res.text() || "알 수 없는 오류";
  }
}

export async function parseFile(file: File): Promise<ParseResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/parse`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }
  return res.json();
}

export async function analyze(
  req: AnalyzeRequest,
  onToken: (text: string) => void,
  onStage: (stage: string) => void,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = JSON.parse(line.slice(6));
      if (data.type === "stage") {
        onStage(data.text);
      } else if (data.type === "token") {
        onToken(data.text);
      } else if (data.type === "done") {
        return { mbti: data.mbti, report_markdown: data.report };
      } else if (data.type === "error") {
        throw new Error(data.message);
      }
    }
  }
  throw new Error("스트림이 예기치 않게 종료됐어요");
}
