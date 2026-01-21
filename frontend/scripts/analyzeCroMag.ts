import { fetchFileLines, GitHubFileCache } from "../src/validation/githubFetcher";
import { GAME_REPOSITORIES } from "../src/validation/gameRepositories";

async function main() {
  const repo = GAME_REPOSITORIES["cromagrally"];
  repo.sourcePath = "";

  const fetchFile = async (path: string) => {
    console.log(`\n--- Fetching ${path} ---`);
    const result = await fetchFileLines(repo.owner, repo.repo, repo.branch, path, 1, 3000);
    if (result.success && result.lines) {
      console.log(result.content);
    } else {
      console.error("Failed:", result.error);
    }
  };

  await fetchFile("Source/Headers/mobjtypes.h");
  await fetchFile("Source/Headers/structs.h"); // For MAX_TRACKS maybe
}

main();
