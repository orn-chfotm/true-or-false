---
description: "응답자 원본 프로필과 리포트 제공용 집계 라벨을 분리하고, 리포트의 원문 PII를 마스킹한다."
---

# 06. 개인정보 분리 규칙

표본 신뢰 라벨을 만들되 과도한 개인정보 노출을 막는 규칙을 정의한다.

근거 문서:
- `.docs/prd/opinion-brief-engineering-review.md` P1(개인정보), 9.2
- `.docs/prd/opinion-brief-product-plan.md` 5.4
- `.docs/prd/opinion-brief-domain-definition.md` 5

## 금지 규칙 (하지 말 것)

- ❌ 생년월일·상세주소·자유 직업명 등 원본 PII를 저장하지 않는다. 버킷(연령대/지역/직업군)으로 저장한다.
- ❌ 리포트 응답 DTO에 개인 식별 필드(user_id, 연락처 등)를 노출하지 않는다.
- ❌ PII 마스킹 없이 원문 응답을 리포트에 넣지 않는다.
- ❌ 정치/사회 이슈 유형 Brief를 MVP에서 생성하지 않는다.
- ❌ 타 사용자의 `brief_id`·응답에 접근을 허용하지 않는다.

## 설계 기준

### 원본 프로필과 집계 라벨을 분리한다 (R6)

리포트에 응답자 구성을 라벨로 보여주되, B2B 고객에게 전달되는 리포트에 개인 식별 가능성이 남으면 안 된다.

- 개인 단위 데이터(`ParticipantProfile`)는 내부 저장소에만 보관한다.
- 리포트에는 집계된 분포와 익명 원문만 제공한다.
- 원문 응답의 이름·전화번호·회사명 등 식별 표현은 리포트 생성 전 마스킹한다.

### 최소 수집 원칙

- 생년월일 대신 연령대(`age_bucket`)
- 상세 주소 대신 지역 버킷(`region_bucket`)
- 직업명 자유 입력 대신 직업군(`job_bucket`)
- 동의 버전(`consent_version`)과 동의 시점 저장

### 정치/사회 이슈 템플릿은 MVP에서 비활성화한다

민감 정보와 의견 데이터가 결합되는 위험이 있어 MVP 범위에서 제외한다.

## 예시

```java
// 원본 PII 대신 버킷으로 저장 (../jpa/05-enum-converter: @Enumerated STRING)
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ParticipantProfile {

    @Enumerated(EnumType.STRING)
    private AgeBucket ageBucket;       // 생년월일 저장 X

    @Enumerated(EnumType.STRING)
    private RegionBucket regionBucket; // 상세 주소 저장 X

    @Enumerated(EnumType.STRING)
    private JobBucket jobBucket;

    private String consentVersion;     // 동의 버전
}
```

```java
// 리포트 생성 전 대표 원문 PII 마스킹
public String maskPii(String text) {
    return text.replaceAll("01[0-9]-?\\d{3,4}-?\\d{4}", "***-****-****"); // 전화번호 등
}
```

## 구현 가드레일

- `ParticipantProfile`에 원본 생년월일/상세주소/자유 직업명을 저장하지 않는다. 버킷 값으로 저장한다.
- 리포트 생성 파이프라인은 대표 원문을 넣기 전에 PII 마스킹 단계를 반드시 거친다. (`03-report-snapshot.md`)
- 리포트 응답 DTO에 개인 식별 필드(user_id, 연락처 등)를 노출하지 않는다.
- 정치/사회 이슈 유형 Brief 생성 경로를 MVP에서 막는다.
- 권한 경계: 참여자는 다른 참여자의 원문을, 요청자는 다른 요청자의 리포트를 볼 수 없다. (`brief_id` 조작 방지)

## 검증 기준

- 원문 응답 마스킹 후 이름/연락처/회사명이 남지 않는지 테스트.
- 리포트 집계 라벨이 개인 단위로 역추적되지 않는지 테스트.
- 타 사용자 `brief_id`/응답 접근이 차단되는지 테스트.
