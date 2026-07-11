import { test } from "node:test";
import assert from "node:assert/strict";
import { db, tables, resetDb } from "../db/index";

// Gate test: the lazy-proxy db must survive resetDb() — query, reset, query
// again in the same process. If this fails, the Proxy approach is wrong and
// import must fall back to a getDb() function.
test("db survives resetDb() — query, reset, query again", () => {
  const before = db
    .select({ id: tables.profiles.id })
    .from(tables.profiles)
    .all();
  assert.ok(Array.isArray(before), "first query returns rows");

  resetDb();

  const after = db
    .select({ id: tables.profiles.id })
    .from(tables.profiles)
    .all();
  assert.ok(Array.isArray(after), "query after reset returns rows");
  assert.equal(after.length, before.length, "same data after reopen");
});

test("db.$client is reachable through the proxy", () => {
  const client = db.$client;
  assert.ok(client, "$client accessor works");
  const row = client.prepare("SELECT 1 AS x").get() as { x: number };
  assert.equal(row.x, 1);
});

test("db.transaction works through the proxy", () => {
  let ran = false;
  db.transaction(() => {
    ran = true;
  });
  assert.ok(ran, "transaction callback executed");
});
