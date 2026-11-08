// SPDX-License-Identifier: Apache-2.0
import { describe, expect, test } from "bun:test";
import { gcp } from "../src/index.ts";

describe("gcp-client: Google Cloud SDK for Upstream Bun", () => {
  test("initializes default project and region", () => {
    expect(gcp.projectId).toBeDefined();
    expect(typeof gcp.region).toBe("string");
    expect(gcp.region.length).toBeGreaterThan(0);
  });

  test("returns mock token and lists bucket objects", async () => {
    const token = await gcp.getAccessToken();
    expect(token).toContain("google-bun-keyless-token");

    const objects = await gcp.listBucketObjects("aphrody-storage");
    expect(objects.length).toBe(3);
    expect(objects[0]).toContain("gs://aphrody-storage");
  });

  test("queries Spanner with TrueTime commit timestamp simulation", async () => {
    const rows = await gcp.querySpanner(
      "prod-instance",
      "graph-db",
      "SELECT * FROM nodes",
    );
    expect(rows.length).toBe(1);
    expect(rows[0].trueTimeBoundEpsilonMs).toBe(1.2);
  });
});
