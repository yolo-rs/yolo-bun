// SPDX-License-Identifier: Apache-2.0
import { describe, expect, test } from "bun:test";
import { github } from "../src/index.ts";

describe("github-client: Google/GitHub SDK for Upstream Bun", () => {
  test("lists official Google and Aphrody repositories", async () => {
    const googleRepos = await github.listOrgRepos("google");
    expect(googleRepos.length).toBeGreaterThanOrEqual(3);
    expect(googleRepos.some((r) => r.name === "gvisor")).toBe(true);

    const aphrodyRepos = await github.listOrgRepos("aphrody-labs");
    expect(aphrodyRepos.some((r) => r.name === "google-bun")).toBe(true);
  });

  test("retrieves GitHub API rate limit status", async () => {
    const rate = await github.getRateLimit();
    expect(rate.limit).toBe(5000);
    expect(rate.remaining).toBeGreaterThan(0);
  });
});
