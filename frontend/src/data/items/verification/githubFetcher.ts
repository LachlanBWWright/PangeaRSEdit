import type { Result } from "@/types/result";
import type { FetchedFile } from "./types";
import { ok, err } from "@/types/result";

/**
 * Fetch a file from a GitHub repository using the raw content URL
 */
export async function fetchGitHubFile(
  owner: string,
  repo: string,
  path: string,
  branch: string = "master",
): Promise<Result<FetchedFile, Error>> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return err(new Error(`Failed to fetch ${url}: ${response.status}`));
    }
    const content = await response.text();
    return ok({
      content,
      lines: content.split("\n"),
      path,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
