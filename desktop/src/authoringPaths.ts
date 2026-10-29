export const authoringSourceDirectory = "AuthoringSources";

export function isAuthoringSourcePath(relative: string): boolean {
  return relative === authoringSourceDirectory || relative.startsWith(`${authoringSourceDirectory}/`);
}
