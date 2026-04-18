# 🧠 MBTI Analyzer

카카오톡 대화를 업로드하면 AI가 특정 인물의 MBTI를 추정해주는 웹 서비스입니다.

---

## 실행 환경

| 항목 | 버전 |
|---|---|
| Python | 3.11 이상 |
| Node.js | 18 이상 |
| Ollama | 최신 버전 |
| LLM 모델 | gemma4:e2b |

---

## 설치 및 실행

### 1. 저장소 클론

```bash
git clone https://github.com/yechan928/mbti-analyzer.git
cd mbti-analyzer
```

### 2. Ollama 설치 및 모델 다운로드

[ollama.com](https://ollama.com) 에서 Ollama를 설치한 뒤 모델을 받아주세요.

```bash
ollama pull gemma4:e2b
```

> 모델 크기: 약 8GB. 다운로드에 시간이 걸릴 수 있습니다.

### 3. 백엔드 설치

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. 프론트엔드 설치

```bash
cd frontend
npm install
```

---

## 실행

터미널 3개를 열어 각각 실행합니다.

**터미널 1 — Ollama**
```bash
ollama serve
```

**터미널 2 — 백엔드**
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```

**터미널 3 — 프론트엔드**
```bash
cd frontend
npm run dev
```

브라우저에서 http://localhost:5173 접속

---

## 사용 방법

### 1. 카카오톡 대화 내보내기 (iOS)

1. 분석할 카카오톡 대화방 열기
2. 우측 상단 **≡ 메뉴** 탭
3. **대화 내용 내보내기** 선택
4. **텍스트** 형식으로 내보내기
5. `.txt` 파일을 저장

### 2. 분석 실행

1. http://localhost:5173 접속
2. **무료로 시작하기** 클릭
3. 내보낸 `.txt` 파일 업로드
4. 분석할 **화자** 선택
5. **분석 시작일** 선택 (최근 대화 기준으로 자동 범위 안내)
6. **분석하기** 클릭
7. AI가 보고서를 실시간으로 작성

### 3. 결과 확인

- MBTI 4글자 코드 + E/I, S/N, T/F, J/P 축별 근거 보고서 제공
- **공유하기** — 이미지로 캡처해 기본 공유 시트 오픈 (iOS)
- **다운로드** — PNG 파일로 저장
- **복사하기** — 텍스트를 클립보드에 복사

---

## 주요 제약사항

- **iOS 카카오톡 내보내기 형식만 지원** (Android 미지원)
- 분석 대상 화자의 메시지가 **20개 이상** 필요
- 분석 소요 시간: 로컬 환경에 따라 **1~2분**
- 업로드한 파일은 서버에 저장되지 않습니다

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React, TypeScript, Vite, Tailwind CSS |
| 백엔드 | FastAPI, Python |
| AI | Ollama (gemma4:e2b), SSE 스트리밍 |
