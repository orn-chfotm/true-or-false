# DTO 응답 페이지네이션 규칙

이 규칙은 request DTO, response DTO, 공통 응답, 페이지 목록 응답에 적용한다.

## DTO 분리

- Entity와 DTO는 분리한다.
- Request DTO는 각 API 모듈과 도메인 단위로 둔다.
- Response DTO는 각 API 모듈과 도메인 단위로 둔다.
- DTO 이름은 `{Domain}{ApiPurpose}{Request|Response}Dto` 규칙을 따른다.
- Java 이름은 camelCase를 사용한다.

예시:

```text
PolicyUploadRequestDto
PolicyUploadResponseDto
PolicySearchRequestDto
PolicySearchResponseDto
JobStatusResponseDto
```

## 변환

- 필요한 경우 Response DTO에 entity에서 변환하는 메서드를 둘 수 있다.
- 필요한 경우 Request DTO에 entity 또는 command로 변환하는 메서드를 둘 수 있다.
- DTO 변환 메서드에서 entity 내부 구현을 노출하지 않는다.

## 페이지네이션

- 내부 목록 조회는 Spring Data `Page`를 사용할 수 있다.
- API 응답으로 `Page`를 직접 노출하지 않는다.
- `Page<T>`는 API 응답 DTO로 변환한 뒤 반환한다.
- Page 응답 DTO는 `page`, `size`, `totalElements`, `totalPages`, `hasNext` 같은 명시적 메타데이터를 노출한다.
