import { connect, type Socket } from "net";
import type { Action, Request, Response } from "../protocol/types";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 9005;
const TIMEOUT_MS = 5000;

export function createRequest(action: Action, params: Record<string, unknown>): Request {
  return {
    id: crypto.randomUUID(),
    action,
    params,
  };
}

export async function send(action: Action, params: Record<string, unknown>): Promise<Response> {
  const host = process.env.TD_HOST ?? DEFAULT_HOST;
  const port = Number(process.env.TD_PORT ?? DEFAULT_PORT);
  const req = createRequest(action, params);

  try {
    return await new Promise((resolve, reject) => {
      const socket: Socket = connect({ host, port }, () => {
        socket.write(JSON.stringify(req) + "\n");
      });

      let buffer = "";

      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        const newlineIdx = buffer.indexOf("\n");
        if (newlineIdx !== -1) {
          const line = buffer.slice(0, newlineIdx);
          socket.end();
          try {
            resolve(JSON.parse(line) as Response);
          } catch {
            reject(new Error(`Invalid JSON from server: ${line}`));
          }
        }
      });

      socket.on("error", (err) => {
        reject(err);
      });

      socket.setTimeout(TIMEOUT_MS, () => {
        socket.destroy();
        reject(new Error("timeout"));
      });
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ECONNREFUSED") {
      console.error("Cannot connect to TouchDesigner. Is it running with the TD server script loaded?");
      console.error("Run 'td setup' for installation instructions.");
    } else if ((err as Error).message === "timeout") {
      console.error("Connection to TouchDesigner timed out.");
    } else {
      console.error(`Connection error: ${(err as Error).message}`);
    }
    process.exit(1);
  }
}
