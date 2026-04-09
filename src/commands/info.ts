import { send } from "../client/tcp-client";

export async function info() {
  const res = await send("info", {});
  if (res.status === "error") {
    console.error(`Error: ${res.error}`);
    process.exit(1);
  }
  const data = res.data as Record<string, string>;
  console.log(`TouchDesigner ${data.version} (build ${data.build})`);
  console.log(`OS: ${data.osName} ${data.osVersion ?? ""}`);
}
