// SPDX-License-Identifier: Apache-2.0
import { describe, expect, test } from "bun:test";
import {
  SOVEREIGN_FLEET_NODES,
  SovereignSqlGateway,
  SovereignSshGateway,
  SovereignApiGateway,
  SovereignWorkspaceGarbageCollector,
} from "../src/index.ts";

describe("@google-bun/google-unified-fabric: Unified Cloud, Local/VPS SQL, SSH Mesh, API Gateway & Security GC", () => {
  test("unifies all 7 Cloud, VPS, Edge, and Local RTX 4070 mesh nodes under a single topology", () => {
    expect(SOVEREIGN_FLEET_NODES.length).toBe(7);
    expect(SOVEREIGN_FLEET_NODES.some((n) => n.alias === "gcp-paris-ew9")).toBe(
      true,
    );
    expect(
      SOVEREIGN_FLEET_NODES.some(
        (n) => n.alias === "prod" && n.wireguardIp === "10.200.77.5",
      ),
    ).toBe(true);
    expect(
      SOVEREIGN_FLEET_NODES.some((n) => n.alias === "local-win-rtx4070"),
    ).toBe(true);
  });

  test("executes parameterized SQLite WAL queries and blocks SQL injection, stacked queries, and unscoped DELETE", () => {
    const sql = new SovereignSqlGateway(":memory:");
    sql.upsertState("cloud-sync", "ew9-status", {
      healthy: true,
      region: "europe-west9",
    });
    const state = sql.getState<{ healthy: boolean; region: string }>(
      "cloud-sync",
      "ew9-status",
    );
    expect(state?.healthy).toBe(true);
    expect(state?.region).toBe("europe-west9");

    // SQL injection & destructive DDL blocks
    expect(() =>
      SovereignSqlGateway.validateParameterizedSql(
        "SELECT * FROM users WHERE email = 'a' OR '1'='1'",
      ),
    ).toThrow("SQL_FIREWALL_INJECTION_PATTERN_BLOCKED");

    expect(() =>
      SovereignSqlGateway.validateParameterizedSql(
        "SELECT 1; DROP TABLE users;",
      ),
    ).toThrow("SQL_FIREWALL_STACKED_QUERY_FORBIDDEN");

    expect(() =>
      SovereignSqlGateway.validateParameterizedSql(
        "DELETE FROM unified_kv_store",
      ),
    ).toThrow("SQL_FIREWALL_UNSCOPED_DELETE_BLOCKED");
  });

  test("builds hardened BatchMode SSH plans over WireGuard and blocks destructive or exfiltration payloads", () => {
    const ssh = new SovereignSshGateway();
    const plan = ssh.buildExecutionPlan("vps", "uptime && df -h /");
    expect(plan.sshArgs).toContain("BatchMode=yes");
    expect(plan.sshArgs).toContain("StrictHostKeyChecking=yes");
    expect(plan.sshArgs).toContain("ubuntu@10.200.77.1");
    expect(plan.stdinPayload).toContain("set -euo pipefail");

    expect(() => ssh.buildExecutionPlan("vps", "rm -rf /")).toThrow(
      "SSH_FIREWALL_CATASTROPHIC_RM_BLOCKED",
    );
    expect(() =>
      ssh.buildExecutionPlan("vps", "cat ~/.ssh/id_ed25519"),
    ).toThrow("SSH_FIREWALL_SECRET_EXFILTRATION_BLOCKED");
  });

  test("prepares authenticated API calls across all 6 services and blocks SSRF / path traversal", () => {
    const api = new SovereignApiGateway();
    const gcpCall = api.prepareCall({
      service: "google-cloud-ew9",
      path: "/v1/projects/aphrody/locations/europe-west9/endpoints",
    });
    expect(gcpCall.ssrfVerified).toBe(true);
    expect(gcpCall.authScheme).toBe("adc-spiffe");

    expect(() =>
      api.prepareCall({
        service: "github-api",
        path: "/../../etc/passwd",
      }),
    ).toThrow("API_FIREWALL_PATH_TRAVERSAL_BLOCKED");

    expect(() =>
      SovereignApiGateway.verifyUrlSafety(
        "https://169.254.169.254/latest/meta-data",
      ),
    ).toThrow("API_FIREWALL_SSRF_METADATA_BLOCKED");
  });

  test("sweeps workspace for corrupt nested .git stubs and verifies security remediations", () => {
    const gc = new SovereignWorkspaceGarbageCollector();
    const report = gc.sweepCorruptGitStubsAndTempFiles(
      "C:/src/google-bun",
      2,
      false,
    );
    expect(report.corruptNestedGitStubsRemoved.length).toBe(0);
    expect(report.securityFindingsFixed.length).toBe(4);
  });
});
