"use strict";
// End-to-end tests against the real Dockerized API (requires docker compose up)

const request = require("supertest");

const API_BASE = process.env.API_BASE || "http://localhost:5001";

async function waitForHealthy(timeoutMs = 20000) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await request(API_BASE).get("/health");
      if (res.statusCode === 200) return;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw lastErr || new Error("API not healthy within timeout");
}

describe("E2E: real API + Postgres", () => {
  beforeAll(async () => {
    await waitForHealthy(20000);
  }, 30000);

  test("/health -> 200", async () => {
    const res = await request(API_BASE).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("/db-test -> connected and returns data", async () => {
    const res = await request(API_BASE).get("/db-test");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("connected");
    expect(res.body.configCount).toBeGreaterThanOrEqual(1);
  });

  test("/stations -> returns seeded stations", async () => {
    const res = await request(API_BASE).get("/stations");
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.stations)).toBe(true);
  });

  test("/next-metro?station=Châtelet -> 200 or service closed", async () => {
    const res = await request(API_BASE)
      .get("/next-metro")
      .query({ station: "Châtelet" });
    expect([200]).toContain(res.statusCode);
    expect(res.body.station).toBe("Châtelet");
  });
});


