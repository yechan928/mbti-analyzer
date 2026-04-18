# CLAUDE.md — MBTI Analyzer

이 파일은 Claude Code가 매 세션마다 자동으로 로드하는 프로젝트 규칙 문서다.
여기에 적힌 규칙은 Claude의 기본값보다 우선하며, 실행 중 반드시 따라야 한다.

---

## 프로젝트 한 줄 요약

카카오톡 iOS 내보내기 `.txt`를 업로드해 특정 화자의 MBTI를 추정하고 마크다운 보고서를 반환하는 웹 서비스. 2주 MVP.

**스택**: React + Vite + TypeScript + Tailwind (frontend) / FastAPI + Pydantic + ollama SDK (backend) / Ollama `gemma4:e4b` (LLM, 로컬).

---

## 반드시 먼저 읽을 파일

작업 시작 전 아래 파일을 **이 순서대로** 읽는다.

1. `SPEC.md` — 프로젝트 스펙, 기술 결정, 의사결정 규칙(§5), 하지 말 것(§6), 검증 기준(§7)
2. `PLAN.md` — 승인된 구현 계획. 파일 구조, 프롬프트, 정규식, 컴포넌트 설계 등 구현 디테일

**우선순위**: `SPEC.md` > `CLAUDE.md` > `Plan` > 그 외.
세 문서가 충돌하면 SPEC.md가 이긴다. SPEC.md는 무단 수정 금지, 변경 필요 시 먼저 질문.

---

## AI 행동 제약 — 하드 룰

### 절대 하지 말 것

- **SPEC.md §6 "하지 말 것" 목록 건드리지 말 것**
  (로그인, DB, OCR, 안드로이드 포맷, 실시간 수집, 완벽한 에러 처리, 히스토리 캐싱, i18n, SNS 공유, 다이론 혼합, **SSE 스트리밍**)
- **새 의존성 추가 금지** — 승인된 의존성 표(아래)에 없는 패키지는 설치 전 반드시 사용자에게 질문. 승인 후 표 업데이트 필수
- **파일 삭제/덮어쓰기 금지** — Vite 스캐폴드의 `App.css`, `vite.svg` 등 사소한 파일도 삭제 전 질문
- **SPEC.md / 승인된 Plan 무단 수정 금지**
- **스코프 이탈 금지** — 요청받지 않은 리팩토링·추상화·"나중을 위한 설계" 추가 금지. `ChatParser` 인터페이스만 예외 (SPEC.md에 명시됨)
- **프로토타입 폴더 참조 금지** — `/Users/gim-yechan/Desktop/AI Program Sprint/prototype/` 절대 열지 말 것
- **Ollama 서버 자동 기동·모델 자동 pull 금지** — 사용자 수동 실행

### 반드시 할 것

- **애매하면 SPEC.md §5 의사결정 규칙을 순서대로 따른다.** 규칙에 답이 없을 때만 질문.
- **디자인 결정은 AI가 자율 판단.** 색/레이아웃/폰트 선택을 사용자에게 묻지 말 것. 기본 팔레트: Tailwind `slate` + `indigo`.
- **LLM 프롬프트 품질 이슈는 프롬프트만 수정.** 백엔드 로직·파싱 로직으로 해결하려 하지 말 것.
- **에러 메시지는 한국어 한 줄.** 스택 트레이스 노출 금지.
- **질문은 명확한 선택지 2~3개로.** 개방형 질문 지양.

---

## 사용자 수동 실행 명령

다음은 사용자가 직접 실행한다. Claude가 자동 실행하지 말 것.

| 명령 | 이유 |
|---|---|
| `ollama serve` | 로컬 LLM 서버 기동 |
| `ollama pull gemma4:e4b` | 모델 다운로드 (수 GB) |
| `ollama list` | 모델 확인 |
| `source .venv/bin/activate` | venv 첫 진입 |

### Claude가 실행 가능한 명령

- `npm install` / `pip install -r requirements.txt` — 이미 승인된 의존성 표 내용만
- `npm run dev` / `uvicorn main:app --reload` — 개발 서버
- `curl http://localhost:8000/api/health` — 동작 확인
- 파일 생성·편집 (SPEC.md와 Plan 제외)

---

## 의존성 표

**새 의존성 추가 절차**: (1) 사용자에게 질문 → (2) 승인 → (3) 설치 → (4) 이 표에 행 추가.

### Frontend (`frontend/package.json`)

| 패키지 | 용도 | 상태 |
|---|---|---|
| react | UI 프레임워크 | 초기 승인 |
| react-dom | React DOM 렌더링 | 초기 승인 |
| vite | 번들러·개발 서버 | 초기 승인 |
| typescript | 타입 시스템 | 초기 승인 |
| tailwindcss | 유틸리티 CSS | 초기 승인 |
| postcss | CSS 처리 (tailwind 의존성) | 초기 승인 |
| autoprefixer | 벤더 프리픽스 (tailwind 의존성) | 초기 승인 |
| @tailwindcss/typography | 마크다운 `prose` 스타일 | 초기 승인 |
| react-markdown | 마크다운 렌더링 | 초기 승인 |
| html2canvas | 결과 카드 이미지 캡처 (공유하기) | 승인 2026-04-16 |

### Backend (`backend/requirements.txt`)

| 패키지 | 용도 | 상태 |
|---|---|---|
| fastapi | 웹 프레임워크 | 초기 승인 |
| uvicorn[standard] | ASGI 서버 | 초기 승인 |
| pydantic | 데이터 검증 | 초기 승인 |
| ollama | LLM SDK | 초기 승인 |
| rich | 로깅용 출력 | 초기 승인 |
| python-multipart | 파일 업로드 파싱 | 초기 승인 |

---

## 폴더 구조 (강제)

```
mbti-analyzer/
├── SPEC.md
├── CLAUDE.md
├── backend/
│   ├── main.py              # FastAPI app + CORS + 라우트만 (얇게)
│   ├── models.py            # Pydantic 모델 (Message, ParseResponse, AnalyzeRequest, AnalyzeResponse)
│   ├── parsing/
│   │   ├── __init__.py
│   │   ├── base.py          # ChatParser Protocol
│   │   └── kakao_ios.py     # iOS 포맷 파서 (정규식 + 다중라인 처리)
│   ├── analysis/
│   │   ├── __init__.py
│   │   ├── prompts.py       # 시스템/유저 프롬프트 상수
│   │   └── llm.py           # Ollama 호출 + MBTI 추출
│   ├── requirements.txt
│   ├── .venv/
│   └── samples/             # 테스트용 카톡 .txt
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── components/      # UI 컴포넌트만
        ├── lib/             # API 클라이언트, reducer
        └── types/           # Pydantic 미러 타입
```

**서브폴더 금지**. `src/components/forms/` 같은 추가 분류 만들지 말 것.

---

## 코드 스타일 요약

전체 규칙은 `SPEC.md §5` 참조. 핵심만 여기에 재명시.

### Python
- Pydantic 모델, type hint 필수
- 로깅은 `print()` 또는 `rich.print()`. `logging` 모듈 금지
- `try/except` 최대 1 레벨
- 함수 30줄, 파일 400줄 초과 시 분리 고려

### TypeScript
- `any` 금지. 불가피할 땐 `unknown` + 좁히기
- 상태 관리는 `useState` / `useReducer`만. Redux·Zustand·Recoil 금지
- 컴포넌트 파일 200줄 초과 시 분리
- Tailwind 유틸리티 우선, 커스텀 CSS는 `prose` 오버라이드 정도만

### 공통
- 주석은 WHY만. WHAT은 이름으로 설명
- 새 파일을 만드는 것보다 기존 파일 편집을 우선
- 문서 파일(`*.md`)은 사용자가 요청할 때만 생성

---

## 작업 시작 전 체크리스트

새 작업을 받으면 착수 전 확인:

1. [ ] `SPEC.md`와 최신 Plan 파일을 읽었는가?
2. [ ] 작업이 SPEC.md §6 "하지 말 것"과 충돌하지 않는가?
3. [ ] 새 의존성이 필요한가? 필요하다면 사용자에게 먼저 질문했는가?
4. [ ] 파일 삭제·덮어쓰기가 필요한가? 필요하다면 사용자에게 먼저 질문했는가?
5. [ ] 작업이 SPEC.md·Plan 범위 안에 있는가? 벗어나면 먼저 질문

## 작업 완료 전 체크리스트

구현 완료 후 확인:

1. [ ] 코드가 SPEC.md §5 의사결정 규칙을 따르는가?
2. [ ] 에러 메시지가 한국어 한 줄인가?
3. [ ] 새 의존성이 위 표에 등록되었는가?
4. [ ] 주석이 WHY만 남아 있는가?
5. [ ] 이름이 역할을 설명하는가? (약어·단축명 지양)
