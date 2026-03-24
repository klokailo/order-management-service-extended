# Authentication

All protected endpoints require a valid JWT token passed in the `Authorization` header.

## Header Format

```
Authorization: Bearer <token>
```

The word `Bearer` is required. Omitting it or using a different scheme (e.g. `Token`) will result in the token being rejected.

## Token Payload

Tokens are verified using the `JWT_SECRET` environment variable. The following claims are read from the decoded payload:

| Claim | Maps to | Description |
|-------|---------|-------------|
| `sub` | `req.user.id` | The authenticated user's ID |
| `role` | `req.user.role` | The user's role (e.g. `admin`, `customer`) |

The service does not validate which role values are acceptable — role enforcement is left to individual route handlers. The `role` field is passed through as-is from the token.

## Error Responses

| Status | Meaning |
|--------|---------|
| `401 Unauthorized` | No token was provided in the request |
| `403 Forbidden` | A token was provided but verification failed (expired, tampered, wrong secret) |

See [error-handling.md](./error-handling.md) for the full error response shape returned by each status code.

## Correlation IDs

Every request (authenticated or not) is assigned a `x-correlation-id`. If the client sends this header, the same value is echoed back in the response. If not provided, a UUID is generated server-side. This value is logged on every request and is useful for tracing issues across services.
