import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { z } from "zod";
import { buildApiUrl } from "@/api/apiBase";

const iceServerSchema = z.object({
  urls: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  username: z.string().optional(),
  credential: z.string().optional(),
});

const iceServerListSchema = z.object({
  iceServers: z.array(iceServerSchema),
});

function mapIceServer(server: z.infer<typeof iceServerSchema>): RTCIceServer {
  return {
    urls: server.urls,
    username: server.username,
    credential: server.credential,
  };
}

export function fetchIceServers(): ResultAsync<readonly RTCIceServer[], string> {
  const url = buildApiUrl("/api/multiplayer/ice-servers");
  return ResultAsync.fromPromise(fetch(url, { method: "GET" }), () => {
    return "Unable to fetch ICE servers";
  }).andThen((response) => {
    if (!response.ok) {
      return errAsync(`ICE server request failed with status ${String(response.status)}`);
    }
    return ResultAsync.fromPromise(response.json(), () => {
      return "Invalid ICE server response body";
    }).andThen((json) => {
      const parsed = iceServerListSchema.safeParse(json);
      if (!parsed.success) {
        return errAsync("ICE server response schema is invalid");
      }
      return okAsync(parsed.data.iceServers.map(mapIceServer));
    });
  });
}
