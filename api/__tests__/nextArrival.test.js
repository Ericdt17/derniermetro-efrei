"use strict";
const { nextArrival } = require("../server");

describe("nextArrival", () => {
  test("service fermé entre 01:15 et 05:30", () => {
    const now = new Date("2024-01-01T02:30:00+01:00");
    const res = nextArrival(now, 3);
    expect(res).toEqual({ service: "closed", tz: "Europe/Paris" });
  });

  test("service ouvert, calcule l'heure suivante avec headway", () => {
    const now = new Date("2024-01-01T06:00:00+01:00");
    const res = nextArrival(now, 5);
    expect(res.service).toBeUndefined();
    expect(res.headwayMin).toBe(5);
    expect(res.nextArrival).toBe("06:05");
    expect(typeof res.isLast).toBe("boolean");
  });

  test("marque isLast entre 00:45 et 01:15", () => {
    const now = new Date("2024-01-01T00:50:00+01:00");
    const res = nextArrival(now, 3);
    expect(res.isLast).toBe(true);
  });
});


