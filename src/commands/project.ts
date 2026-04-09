import { send } from "../client/tcp-client";

export async function project(args: string[]) {
  const subcommand = args[0];

  if (subcommand === "create") {
    const name = args[1];
    if (!name) {
      console.error("Usage: td project create <name>");
      process.exit(1);
    }
    const res = await send("project.create", { name });
    if (res.status === "error") {
      console.error(`Error: ${res.error}`);
      process.exit(1);
    }
    const data = res.data as { path: string; name: string };
    console.log(`Created project: ${data.path}`);
    return;
  }

  console.error("Usage: td project create <name>");
  process.exit(1);
}
