---
description: "리포트 화면은 읽기 전용 산출물로, 표본 신뢰 라벨과 방법론 주석을 반드시 표시하고, 익명·마스킹된 원문만 보여준다."
---

# 05. 리포트 뷰 규칙

AE용 리포트 조회·전달 화면 규칙이다. 이 리포트가 제품이 파는 산출물(제안서에 바로 붙이는 형태)이다.

근거 문서:
- `.docs/prd/opinion-brief-product-plan.md` 5.4, 5.5
- `.docs/prd/opinion-brief-domain-definition.md` 7
- `.docs/prd/opinion-brief-engineering-review.md` 2.3, 9.2

## 금지 규칙 (하지 말 것)

- ❌ 리포트를 프론트에서 재집계·재계산하지 않는다. 서버 스냅샷을 그대로 렌더한다.
- ❌ 표본 신뢰 라벨·방법론 주석을 생략하지 않는다. 고정 섹션으로 항상 표시한다.
- ❌ 개인 식별 정보를 조합·표시하지 않는다. 익명·마스킹된 원문만 쓴다.
- ❌ "대표 표본"·"전국 여론" 같은 과장 카피를 쓰지 않는다.
- ❌ `review_required` 상태 리포트를 공유·전달하지 않는다.

## 설계 기준

### 리포트는 읽기 전용 스냅샷을 렌더한다

리포트 화면은 서버가 준 스냅샷(`backend/03-report-snapshot.md`)을 그대로 표시한다. 프론트에서 원본 응답을 다시 집계·재계산하지 않는다.

### 신뢰 라벨과 방법론 주석은 필수다

모든 리포트는 "누가 응답했는지"와 "이 결과가 어디까지 의미 있는지"를 함께 보여준다.

- 표본 신뢰 라벨: 성별/연령대/지역/직업군 분포, 타깃 충족률, 승인 응답 수, 제외 응답 수
- 방법론 주석: 전국 대표 표본이 아니라 빠른 반응 스냅샷이라는 안내

이 주석은 약점이 아니라 신뢰 장치다. 결과를 과장하는 표현을 쓰지 않는다.

### 대중 판단과 AI 검토를 분리해 표시한다

절대적 진실을 선언하지 않는다. 대중 판단 비율과 AI 근거 검토를 분리해서 보여주고, 무효 처리 통계도 함께 표시한다.

## 예시

```tsx
// widgets/report-view/ui/ReportView.tsx — 서버 스냅샷 그대로 렌더, 고정 섹션
export function ReportView({ report }: { report: ReportResponse }) {
  return (
    <article>
      <ReportSummary summary={report.summary} />
      <PublicJudgment data={report.publicJudgment} />        {/* 대중 판단 */}
      <AiReview data={report.aiReview} />                     {/* AI 근거 검토 (분리) */}
      <AudienceLabel snapshot={report.audienceSnapshot} />   {/* 표본 신뢰 라벨 (고정) */}
      <MethodologyNote note={report.methodologyNote} />      {/* 방법론 주석 (고정) */}
    </article>
  );
}
```

## 구현 가드레일

- 리포트에 표시하는 원문은 서버가 준 익명·마스킹된 대표 원문만 사용한다. 프론트에서 개인 식별 정보를 조합·표시하지 않는다.
- 신뢰 라벨/방법론 주석 영역을 옵션이 아니라 리포트 템플릿의 고정 섹션으로 둔다.
- "대표 표본", "전국 여론" 같은 과장 문구를 UI 카피에 넣지 않는다.
- 제안서용 복사/공유(복사 가능한 요약, 공유 링크, 추후 PDF)를 지원하되, 전달 전 상태(`review_required`)인 리포트는 전달·공유를 막는다.

## 검증 기준

- 신뢰 라벨·방법론 주석이 항상 렌더되는지 테스트.
- 대중 판단과 AI 검토가 분리 표시되는지 확인.
- `review_required` 리포트의 공유/전달이 차단되는지 테스트.
