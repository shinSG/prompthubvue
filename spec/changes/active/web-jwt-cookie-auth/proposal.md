# Proposal

## Why

当前 web 端登录链路虽然已经使用真实 JWT，但前后端仍会被内存中的 bearer token 状态牵着走。浏览器里一旦残留过期或伪造的 `Authorization` 头，就可能覆盖掉本来有效的 HttpOnly cookie，会话恢复和登出也会继续显式依赖内存 token，导致看起来像“还在用模拟 JWT”。

## Scope

- In scope:
  - 调整 web 鉴权中间件，让 cookie access token 可以作为真实会话来源参与兜底校验。
  - 调整前端 `AuthContext`，让会话恢复、刷新和登出优先走 cookie 会话。
  - 更新相关测试与规范记录。
- Out of scope:
  - 重写所有业务 API 的 token 传递方式。
  - 调整 JWT 签发算法、过期时间或用户模型。

## Risks

- 中间件同时接受 header 和 cookie 后，需要确保不会放宽未认证请求的判定。
- 前端改为 cookie-first 后，依赖显式 token 参数的旧测试需要同步更新。

## Rollback Thinking

- 若出现兼容性问题，可以恢复为 header 优先且不回退 cookie 的逻辑。
- 前端可恢复为在 `getMe`、`refresh`、`logout` 中显式传递内存 token。