---
description: "TypeScript DTO·API 통신 규칙. API마다 Request/Response 타입을 BE에 맞춰 정의하고, 모든 비동기는 공통 request 함수 하나를 거쳐 SuccessResponse<T>를 반환한다. 에러는 ApiClientError로 공통 처리, enum은 TS enum 대신 union/as const."
---

# 01. TypeScript DTO · API 통신 규칙

이 문서는 TypeScript API 계약 타입, 공통 요청·응답 처리와 enum 표현을 정의한다.

# 연관 관계

- FSD 구조 정책 (Feature-Sliced Design) 참조: @.claude/rules/frontend/00-architecture.md
- Java DTO · Response 규칙 참조: @.claude/rules/backend/java/01-dto-response.md
- Enum ↔ JSON 매핑 규칙 참조: @.claude/rules/backend/java/02-enum-json.md
- 상태 관리 규칙 참조: @.claude/rules/frontend/02-state-management.md

# 적용 기준

Opinion Brief 프론트엔드(React / Next.js / TypeScript)의 타입·비동기 통신 컨벤션이다. FSD 배치는 `../00-architecture.md`(도메인 api는 slice의 `api`, API DTO·외부 계약 타입은 slice 루트 `types.ts`, 내부 상태·뷰모델 타입은 `model/types.ts`, 공통 통신·에러는 `shared/api`). 백엔드 DTO·응답 래퍼·enum 매핑은 `backend/java/01-dto-response.md`, `backend/java/02-enum-json.md`와 형태가 일치해야 한다.

# [금지사항]

- enum을 TypeScript `enum` 키워드로 선언하지 않는다. enum은 union literal 또는 `as const` 타입으로 정의한다(HTTP 메서드 등 상수 집합도 동일).
- `any`를 쓰지 않는다.
- 요청/응답 타입 없이 비동기 통신하지 않는다. API마다 Request·Response 타입을 BE에 맞춰 정의한다.
- 각 호출부에서 `fetch`/`axios`를 직접 부르지 않는다. 반드시 공통 `request` 함수를 거친다.
- 에러를 호출부에서 개별 파싱하지 않는다. 공통 `ApiClientError`로 변환·처리한다.
- 백엔드 직렬화 형태(value/name)와 다른 enum 값을 정의하지 않는다.
- 응답을 `SuccessResponse<T>` 래퍼 없이 임의 구조로 다루지 않는다. 도메인은 `T`에 선언된 필드만 사용한다(선언 외 데이터는 무시).

# 설계 기준

## Request/Response DTO는 타입으로 정의 (BE에 맞춤)

각 API마다 요청 타입(`XxxRequest`)과 응답 타입(`XxxResponse`)을 BE에 맞춰 정의한다. API DTO·외부 계약 타입의 위치는 해당 slice의 루트 `types.ts`다. 내부 상태·뷰모델 전용 타입은 `model/types.ts`에 둔다.

```ts
// features/auth/login/types.ts
export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string; // refresh token은 httpOnly 쿠키(서버 설정), 본문에 없음 (02-api-client-auth.md)
};
```

## 공통 응답 래퍼 + 에러 타입

백엔드는 `SuccessResponse<T>` / `FailResponse<T>`로 감싼다(`backend/java/01`). 프론트도 동일 형태로 두고, 실패는 `ApiClientError`로 표준화한다.

```ts
// shared/api/api-types.ts
export type SuccessResponse<T> = {
  status: number;
  timestamp: string;
  data: T;
};

export type FailResponse<T = unknown> = {
  status: number;
  timestamp: string;
  message: string;
  data?: T;
};
```

```ts
// shared/api/api-client-error.ts
export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly alertMessage: string,
  ) {
    super(alertMessage);
    this.name = "ApiClientError";
  }
}
```

## HTTP 메서드도 타입으로

GET/POST 같은 상수 집합도 문자열 리터럴을 코드에 흩뿌리지 않고 `as const` 타입으로 정의해 재사용한다(위 enum 정책과 동일).

```ts
// shared/api/http-method.ts
export const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
} as const;
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];
```

## 비동기 통신은 공통 함수 하나로

모든 비동기 호출은 `shared/api`의 **공통 `request` 함수 하나**를 거친다. 최상위 응답 래퍼(HttpStatus·time)는 공통 함수가 타입으로 처리하고 `SuccessResponse<T>`를 반환한다. 상세 `data`는 `<T>` 제네릭으로, **비동기를 호출하는 도메인에서 요청 타입과 예상 응답 타입을 전달**한다. 실패는 공통 함수에서 `ApiClientError`(alertMessage)로 변환한다.

```ts
// shared/api/api-client.ts
import type { AxiosError } from "axios";
import { client } from "./client";
import { ApiClientError } from "./api-client-error";
import type { SuccessResponse, FailResponse } from "./api-types";
import type { HttpMethod } from "./http-method";

export async function request<TRes, TReq = unknown>(config: {
  method: HttpMethod;
  url: string;
  body?: TReq; // 요청 타입 TReq (호출 도메인이 전달)
}): Promise<SuccessResponse<TRes>> {
  try {
    const res = await client.request<SuccessResponse<TRes>>({
      method: config.method,
      url: config.url,
      data: config.body,
    });
    return res.data; // envelope 그대로 반환, 도메인이 .data 사용
  } catch (e) {
    const fail = (e as AxiosError<FailResponse>).response?.data;
    throw new ApiClientError(fail?.status ?? 0, fail?.message ?? "요청 처리 중 오류가 발생했습니다.");
  }
}
```

도메인 api(`features/.../api`)는 요청 타입 `TReq`와 예상 응답 타입 `TRes`를 공통 함수에 전달한다.

```ts
// features/auth/login/api/login-api.ts
import { request } from "@/shared/api";
import { HttpMethod } from "@/shared/api/http-method";
import type { SuccessResponse } from "@/shared/api/api-types";
import type { LoginRequest, LoginResponse } from "../types";

export const loginApi = (req: LoginRequest): Promise<SuccessResponse<LoginResponse>> =>
  request<LoginResponse, LoginRequest>({ method: HttpMethod.POST, url: "/v1/auth/login", body: req });
```

## 도메인(model)에서 호출 — 예상 response 구조를 받아 사용

model 훅에서 도메인 api를 호출하고 `SuccessResponse<T>`를 받아 `data`를 사용한다. 에러는 `ApiClientError`로 처리한다. 도메인은 `T`(예: `LoginResponse`)에 선언된 필드만 사용하므로 선언 외 데이터는 무시된다.

```ts
// features/auth/login/model/use-login-form.ts
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import { loginApi } from "../api/login-api";
import { ApiClientError } from "@/shared/api/api-client-error";
import { setAccessToken } from "@/shared/lib/auth-token";
import type { SuccessResponse } from "@/shared/api/api-types";
import type { LoginRequest, LoginResponse } from "../types";

export function useLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get("redirectUrl") || "/";

  const [form, setForm] = useState<LoginRequest>({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const onChangeEvent = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm({ ...form, [name as keyof LoginRequest]: value });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response: SuccessResponse<LoginResponse> = await loginApi(form);
      const { accessToken } = response.data; // refresh는 httpOnly 쿠키로 서버가 설정
      if (accessToken) {
        setAccessToken(accessToken); // 메모리 저장 (02-api-client-auth.md)
        router.push(redirectUrl);
        router.refresh();
      }
    } catch (e) {
      if (e instanceof ApiClientError) {
        alert(e.alertMessage);
      } else {
        console.error(e);
        alert("로그인 요청 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return { form, onChangeEvent, isLoading, onSubmit };
}
```

서버 상태 조회(GET)는 같은 도메인 api 함수를 TanStack Query로 감싸 쓴다(`../02-state-management.md`). 로그인 같은 액션/뮤테이션은 위처럼 model 훅에서 공통 `request`를 호출한다.

## Enum은 TS enum이 아니라 type으로 구성

TypeScript `enum`은 런타임 부작용·트리셰이킹 이슈가 있어 쓰지 않는다. union literal 또는 `as const` 객체로 만들고, 값은 **백엔드 JSON 직렬화 형태와 일치**시킨다(`backend/java/02-enum-json.md`: value 있으면 value, 없으면 name).

```ts
// 런타임 값이 필요 없으면 union literal
export type BriefStatus = "DRAFT" | "OPEN" | "COLLECTING" | "REVIEWING" | "READY" | "DELIVERED" | "ARCHIVED";

// 런타임 값(옵션 목록 등)이 필요하면 as const 객체
export const ResponseStatus = {
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  NEEDS_MANUAL_REVIEW: "NEEDS_MANUAL_REVIEW",
} as const;
export type ResponseStatus = (typeof ResponseStatus)[keyof typeof ResponseStatus];
```

백엔드가 숫자 value(예: `0/1/2`)로 노출하면 FE 타입도 그 형태로 맞춘다.

```ts
export const Status = { SUCCESS: 0, PENDING: 1, FAIL: 2 } as const;
export type Status = (typeof Status)[keyof typeof Status]; // 0 | 1 | 2
```

# 구현 가드레일

- 모든 비동기 호출은 공통 `request` 함수를 거친다. 도메인 api는 요청 타입 `TReq`와 예상 응답 타입 `TRes`를 전달한다.
- 공통 함수는 `SuccessResponse<T>`를 반환하고, 도메인(model)이 `response.data`를 사용한다.
- 실패는 공통 함수에서 `ApiClientError`로 변환하고, 호출부는 `instanceof ApiClientError`로 처리한다.
- 요청/응답 타입은 BE에 맞춰 slice 루트 `types.ts`에, 내부 상태·뷰모델 타입은 `model/types.ts`에, 공통 래퍼·에러·클라이언트는 `shared/api`에 둔다.
- enum·상수 집합(HTTP 메서드 포함)은 union literal 또는 `as const` 타입으로 정의한다. TS `enum` 키워드 금지. enum 값은 백엔드 직렬화 형태와 일치시킨다.
- 도메인은 응답 타입 `T`에 선언된 필드만 사용한다. 엄격한 런타임 필터링이 필요하면 응답 스키마(Zod)로 파싱한다(선택).
- `any` 대신 명시적 타입/제네릭을 쓴다. 파일명은 kebab-case.

# 검증 기준

- 모든 도메인 api가 공통 `request`를 거치고 요청/응답 타입을 전달하는지 확인.
- 실패 응답이 `ApiClientError`로 변환되어 호출부에서 처리되는지 확인.
- TS `enum` 사용이 없고 enum 값이 백엔드 직렬화와 일치하는지 확인.
- `any` 사용이 없는지 확인.
