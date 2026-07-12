import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where an uploaded photo actually gets written.
 *
 * Reading is always the same — the photos are files in public/photos/kitchen,
 * committed to the repo, so they ship with the deployment. Writing is not:
 *
 *   local dev   the folder is right there and writable        -> FsWriter
 *   production  a serverless filesystem is read-only, and a   -> GitHubWriter
 *               file written into it dies with the request
 *
 * The GitHub writer commits into the same folder through the API, so the repo
 * stays the single source of truth either way and the photos stay versioned.
 * The cost is a rebuild: a photo uploaded on the live site appears once the
 * host redeploys, about a minute later.
 */
export interface PhotoWriter {
  kind: "fs" | "github";
  /** Shown in the CMS so nobody is left guessing where a photo went. */
  savedMessage: string;
  write(filename: string, bytes: Buffer): Promise<void>;
  remove(filename: string): Promise<void>;
}

class FsWriter implements PhotoWriter {
  kind = "fs" as const;
  savedMessage = "Saved.";

  constructor(private dir: string) {}

  async write(filename: string, bytes: Buffer) {
    await writeFile(path.join(this.dir, filename), bytes);
  }

  async remove(filename: string) {
    await unlink(path.join(this.dir, filename));
  }
}

type GitHubConfig = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  /** Path within the repo, e.g. "public/photos/kitchen". */
  dir: string;
};

class GitHubWriter implements PhotoWriter {
  kind = "github" as const;
  savedMessage =
    "Saved to the repository. It appears on the site once it rebuilds — about a minute.";

  constructor(private config: GitHubConfig) {}

  private url(filename: string) {
    const { owner, repo, dir } = this.config;
    return `https://api.github.com/repos/${owner}/${repo}/contents/${dir}/${filename}`;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  /** The API needs the blob sha to overwrite or delete; absent means it's new. */
  private async currentSha(filename: string): Promise<string | undefined> {
    const response = await fetch(
      `${this.url(filename)}?ref=${this.config.branch}`,
      { headers: this.headers(), cache: "no-store" },
    );
    if (response.status === 404) return undefined;
    if (!response.ok) {
      throw new Error(`GitHub read failed (${response.status}).`);
    }
    const body = (await response.json()) as { sha?: string };
    return body.sha;
  }

  async write(filename: string, bytes: Buffer) {
    const sha = await this.currentSha(filename);

    const response = await fetch(this.url(filename), {
      method: "PUT",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Add kitchen photo ${filename}`,
        content: bytes.toString("base64"),
        branch: this.config.branch,
        ...(sha ? { sha } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Could not save to the repository (${response.status}). Check GITHUB_TOKEN.`,
      );
    }
  }

  async remove(filename: string) {
    const sha = await this.currentSha(filename);
    if (!sha) return;

    const response = await fetch(this.url(filename), {
      method: "DELETE",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Remove kitchen photo ${filename}`,
        sha,
        branch: this.config.branch,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Could not remove from the repository (${response.status}).`,
      );
    }
  }
}

export function getPhotoWriter(localDir: string, repoDir: string): PhotoWriter {
  const token = process.env.GITHUB_TOKEN;
  const slug = process.env.GITHUB_REPO;

  if (token && slug) {
    const [owner, repo] = slug.split("/");
    if (!owner || !repo) {
      throw new Error('GITHUB_REPO must look like "owner/repo".');
    }
    return new GitHubWriter({
      token,
      owner,
      repo,
      branch: process.env.GITHUB_BRANCH ?? "main",
      dir: repoDir,
    });
  }

  return new FsWriter(localDir);
}
