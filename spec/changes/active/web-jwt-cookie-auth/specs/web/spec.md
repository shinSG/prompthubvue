# Web Delta Spec

## Modified Requirements

### Requirement: Cookie-backed JWT sessions remain authoritative in browser flows

Web 登录态恢复、刷新与登出在浏览器环境中必须允许 HttpOnly cookie 作为真实 JWT 会话来源，不能因为残留、过期或伪造的 `Authorization` header 而把有效 cookie 会话判定为未登录。

#### Scenario: stale bearer header exists but cookie access token is valid

When a request carries an invalid bearer token in `Authorization`
And the same request also carries a valid access-token cookie
Then the auth middleware verifies the cookie token after the header token fails
And the request is treated as authenticated.

#### Scenario: session bootstrap runs after page reload

When the browser still has valid auth cookies
And the frontend no longer has a reliable in-memory access token
Then `AuthContext` restores the user by calling the authenticated auth endpoints with cookies
And it does not require a simulated bearer token to rebuild login state.