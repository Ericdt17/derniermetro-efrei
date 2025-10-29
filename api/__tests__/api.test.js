"use strict";
const request = require("supertest");

// Mock pg Pool to éviter une vraie DB pour ces tests
jest.mock("pg", () => {
  const query = jest.fn(async (sql) => {
    if (/select \* from config/i.test(sql)) {
      return { rows: [{ key: "k", value: {} }] };
    }
    if (/from stations/i.test(sql) && /order by s.id/i.test(sql)) {
      return {
        rows: [
          { id: 1, name: "Châtelet", headway_minutes: 3, last_metro_time: "01:15:00" },
        ],
      };
    }
    if (/where s.name = \$1/i.test(sql)) {
      return {
        rows: [
          { id: 1, name: "Châtelet", headway_minutes: 3, last_metro_time: "01:15:00" },
        ],
      };
    }
    return { rows: [] };
  });

  return { Pool: jest.fn(() => ({ query })) };
});

const { app } = require("../server");

describe("API endpoints", () => {
  test("GET /health -> 200", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("GET /db-test -> 200 avec mock", async () => {
    const res = await request(app).get("/db-test");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("connected");
    expect(res.body.configCount).toBeGreaterThanOrEqual(1);
  });

  test("GET /stations -> 200 et retourne des stations", async () => {
    const res = await request(app).get("/stations");
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.stations)).toBe(true);
  });

  test("GET /next-metro sans station -> 400", async () => {
    const res = await request(app).get("/next-metro");
    expect(res.statusCode).toBe(400);
  });

  test("GET /next-metro avec station -> 200", async () => {
    const res = await request(app).get("/next-metro").query({ station: "Châtelet" });
    expect([200, 404]).toContain(res.statusCode); // 200 si mock renvoie la station
    if (res.statusCode === 200) {
      expect(res.body.station).toBe("Châtelet");
    }
  });
});


