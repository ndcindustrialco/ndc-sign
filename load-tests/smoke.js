/**
 * k6 Smoke Test — verify the e-signature app works under minimal load.
 *
 * Run: k6 run load-tests/smoke.js
 * Or:  BASE_URL=https://staging.example.com k6 run load-tests/smoke.js
 */

import http from "k6/http"
import { check, sleep } from "k6"
import { Rate, Trend } from "k6/metrics"

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

const errorRate = new Rate("errors")
const loginDuration = new Trend("login_page_duration")
const signPageDuration = new Trend("sign_page_duration")
const apiDuration = new Trend("api_duration")

export const options = {
  stages: [
    { duration: "15s", target: 2 },  // ramp up to 2 VUs
    { duration: "30s", target: 5 },  // hold at 5 VUs
    { duration: "15s", target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"],  // 95% of requests under 1s
    errors: ["rate<0.05"],              // error rate under 5%
    login_page_duration: ["p(95)<800"],
    sign_page_duration: ["p(95)<800"],
    api_duration: ["p(95)<500"],
  },
}

export default function () {
  // 1. Login page (public)
  const loginRes = http.get(`${BASE_URL}/login`)
  loginDuration.add(loginRes.timings.duration)
  check(loginRes, {
    "login page status 200": (r) => r.status === 200,
    "login page has sign-in": (r) => r.body.includes("Sign in") || r.body.includes("sign in"),
  }) || errorRate.add(1)

  sleep(0.5)

  // 2. Sign page with invalid token (public)
  const signRes = http.get(`${BASE_URL}/sign/test-load-token-${Date.now()}`)
  signPageDuration.add(signRes.timings.duration)
  check(signRes, {
    "sign page returns 200": (r) => r.status === 200,
    "sign page shows error": (r) =>
      r.body.includes("Link Unavailable") || r.body.includes("not valid"),
  }) || errorRate.add(1)

  sleep(0.5)

  // 3. API auth session (public)
  const apiRes = http.get(`${BASE_URL}/api/auth/session`)
  apiDuration.add(apiRes.timings.duration)
  check(apiRes, {
    "api session returns 200": (r) => r.status === 200,
    "api has rate limit header": (r) => r.headers["X-Ratelimit-Limit"] !== undefined,
  }) || errorRate.add(1)

  sleep(0.5)

  // 4. Sign done page (public)
  const doneRes = http.get(`${BASE_URL}/sign/done`)
  check(doneRes, {
    "done page returns 200": (r) => r.status === 200,
  }) || errorRate.add(1)

  sleep(1)
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values["p(95)"]
  const fails = data.metrics.http_req_failed?.values?.rate ?? 0

  console.log(`\n=== Smoke Test Summary ===`)
  console.log(`  p95 response time: ${p95.toFixed(0)}ms`)
  console.log(`  failure rate: ${(fails * 100).toFixed(2)}%`)
  console.log(`  total requests: ${data.metrics.http_reqs.values.count}`)
  console.log(`===========================\n`)

  return {}
}
