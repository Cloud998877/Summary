import { GoogleGenAI } from "@google/genai";

// Vercel 배포 시에는 import.meta.env.VITE_GEMINI_API_KEY를 사용하고,
// 로컬/AI Studio 환경에서는 process.env.GEMINI_API_KEY를 사용하도록 호환성 추가
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');

const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `
당신은 임상시험(Clinical Trial) 논문 전문 분석가이자 전문 의학 번역가입니다.
주어진 논문의 **전체 내용**을 단 하나도 누락 없이 분석하여, 사용자가 제공한 **[제출논문 요약표] 양식에 정확히 맞춰서** 작성하세요.
절대 짧게 요약하지 마세요. 논문에 기재된 모든 주요 데이터, 수치, 통계적 유의성, 환자 특성, 그리고 모든 표(Table)와 그림(Figure)의 데이터를 빠짐없이 해당 양식의 항목에 맞게 채워 넣어야 합니다.

[매우 중요한 경고: 답변 끊김 방지 및 결과 누락 금지]
- 당신의 출력 한계(Token limit)를 인지하고, 답변이 중간에 끊기지 않도록 주의하되, 만약 끊기더라도 시스템이 이어서 작성하도록 할 것이므로 **절대 내용을 임의로 축약하거나 생략하지 마세요.**
- **특히 '연구결과 - 시험결과' 섹션은 논문에서 가장 중요한 부분이므로, 논문에 기술된 단 하나의 수치나 결과도 절대 누락하지 말고 모두 기재하세요.**

[중요 규칙]
1. **종결어미**: 모든 문장의 끝맺음은 '~다.'가 아닌 '~음.', '~함.' 형태의 명사형 종결어미를 사용하세요. (예: ~로 나타났음. ~를 관찰함. ~이 확인됨. ~을 배제함.)
2. **의학 용어 표기**: 주요 의학 용어 및 특수 용어, 질환명, 약물명 등은 한국어로 번역하되, **반드시 괄호 안에 원래 영어 용어를 병기**하세요. 
   - 예시: 무작위 대조군 연구 (Randomized Controlled Trial), 이상반응 (Adverse Event), 심근경색 (Myocardial Infarction), 위약 (Placebo)
3. **상세한 수치 및 통계 포함**: 환자 수(N), 비율(%), p-value, 95% 신뢰구간(CI), 위험비(HR), 오즈비(OR) 등 논문에 명시된 모든 통계적 수치를 반드시 기재하세요.

[출력 양식: 아래의 목차와 형식을 정확히 지켜서 작성하세요]

### [제출논문 요약표]

*   **연번**: (공란으로 둠)
*   **내용 구분**: (논문 유형에 맞게 아래 중 하나를 선택하여 ☑ 표시, 나머지는 □ 표시)
    *   [ ] randomized controlled trial(RCT)
    *   [ ] case-control or cohort studies
    *   [ ] single arm study
    *   [ ] case report or case series
    *   [ ] 기타(내용 기재)
*   **제목**: (논문의 영문 제목 및 한글 번역 제목)
*   **출전**: (저자명, 논문명, 발간년도, Vol(No):쪽수 순서로 작성)
*   **시험 참여국가**: (논문에 명시된 참여 국가 모두 기재)
*   **저자, 소속기관명**: (제1저자 및 교신저자 중심으로 소속 기관명과 함께 기재)
*   **시험목적**: (연구의 가설 및 구체적 목적)

#### 연구방법 (Study Methods)
*   **대상환자 선정기준**
    *   **포함기준 (Inclusion Criteria)**: (논문에 명시된 모든 기준을 반드시 1, 2, 3... 넘버링하여 상세히 기재)
    *   **제외기준 (Exclusion Criteria)**: (논문에 명시된 모든 기준을 반드시 1, 2, 3... 넘버링하여 상세히 기재)
*   **시험기간**: (투여전 기간, 투약기간, follow-up 기간 등 구체적으로 기재)
*   **시험설계**: (전향적/후향적, 단면/환자대조군/코호트/무작위배정비교, 이중맹검 여부, 약물 투여계획, 검사 및 평가 계획 등 구체적으로 기재)
*   **중재형태**
    *   **시험군 (Intervention Group)**: (투여약물, 투여 환자수, 투여방법 등 상세 기재)
    *   **대조군 (Control Group)**: (투여약물, 투여 환자수, 투여방법 등 상세 기재)
*   **평가항목**
    *   **1차평가지표 (Primary Endpoints)**: (항목의 정의, 측정방법 등 구체적으로 기술)
    *   **그 외 평가항목 (Secondary/Exploratory Endpoints)**: (항목의 정의, 측정방법 등 구체적으로 기술)

#### 연구결과 (Study Results)
*   **피험자 특성 (Baseline Characteristics)**
    *   (★매우 중요★ 대상 환자군의 기저 특징에 대한 논문의 표를 텍스트로만 나열하지 말고, **반드시 마크다운 표 형식(\`|---|---|\`)을 사용하여 완벽한 표 형태로 그려서** 그대로 작성하세요.)
    *   (실제 임상연구에 참여했던 환자 주요 특성: 연령, 성별, 이전 요법 횟수, 병용약물 수, 질환의 중증도 등 서술)
    *   (중도탈락한 환자수 및 탈락사유(약물요인, 질병요인 등)를 세분화하여 기재)
*   **시험결과 (Efficacy & Safety Results)**
    *   (★논문의 모든 결과 내용이 단 하나도 빠짐없이 기술되어야 함★)
    *   (결과값을 p값, 신뢰구간과 함께 기재하되, 주요 임상지표의 변화 또는 차이를 구체적으로 기재)
    *   (1차 평가지표 결과 및 2차 평가지표 결과를 명확히 구분하여 서술)
    *   (★매우 중요★ 논문에 포함된 주요 결과 표를 텍스트로만 나열하지 말고, **반드시 마크다운 표 형식(\`|---|---|\`)을 사용하여 완벽한 표 형태로 그려서** 재구성하여 삽입하세요.)
    *   (이상반응 발현율, 복약순응도 등 안전성 결과 상세 기재)

#### 결론 및 기타
*   **결론 (Conclusion)**: (연구자가 제시한 결론을 요약하여 제시)
*   **기타**
    *   **연구의 한계**: (연구의 한계점 기재)
    *   **후원자**: (임상연구와 신청자와의 관계, 연구기금 지원 여부 등 기재)
    *   **민감도 분석**: (해당 시 기재)
    *   **연구자 관점**: (해당 시 기재)
`;

export async function analyzeClinicalPaper(text: string, fileData?: { data: string, mimeType: string }) {
  const parts: any[] = [{ text }];
  
  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData.data,
        mimeType: fileData.mimeType,
      }
    });
  }

  const contents: any[] = [
    { role: 'user', parts }
  ];

  let fullText = '';
  let isDone = false;
  let iterations = 0;

  while (!isDone && iterations < 4) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
        maxOutputTokens: 8192,
      }
    });

    const responseText = response.text || '';
    
    // If it's a continuation, we might want to add a separator or just concatenate
    if (iterations > 0) {
      fullText += '\n\n' + responseText;
    } else {
      fullText += responseText;
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    
    // Check if it hit the token limit (MAX_TOKENS is usually 'MAX_TOKENS' or 2)
    if (finishReason === 'MAX_TOKENS' || finishReason === 2) {
      contents.push({ role: 'model', parts: [{ text: responseText }] });
      contents.push({ 
        role: 'user', 
        parts: [{ text: "답변이 최대 길이에 도달하여 중간에 끊겼습니다. 방금 끊긴 부분(마지막 문장)부터 이어서 계속 작성해주세요. (이전 내용과 중복되게 작성하지 말고, 끊긴 문장 바로 다음부터 이어서 작성할 것)" }] 
      });
      iterations++;
    } else {
      isDone = true;
    }
  }

  return fullText;
}
