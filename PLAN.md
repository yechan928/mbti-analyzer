# MBTI Analyzer — 구현 계획

## Context

**목표**: 카카오톡 iOS 내보내기 `.txt` 파일을 업로드해 특정 화자의 MBTI를 추정하는 웹 서비스 MVP를 2주 안에 만든다.

**배경**: 기존 MBTI 검사는 번거로움. 평소 대화로 자연스럽게 추정하고 싶음. 개발자 본인·지인에게 보여줄 용도.

**이번 결정의 핵심**: 응답을 **SSE 스트리밍 대신 단순 HTTP POST + JSON**으로 간다. 사용자가 원하는 것은 "보고서 형식"의 완성된 결과물이고, 실시간 스트리밍은 불필요. 이 변경은 SPEC.md보다 우선이며 승인 후 SPEC.md도 함께 업데이트한다.

**소스 오브 트루스**: `/Users/gim-yechan/Desktop/AI Program Sprint/mbti-analyzer/SPEC.md` (단, SSE 관련 문구는 이 계획 승인 후 교체)

---

## 방향 개요

- 백엔드: **FastAPI 단일 `main.py`**. `GET /api/health`, `POST /api/parse`, `POST /api/analyze` 3개 엔드포인트. Ollama `gemma4:e4b` 동기 호출 후 마크다운 보고서 반환.
- 프론트: **React + Vite + TS + Tailwind + react-markdown**. `useReducer` 상태 머신 하나로 `idle → parsing → ready → analyzing → done/error` 제어. 결과는 `<article className="prose prose-slate">`로 렌더.
- 파싱: iOS 카카오톡 정규식 파서, 실패 라인은 **조용히 스킵**. `ChatParser` Protocol로 추상화(유일한 사전 추상화 예외).
- LLM 응답 포맷: `## 이 사람의 MBTI는 XXXX입니다` 헤더 → 성격 특징 → 축별 분석(E/I, S/N, T/F, J/P) → 종합 해석 → 신뢰도.

---

## A. 스캐폴딩

### 디렉토리
`/Users/gim-yechan/Desktop/AI Program Sprint/mbti-analyzer/` 아래에 `backend/`, `frontend/` 생성.

### Frontend
```bash
cd mbti-analyzer
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D tailwindcss@3 postcss autoprefixer @tailwindcss/typography
npx tailwindcss init -p
npm install react-markdown
```
- `tailwind.config.js`: `content: ["./index.html","./src/**/*.{ts,tsx}"]`, `plugins: [require('@tailwindcss/typography')]`
- `src/index.css`: `@tailwind base; @tailwind components; @tailwind utilities;`
- 기본 스캐폴드의 `App.css`·starter 에셋은 사용자 확인 후 삭제

### Backend
```bash
cd mbti-analyzer && mkdir backend && cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi "uvicorn[standard]" pydantic ollama rich python-multipart
pip freeze > requirements.txt
```

### Ollama (사용자가 직접)
```bash
ollama serve &
ollama pull gemma4:e4b
ollama list
```

### 파일 트리 (스캐폴드 후)
```
mbti-analyzer/
  SPEC.md
  backend/
    .venv/  main.py  requirements.txt  samples/
  frontend/
    index.html  package.json  tailwind.config.js  postcss.config.js
    src/
      main.tsx  App.tsx  index.css
      components/  lib/  types/
```

---

## B. Backend (우선순위 1)

**파일**: `backend/main.py` 단일 파일로 시작. 순서: imports → Pydantic 모델 → `ChatParser` Protocol + `KakaoIOSParser` → 프롬프트 상수 → Ollama 헬퍼 → FastAPI app + CORS → 라우트.

### Pydantic 모델
```python
class Message(BaseModel):
    speaker: str
    text: str

class ParseResponse(BaseModel):
    messages: list[Message]
    speakers: list[str]

class AnalyzeRequest(BaseModel):
    target_speaker: str
    messages: list[Message]

class AnalyzeResponse(BaseModel):
    mbti: str              # 마크다운에서 regex로 추출, 없으면 ""
    report_markdown: str
    message_count: int
```

### 엔드포인트
- `GET /api/health` → `{"status":"ok","ollama":<bool>}`. Ollama는 `ollama.list()` try/except로 체크.
- `POST /api/parse` (multipart) → `UploadFile` 받아 UTF-8 `errors="replace"`로 디코드 후 `KakaoIOSParser().parse()` → `ParseResponse`.
- `POST /api/analyze` (JSON) → 아래 로직:
  1. `target_speaker`가 `messages`에 존재하는지 확인
  2. 해당 화자의 메시지만 필터
  3. 필터 결과 < 20개면 400 + `"분석하려면 해당 화자의 메시지가 20개 이상 필요합니다."`
  4. 프롬프트 조립 후 `ollama.chat(model="gemma4:e4b", options={"temperature":0.3,"seed":42,"num_ctx":8192})` 동기 호출
  5. 마크다운에서 `r"\b([IE][NS][TF][JP])\b"`로 MBTI 추출(실패 시 `""`)
  6. `AnalyzeResponse` 반환
- try/except는 Ollama 호출 한 곳만 (1 레벨). `ConnectionError`/`ollama.ResponseError`/`Exception` → `HTTPException(503, "Ollama 호출 실패: {reason}")`.

### CORS
```python
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"], allow_headers=["*"])
```

### 프롬프트 (한국어 고정)

**System prompt**:
```
너는 MBTI 전문 분석가다. 주어진 카카오톡 대화 메시지들을 읽고,
지정된 화자의 MBTI(16유형 표준)를 추정해 한국어 마크다운 보고서로만 응답한다.

규칙:
- 반드시 아래 형식을 정확히 따른다.
- 모든 판단은 실제 메시지의 구체적 표현을 근거로 인용한다.
- 4개 축(E/I, S/N, T/F, J/P)을 각각 판단하고 근거를 제시한다.
- 한국어로만 작성. 영어 섞지 말 것.
- 추가 설명, 인사말, 면책조항 금지. 보고서만 출력.

형식:
## 이 사람의 MBTI는 XXXX입니다

### 성격 특징
- 3~5개 핵심 특징 bullet

### 축별 분석
#### E vs I — 결과: X
근거: ...

#### S vs N — 결과: X
근거: ...

#### T vs F — 결과: X
근거: ...

#### J vs P — 결과: X
근거: ...

### 종합 해석
2~4문장.

### 신뢰도
상/중/하 중 하나 + 한 문장 이유.
```

**User prompt 템플릿**:
```
분석 대상 화자: {target_speaker}
메시지 수: {count}

메시지:
{joined_messages}
```
`joined_messages = "\n".join(f"- {m.text}" for m in filtered)`. 총 길이가 6000자 넘으면 최신 기준 6000자로 잘라냄.

---

## C. Parser (우선순위 2)

### 인터페이스 (Protocol)
```python
class ChatParser(Protocol):
    def parse(self, raw: str) -> ParseResponse: ...
```

### `KakaoIOSParser`
**정규식**:
```python
LINE_RE = re.compile(
    r"^\d{4}\.\s\d{1,2}\.\s\d{1,2}\.\s(?:오전|오후)\s\d{1,2}:\d{2},\s(?P<speaker>.+?)\s:\s(?P<text>.*)$"
)
```

**알고리즘**:
1. `\n` 기준 split
2. 라인이 `LINE_RE` 매칭 → 이전 버퍼 플러시 후 새 메시지 시작
3. 매칭 안 되고 버퍼 있으면 다중 라인 메시지로 간주 → 텍스트에 `"\n" + line.strip()` 추가
4. 시스템/노이즈 라인은 스킵: `"저장한 날짜 :"`, `"---------------"`, `"님이 들어왔습니다"`, `"님이 나갔습니다"`, `"방장이"`, `"샵검색:"`
5. 화자 이름 공격적 정규화: `re.sub(r"\s+", "", name)`
6. 화자 리스트는 순서 보존 + dedupe
7. 파싱 실패 라인은 **조용히 스킵, raise 금지**

---

## D. Frontend (우선순위 3–4)

### `src/` 구조
```
src/
  main.tsx  App.tsx  index.css
  components/
    FileUpload.tsx
    SpeakerSelect.tsx
    AnalyzeButton.tsx
    LoadingSpinner.tsx
    ResultReport.tsx
  lib/
    api.ts
    reducer.ts
  types/
    api.ts
```

### `src/types/api.ts` (Pydantic 미러)
```ts
export type Message = { speaker: string; text: string };
export type ParseResponse = { messages: Message[]; speakers: string[] };
export type AnalyzeRequest = { target_speaker: string; messages: Message[] };
export type AnalyzeResponse = { mbti: string; report_markdown: string; message_count: number };
```

### 상태 머신 (`src/lib/reducer.ts`)
```ts
type State =
  | { status: "idle" }
  | { status: "parsing" }
  | { status: "ready"; parsed: ParseResponse; selected: string | null }
  | { status: "analyzing"; parsed: ParseResponse; selected: string }
  | { status: "done"; parsed: ParseResponse; selected: string; result: AnalyzeResponse }
  | { status: "error"; message: string };
```
Actions: `PARSE_START`, `PARSE_OK`, `SELECT`, `ANALYZE_START`, `ANALYZE_OK`, `FAIL`, `RESET`.

### API 클라이언트 (`src/lib/api.ts`)
- `parseFile(file: File): Promise<ParseResponse>` — FormData POST `/api/parse`
- `analyze(req: AnalyzeRequest): Promise<AnalyzeResponse>` — JSON POST `/api/analyze`
- Base URL: `http://localhost:8000`
- 비 2xx 응답 → `throw new Error(await res.text())`

### 컴포넌트
- **FileUpload**: 숨겨진 `<input type="file" accept=".txt">` + 드롭 영역. 변경 시 `PARSE_START` 디스패치 → `api.parseFile` 호출 → `PARSE_OK`
- **SpeakerSelect**: `<select>`로 화자 목록 표시. 선택 화자의 메시지 수 < 3이면 경고 배지
- **AnalyzeButton**: `selected` 없으면 disabled. 클릭 시 `ANALYZE_START` → `api.analyze` → `ANALYZE_OK`
- **LoadingSpinner**: Tailwind `animate-spin`. `status === "analyzing"`일 때 표시. 문구: `"분석 중... 최대 2분 정도 걸릴 수 있어요"`
- **ResultReport**: `<article className="prose prose-slate max-w-none">` + `<ReactMarkdown>{result.report_markdown}</ReactMarkdown>`. `result.mbti` 있으면 상단에 큰 indigo 텍스트로 카드 표시

### 스타일 가이드
흰 배경, `max-w-3xl` 중앙 컨테이너, `bg-white rounded-2xl shadow-sm p-6` 카드, slate 중립 + indigo 포인트. 반응형은 `sm:`/`md:` breakpoint. 폰트 시스템 기본.

### `App.tsx`
단일 `useReducer`. `state.status`에 따른 조건부 렌더. 200줄 넘어가면 상태별 섹션을 child 컴포넌트로 추출.

---

## E. End-to-End 통합 (우선순위 5)

### 실행 순서
1. Terminal A: `ollama serve` (미실행 시)
2. Terminal B: `cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000`
3. Terminal C: `cd frontend && npm run dev` → http://localhost:5173

### 수동 스모크 테스트
1. `curl http://localhost:8000/api/health` → `{"status":"ok","ollama":true}` 확인
2. 프론트에서 샘플 `.txt`(50+ 메시지, 2 화자 이상) 업로드
3. 화자 드롭다운에 목록 표시되는지 확인
4. ≥20 메시지 가진 화자 선택 후 "분석하기" 클릭
5. 스피너 표시 → ~30~120초 내 마크다운 보고서 렌더
6. `## 이 사람의 MBTI는 XXXX입니다` 헤더 + 4축 + 종합 해석 + 신뢰도 섹션 모두 존재 확인

### 샘플 파일
사용자가 `backend/samples/`에 카카오톡 iOS 내보내기 3개 배치 (소/중/대). 소: ~20 메시지 (엣지케이스), 중: ~200, 대: ~1000+ (잘라내기 검증).

---

## F. 검증 전략

| 단계 | 다음 단계 넘어가기 전 확인 |
|---|---|
| A 스캐폴딩 | `npm run dev` 빈 페이지, `uvicorn main:app` `/docs` 동작 |
| B 엔드포인트 | mock 메시지로 `/api/analyze` 200 + markdown 반환 |
| B 프롬프트 품질 | 같은 입력 3회 → MBTI 헤더 항상 존재, 한국어, 4축 섹션 |
| C 파서 | 샘플 3개 입력 → 예외 없음, 화자 수 정확, 정상 라인 90% 이상 파싱 |
| D 컴포넌트 | 각 컴포넌트 mock props로 단독 렌더 |
| E 통합 | SPEC.md §7 성공 조건 5개 수동 통과 |

---

## G. 리스크 & 대응

1. **Ollama 응답 시간 30–120초** → 스피너 문구로 대기 시간 안내, fetch 클라이언트 타임아웃 설정 안 함
2. **프롬프트 품질 드리프트** (영어 섞임, 포맷 깨짐) → 프롬프트만 수정(SPEC 규칙). 골든 샘플 3개로 회귀 테스트
3. **iOS 포맷 변종** (로케일, 첨부파일 `사진`·`이모티콘` 라인) → 파서는 실패 라인 조용히 스킵, 실제 샘플에서 새 패턴 발견 시 정규식에 추가
4. **TS/Python 타입 드리프트** → `src/types/api.ts`를 Pydantic 수동 미러로 단일 소스. `AnalyzeResponse` 변경 시 양쪽 diff 확인
5. **Ollama 서버 꺼짐 / 모델 미설치** → 앱 마운트 시 `/api/health` 호출, `ollama: false`면 배너 `"로컬 Ollama 서버가 꺼져 있습니다. ollama serve && ollama pull gemma4:e4b"`

---

## H. 하지 말 것 (재확인)

로그인·DB·OCR·안드로이드 포맷·카톡 계정 연동·완벽한 에러 처리·히스토리 캐싱·i18n·SNS 공유·MBTI 다이론 혼합. **+ SSE 스트리밍 없음** (이번 결정).

---

## I. SPEC.md 업데이트 목록 (승인 후 첫 작업)

1. **§2 표 Frontend 행**: "SSE 스트리밍 처리 패턴 검증됨" 제거 → "Pydantic↔TS 타입 일치로 API 계약 버그 차단, 단일 SPA에 최적"
2. **§2 표 Backend 행**: "스트리밍 응답 간단" 제거 → "Pydantic 모델로 API 계약 관리, Ollama Python SDK 직접 연동"
3. **§3 step 5**: "스트리밍으로 MBTI 결과 실시간 표시" → "분석 완료 후 마크다운 보고서 전체를 한 번에 표시 — `## 이 사람의 MBTI는 XXXX입니다` 헤더 + 성격 특징 + 축별 근거 + 종합 해석 + 신뢰도"
4. **§4-3 처리/출력**: "FastAPI → Ollama 스트리밍 호출" → "FastAPI → Ollama 동기 호출"; 출력 `"SSE 스트리밍 (마크다운 텍스트)"` → `"HTTP 200 JSON: { mbti, report_markdown, message_count }"`
5. **§4-4 입력/검증**: "스트리밍 분석 결과" → "분석 응답 JSON의 `report_markdown`"; "스트리밍 중 자동 스크롤" → "로딩 스피너 → 완료 시 보고서 전체 표시"
6. **§7 MVP 성공 조건**: "스트리밍 응답이 끊기지 않고 실시간 표시됨" → "분석 요청 후 로딩 표시 → 완료 시 마크다운 보고서가 한 번에 렌더링됨"

---

## 주요 파일 (생성 대상)

- `/Users/gim-yechan/Desktop/AI Program Sprint/mbti-analyzer/backend/main.py`
- `/Users/gim-yechan/Desktop/AI Program Sprint/mbti-analyzer/backend/requirements.txt`
- `/Users/gim-yechan/Desktop/AI Program Sprint/mbti-analyzer/frontend/src/App.tsx`
- `/Users/gim-yechan/Desktop/AI Program Sprint/mbti-analyzer/frontend/src/lib/api.ts`
- `/Users/gim-yechan/Desktop/AI Program Sprint/mbti-analyzer/frontend/src/lib/reducer.ts`
- `/Users/gim-yechan/Desktop/AI Program Sprint/mbti-analyzer/frontend/src/types/api.ts`
- `/Users/gim-yechan/Desktop/AI Program Sprint/mbti-analyzer/frontend/src/components/{FileUpload,SpeakerSelect,AnalyzeButton,LoadingSpinner,ResultReport}.tsx`

**재사용 가능한 기존 유틸리티**: 없음 (새 프로젝트).

---

## 검증(전체)

**MVP 성공 조건**
- [ ] iOS 카카오톡 `.txt` 업로드 시 오류 없이 화자 목록 출력
- [ ] 특정 화자 선택 → 해당 화자 기준 분석 수행
- [ ] MBTI 4글자 + 축별 근거 + 종합 해석이 마크다운으로 출력
- [ ] 분석 요청 후 로딩 표시 → 완료 시 보고서 한 번에 렌더링
- [ ] 모바일/데스크탑 레이아웃 깨지지 않음

**전체 플로우 테스트**
1. Ollama 서버 기동 + `gemma4:e4b` pull 확인
2. 백엔드 `uvicorn main:app --reload --port 8000` 기동
3. 프론트 `npm run dev` 기동 → http://localhost:5173
4. 샘플 `.txt` 업로드 → 화자 목록 확인
5. 20+ 메시지 화자 선택 → 분석하기 클릭
6. 보고서 렌더 확인 (헤더 + 4축 + 종합 해석 + 신뢰도)
7. 모바일 뷰 (devtools 반응형) 확인
