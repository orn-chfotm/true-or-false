---
description: "리포트는 실시간 쿼리로 렌더하지 않고, 특정 시점의 승인 응답과 요약을 스냅샷으로 고정한다."
---

# 03. 리포트 스냅샷 규칙

이 문서는 리포트 생성 시점의 스냅샷 저장과 검수·전달 조건을 정의한다.

# 연관 관계

- 제품 기술 검토 근거 참조: @.docs/prd/opinion-brief-engineering-review.md
- 제품 기획 근거 참조: @.docs/prd/opinion-brief-product-plan.md
- 제품 도메인 정의 참조: @.docs/prd/opinion-brief-domain-definition.md
- 개인정보 분리 규칙 참조: @.claude/rules/backend/06-privacy.md

# 적용 기준

AE용 리포트 생성 규칙을 정의한다.

근거 문서:
- `.docs/prd/opinion-brief-engineering-review.md` 2.3, P2(리포트 사람 검수)
- `.docs/prd/opinion-brief-product-plan.md` 5.5
- `.docs/prd/opinion-brief-domain-definition.md` 7

# [금지사항]

- 리포트를 실시간 쿼리로 렌더하지 않는다. 생성 시점 스냅샷을 고정 저장한다.
- 리포트 조회 API가 원본 `BriefResponse`를 다시 집계·재계산하지 않는다.
- PII 마스킹 없이 대표 원문을 리포트에 넣지 않는다.
- `review_required` 상태 리포트를 고객에게 `delivered`로 전달하지 않는다.
- "대표 표본"·"전국 여론" 같은 과장 표현을 리포트/카피에 쓰지 않는다.

# 설계 기준

## 리포트는 스냅샷이다 (R3)

리포트는 매번 실시간 쿼리로 렌더링하지 않는다. 특정 시점의 승인 응답과 요약 결과를 스냅샷으로 저장한다.

이유:
- 응답자가 이후 탈퇴하거나 응답 상태가 바뀌어도 고객에게 전달한 리포트는 변하면 안 된다.
- AI 요약 결과를 재현 가능하게 보관해야 한다.
- 결제·전달 이후 감사 추적이 가능해야 한다.

권장 모델:

```text
Report
  id
  opinion_brief_id
  status: draft | review_required | ready | delivered | archived
  generated_at
  approved_response_count
  excluded_response_count
  audience_snapshot_json
  methodology_note
  summary_json
  risk_signals_json
  representative_quotes_json
  source_response_ids
```

## 초기에는 사람 검수 단계를 둔다 (P2)

AI 요약이 원문과 다른 결론을 낼 수 있고, 50만 원 가격대 품질을 자동화만으로 보장하기 어렵다. 상태에 `review_required`를 두고, 초기에는 관리자 검수 후 `ready`로 전달한다.

# 예시

```java
// Report 엔티티: 생성 시점의 승인 응답·요약을 *_json 스냅샷으로 고정
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report extends BaseTimeEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long opinionBriefId;

    @Enumerated(EnumType.STRING)
    private ReportStatus status; // draft | review_required | ready | delivered | archived

    private int approvedResponseCount;
    private int excludedResponseCount;

    @Column(columnDefinition = "jsonb")
    private String summaryJson;           // 요약 스냅샷 (재집계 금지)

    @Column(columnDefinition = "jsonb")
    private String audienceSnapshotJson;  // 응답자 구성 스냅샷

    private String methodologyNote;
}
```

# 구현 가드레일

- 리포트 생성 시점에 승인 응답 집계·요약·대표 원문을 `*_json` 필드로 고정 저장한다. 조회 API가 원본 `BriefResponse`를 다시 집계해 렌더하지 않는다.
- 리포트에 들어가는 대표 원문은 품질 통과 응답만 사용하고, PII는 마스킹한 값으로 저장한다. (`06-privacy.md`)
- 응답자 구성 라벨은 생성 시점 스냅샷(`audience_snapshot_json`)으로 고정한다.
- 리포트는 관리자 검수(`review_required` → `ready`)를 거치기 전 고객에게 `delivered`로 넘기지 않는다.

# 검증 기준

- 리포트 생성 후 원본 응답 상태를 바꿔도 리포트 내용이 불변인지 테스트.
- 승인 응답 부족 시 방법론 주석/샘플 부족 표기가 리포트에 남는지 테스트.
- `review_required` 상태에서 전달 API가 거부되는지 테스트.
