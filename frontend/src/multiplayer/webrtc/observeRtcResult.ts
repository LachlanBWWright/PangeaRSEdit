import type { ResultAsync } from "neverthrow";

export function ignoreRtcError(_message: string): void {
  return;
}

export function observeRtcResult(
  operation: ResultAsync<void, string>,
  context: string,
  onError: (message: string) => void,
): void {
  void operation.then((result) => {
    if (result.isErr()) {
      onError(`${context}: ${result.error}`);
    }
  });
}
