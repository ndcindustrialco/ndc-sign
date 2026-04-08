# Load Tests

Load testing scripts using [k6](https://grafana.com/docs/k6/).

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Windows (Chocolatey)
choco install k6

# Docker
docker run --rm -i grafana/k6 run - < load-tests/smoke.js
```

## Running Tests

```bash
# Smoke test (basic health check, low load)
k6 run load-tests/smoke.js

# Stress test (ramp up to find breaking point)
k6 run load-tests/stress.js

# Target a specific environment
BASE_URL=https://staging.example.com k6 run load-tests/smoke.js
```

## Test Scenarios

| Script | VUs | Duration | Purpose |
|--------|-----|----------|---------|
| `smoke.js` | 1-5 | 1m | Verify system works under minimal load |
| `stress.js` | 1-50 | 5m | Find breaking points and performance limits |

## Key Metrics to Watch

- **http_req_duration (p95)**: Should be < 500ms for pages, < 200ms for API
- **http_req_failed**: Should be < 1%
- **Rate limit hits (429s)**: Monitor under load to tune limits
