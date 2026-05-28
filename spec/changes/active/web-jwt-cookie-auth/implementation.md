# Implementation

## Shipped

- 调整 `apps/web/src/middleware/auth.ts`，在 header token 校验失败时继续尝试 cookie token，并把缺失 token 的 401 文案收敛为 `Missing authentication token`。
- 调整 `apps/web/src/client/contexts/AuthContext.tsx`，会话恢复改为 `getMe()`，刷新改为 `apiRefresh()`，登出改为 `apiLogout()`，让登录相关流程优先依赖 cookie 会话。
- 同步更新相关测试断言，匹配新的鉴权行为与调用方式。

## Verification

- `cd /home/user/sxk/code/PromptHub/apps/web && pnpm vitest run src/routes/auth.test.ts src/client/contexts/AuthContext.test.tsx`

## Synced Docs

- `spec/changes/active/web-jwt-cookie-auth/*`
- `spec/domains/web/spec.md`

## Follow-ups

- 现有部分业务 API 仍显式依赖内存 access token；如果后续要进一步去除“显式 bearer 必须存在”的前端耦合，需要单独做一轮 web API 调用方式收敛。