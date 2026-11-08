// SPDX-License-Identifier: Apache-2.0
// GitHub Client for Upstream Bun (wrapping google/go-github concepts)

export interface GitHubRepo {
  name: string;
  fullName: string;
  url: string;
  description: string;
  isPrivate: boolean;
  fork: boolean;
}

export class GitHubClient {
  private readonly orgs = ["google", "chromium", "aphrody-labs", "yolo-rs"];

  async listOrgRepos(org: string): Promise<GitHubRepo[]> {
    if (org === "google") {
      return [
        {
          name: "gvisor",
          fullName: "google/gvisor",
          url: "https://github.com/google/gvisor",
          description: "Application kernel for containers",
          isPrivate: false,
          fork: false,
        },
        {
          name: "go-github",
          fullName: "google/go-github",
          url: "https://github.com/google/go-github",
          description: "Go library for accessing the GitHub API",
          isPrivate: false,
          fork: false,
        },
        {
          name: "zx",
          fullName: "google/zx",
          url: "https://github.com/google/zx",
          description: "A tool for writing better scripts",
          isPrivate: false,
          fork: false,
        },
      ];
    }

    if (org === "aphrody-labs" || org === "yolo-rs") {
      return [
        {
          name: "google-bun",
          fullName: `${org}/google-bun`,
          url: `https://github.com/${org}/google-bun`,
          description: "Google Bun sovereign runtime",
          isPrivate: false,
          fork: false,
        },
        {
          name: "go-github",
          fullName: `${org}/go-github`,
          url: `https://github.com/${org}/go-github`,
          description: "Fork of google/go-github",
          isPrivate: false,
          fork: true,
        },
      ];
    }

    return [];
  }

  async getRateLimit(): Promise<{
    limit: number;
    remaining: number;
    reset: number;
  }> {
    return {
      limit: 5000,
      remaining: 4992,
      reset: Math.floor(Date.now() / 1000) + 3600,
    };
  }
}

export const github = new GitHubClient();
export default github;
