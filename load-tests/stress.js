/**
 * k6 Stress Test — find breaking points and verify rate limiting.
 *
 * Run: k6 run load-tests/stress.js
 * Or:  BASE_URL=https://staging.example.com k6 run load-tests/stress.js
 */

import http from "k6/http"
import { check, sleep } from "k6"
import { Counter, Rate, Trend } from "k6/metrics"

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

const errorRate = new Rate("errors")
const rateLimited = new Counter("rate_limited")
const pageDuration = new Trend("page_duration")

export const options = {
  stages: [
    { duration: "30s", target: 10 },   // warm up
    { duration: "1m", target: 25 },    // moderate load
    { duration: "1m", target: 50 },    // heavy load
    { duration: "30s", target: 50 },   // sustain peak
    { duration: "1m", target: 0 },     // cool down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],  // 95% under 2s even at peak
    errors: ["rate<0.15"],              // allow up to 15% errors (rate limits)
  },
}

export default function () {
  const scenario = Math.random()

  if (scenario < 0.3) {
    // 30% — Login page
    const res = http.get(`${BASE_URL}/login`)
    pageDuration.add(res.timings.duration)
    if (res.status === 429) {
      rateLimited.add(1)
    } else {
      check(res, { "login 200": (r) => r.status === 200 }) || errorRate.add(1)
    }
  } else if (scenario < 0.6) {
    // 30% — Sign page (stress token verification)
    const res = http.get(`${BASE_URL}/sign/stress-${__VU}-${__ITER}`)
    pageDuration.add(res.timings.duration)
    if (res.status === 429) {
      rateLimited.add(1)
    } else {
      check(res, { "sign page loads": (r) => r.status === 200 }) || errorRate.add(1)
    }
  } else if (scenario < 0.8) {
    // 20% — API session check
    const res = http.get(`${BASE_URL}/api/auth/session`)
    pageDuration.add(res.timings.duration)
    if (res.status === 429) {
      rateLimited.add(1)
    } else {
      check(res, { "api 200": (r) => r.status === 200 }) || errorRate.add(1)
    }
  } else {
    // 20% — Rapid-fire sign requests (test rate limiting)
    for (let i = 0; i < 5; i++) {
      const res = http.get(`${BASE_URL}/sign/burst-${__VU}-${i}`)
      if (res.status === 429) {
        rateLimited.add(1)
        break
      }
    }
  }

  sleep(0.3 + Math.random() * 0.7)
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values["p(95)"]
  const p99 = data.metrics.http_req_duration.values["p(99)"]
  const fails = data.metrics.http_req_failed?.values?.rate ?? 0
  const limited = data.metrics.rate_limited?.values?.count ?? 0

  console.log(`\n=== Stress Test Summary ===`)
  console.log(`  p95 response time: ${p95.toFixed(0)}ms`)
  console.log(`  p99 response time: ${p99.toFixed(0)}ms`)
  console.log(`  failure rate: ${(fails * 100).toFixed(2)}%`)
  console.log(`  rate limited requests: ${limited}`)
  console.log(`  total requests: ${data.metrics.http_reqs.values.count}`)
  console.log(`============================\n`)

  return {}
}
