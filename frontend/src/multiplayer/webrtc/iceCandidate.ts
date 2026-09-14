import { Result } from "neverthrow";
import { z } from "zod";

const iceCandidatePayloadSchema = z.object({
  candidate: z.string().min(1),
  sdpMid: z.string().nullable().optional(),
  sdpMLineIndex: z.number().int().nonnegative().nullable().optional(),
  usernameFragment: z.string().nullable().optional(),
});

export type SignaledIceCandidate = z.infer<typeof iceCandidatePayloadSchema>;
export type IceCandidateInput = SignaledIceCandidate | string;

export function normalizeIceCandidate(
  candidate: IceCandidateInput,
): SignaledIceCandidate {
  return typeof candidate === "string" ? { candidate } : candidate;
}

export function serializeIceCandidate(
  candidate: SignaledIceCandidate,
): Result<string, string> {
  return Result.fromThrowable(
    () => JSON.stringify(candidate),
    () => "Failed to serialize ICE candidate",
  )();
}

export function parseSignaledIceCandidate(
  value: string,
): SignaledIceCandidate {
  const parsedJson = Result.fromThrowable(
    () => JSON.parse(value),
    () => null,
  )();
  const parsed = iceCandidatePayloadSchema.safeParse(
    parsedJson.isOk() ? parsedJson.value : null,
  );
  return parsed.success ? parsed.data : { candidate: value };
}
