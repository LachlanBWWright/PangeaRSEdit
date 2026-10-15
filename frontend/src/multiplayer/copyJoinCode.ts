import { errAsync, Result, ResultAsync } from "neverthrow";

export function copyJoinCode(
  joinCode: string,
  clipboard: Pick<Clipboard, "writeText"> | undefined,
): ResultAsync<void, string> {
  if (!clipboard) {
    return errAsync("Copy is unavailable. Select the join code and copy it manually.");
  }

  const writeResult = Result.fromThrowable(
    () => clipboard.writeText(joinCode),
    () => "Could not copy the code. Select it and copy it manually.",
  )();
  if (writeResult.isErr()) {
    return errAsync(writeResult.error);
  }
  return ResultAsync.fromPromise(
    writeResult.value,
    () => "Could not copy the code. Select it and copy it manually.",
  );
}
