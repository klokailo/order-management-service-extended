# Pagination

List endpoints support cursor-based pagination via query parameters. See [orders-api.md](./orders-api.md) for the base endpoint path and authentication requirements.

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | `20` | Number of results per page. Maximum: `100` |
| `cursor` | string | none | Opaque cursor from the previous response's `nextCursor` field |
| `status` | string | none | Filter by order status. Must be one of `PENDING`, `PAID`, `SHIPPED`, `CANCELLED` |
| `customerId` | string | none | Filter to a specific customer's orders |

## Example Request

```
GET /api/orders?limit=10&status=PAID
Authorization: Bearer <token>
```

## Response Shape

```json
{
  "data": [...],
  "nextCursor": "eyJfaWQiOiI2NGYxIn0=",
  "hasMore": true
}
```

When `hasMore` is `false`, `nextCursor` will be `null`. Pass `nextCursor` as the `cursor` parameter in your next request to fetch the following page.

## Notes

- Cursors are base64-encoded MongoDB ObjectIDs and are opaque — do not parse them.
- Filtering by `customerId` requires the authenticated user to have role `admin`, or the `customerId` must match the token's `sub` claim. Mismatched requests return `403`. See [auth.md](./auth.md) for token claim details.
- Results are sorted by `createdAt` descending (newest first).
