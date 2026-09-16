---
description: "공통 axios client + JWT 토큰 인터셉터 정책. access token은 메모리에 두고 요청 인터셉터가 Authorization에 주입, refresh token은 httpOnly secure 쿠키(서버 설정). localStorage/sessionStorage 금지, 401 시 refresh 후 재시도."
---

# 02. 공통 API Client · 토큰 인터셉터 규칙

이 문서는 공통 API client의 토큰 보관, 인증 헤더 주입과 재발급 처리를 정의한다.

# 연관 관계

- TypeScript DTO · API 통신 규칙 참조: @.claude/rules/frontend/typescript/01-dto-types.md
- JWT 인증 규칙 참조: @.claude/rules/backend/security/01-jwt.md

# 적용 기준

`shared/api`의 공통 axios 인스턴스와 JWT 처리 정책이다. 공통 `request` 함수(`01-dto-types.md`)가 이 client를 사용한다. 백엔드 JWT 규칙은 `backend/security/01-jwt.md`와 짝을 이룬다.

# [금지사항]

- 토큰을 `localStorage`/`sessionStorage`에 저장하지 않는다.
- refresh token을 JS에서 읽거나 저장하지 않는다(서버가 httpOnly 쿠키로 관리).
- access token을 JS가 읽을 수 있는 영속 저장소(비-httpOnly 쿠키 등)에 두지 않는다. 메모리에만 둔다.
- 각 호출부에서 `Authorization` 헤더를 수동으로 세팅하지 않는다. 요청 인터셉터가 주입한다.
- 401 재발급을 각 호출부에서 개별 처리하지 않는다. 응답 인터셉터가 공통 처리한다.
- 인증 요청을 `withCredentials` 없이 보내지 않는다(httpOnly 쿠키 전송 필요).

# 설계 기준

## 공통 axios 인스턴스

```ts
// shared/api/client.ts
import axios from "axios";

export const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true, // httpOnly refresh 쿠키 전송
  headers: { "Content-Type": "application/json" },
});
```

## 토큰 저장 정책

- **access token**: 메모리(모듈 변수)에만 보관한다. `localStorage`/`sessionStorage` 금지.
- **refresh token**: 서버가 httpOnly + Secure + SameSite 쿠키로 설정한다. JS는 접근하지 않는다.

```ts
// shared/lib/auth-token.ts
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;
export const clearAccessToken = () => {
  accessToken = null;
};
```

## 요청 인터셉터 — access token 주입

```ts
// shared/api/client.ts (이어서)
import { getAccessToken } from "@/shared/lib/auth-token";

client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

## 응답 인터셉터 — 401 시 refresh 후 1회 재시도

```ts
import type { SuccessResponse } from "@/shared/api/api-types";
import { setAccessToken, clearAccessToken } from "@/shared/lib/auth-token";

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true; // 무한 루프 방지
      try {
        // refresh는 httpOnly 쿠키로 전송(withCredentials). 새 access token 수신 → 메모리 저장
        const { data } = await client.post<SuccessResponse<{ accessToken: string }>>("/v1/auth/refresh");
        setAccessToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return client(original);
      } catch (e) {
        clearAccessToken();
        // 로그인 페이지로 이동 등 후처리
        throw e;
      }
    }
    return Promise.reject(error);
  },
);
```

## 로그인·새로고침·로그아웃 플로우

- **로그인**: 서버가 refresh를 httpOnly 쿠키로 Set-Cookie, access token은 응답 본문 → FE는 `setAccessToken`으로 메모리 저장.
- **새로고침(메모리 소실)**: 앱 초기화 시 메모리에 access가 없으면 `/refresh`로 재발급(httpOnly refresh 쿠키 사용).
- **로그아웃**: `/logout` 호출 → 서버가 refresh 쿠키 만료 → FE는 `clearAccessToken`.

# 구현 가드레일

- 모든 인증 요청은 공통 `client`(withCredentials) + 공통 `request`(`01`)를 거친다.
- access token은 메모리에만, refresh token은 httpOnly 쿠키(서버 관리).
- 요청 인터셉터가 `Authorization`을, 응답 인터셉터가 401 refresh를 공통 처리한다.
- 401 refresh는 `_retry` 플래그로 1회만 재시도한다.

# 검증 기준

- 토큰이 `localStorage`/`sessionStorage`에 저장되지 않는지 확인.
- 요청에 `Authorization: Bearer`가 인터셉터로 주입되는지 확인.
- 401 → refresh → 재시도가 동작하고, refresh 실패 시 로그아웃 처리되는지 확인.
- `withCredentials`로 httpOnly 쿠키가 전송되는지 확인.
