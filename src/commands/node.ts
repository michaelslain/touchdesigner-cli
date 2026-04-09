import { send } from "../client/tcp-client";

export async function node(args: string[]) {
  const subcommand = args[0];

  switch (subcommand) {
    case "list":
      return nodeList(args.slice(1));
    case "create":
      return nodeCreate(args.slice(1));
    case "delete":
      return nodeDelete(args.slice(1));
    case "connect":
      return nodeConnect(args.slice(1));
    case "disconnect":
      return nodeDisconnect(args.slice(1));
    case "errors":
      return nodeErrors(args.slice(1));
    default:
      console.error("Usage: td node <list|create|delete|connect|disconnect|errors> [options]");
      process.exit(1);
  }
}

async function nodeList(args: string[]) {
  const parentPath = args[0];
  if (!parentPath) {
    console.error("Usage: td node list <path>");
    process.exit(1);
  }
  const res = await send("node.list", { parentPath });
  if (res.status === "error") {
    console.error(`Error: ${res.error}`);
    process.exit(1);
  }
  const nodes = res.data as Array<{ name: string; path: string; type: string; family: string }>;
  if (nodes.length === 0) {
    console.log("No child nodes.");
    return;
  }
  for (const n of nodes) {
    console.log(`  ${n.name}\t${n.type}\t${n.path}`);
  }
}

async function nodeCreate(args: string[]) {
  const nodeType = args[0];
  const parentIdx = args.indexOf("--parent");
  const nameIdx = args.indexOf("--name");

  if (!nodeType || parentIdx === -1 || parentIdx + 1 >= args.length) {
    console.error("Usage: td node create <type> --parent <path> [--name <name>]");
    process.exit(1);
  }

  const parentPath = args[parentIdx + 1];
  const nodeName = nameIdx !== -1 && nameIdx + 1 < args.length ? args[nameIdx + 1] : undefined;

  const params: Record<string, unknown> = { parentPath, nodeType };
  if (nodeName) params.nodeName = nodeName;

  const res = await send("node.create", params);
  if (res.status === "error") {
    console.error(`Error: ${res.error}`);
    process.exit(1);
  }
  const data = res.data as { name: string; path: string; type: string };
  console.log(`Created: ${data.path} (${data.type})`);
}

async function nodeDelete(args: string[]) {
  const nodePath = args[0];
  if (!nodePath) {
    console.error("Usage: td node delete <path>");
    process.exit(1);
  }
  const res = await send("node.delete", { nodePath });
  if (res.status === "error") {
    console.error(`Error: ${res.error}`);
    process.exit(1);
  }
  const data = res.data as { deleted: string };
  console.log(`Deleted: ${data.deleted}`);
}

async function nodeConnect(args: string[]) {
  const sourcePath = args[0];
  const targetPath = args[1];
  if (!sourcePath || !targetPath) {
    console.error("Usage: td node connect <source> <target>");
    process.exit(1);
  }
  const res = await send("node.connect", { sourcePath, targetPath });
  if (res.status === "error") {
    console.error(`Error: ${res.error}`);
    process.exit(1);
  }
  const data = res.data as { connected: string };
  console.log(data.connected);
}

async function nodeDisconnect(args: string[]) {
  const sourcePath = args[0];
  const targetPath = args[1];
  if (!sourcePath || !targetPath) {
    console.error("Usage: td node disconnect <source> <target>");
    process.exit(1);
  }
  const res = await send("node.disconnect", { sourcePath, targetPath });
  if (res.status === "error") {
    console.error(`Error: ${res.error}`);
    process.exit(1);
  }
  const data = res.data as { disconnected: string };
  console.log(data.disconnected);
}

async function nodeErrors(args: string[]) {
  const nodePath = args[0];
  if (!nodePath) {
    console.error("Usage: td node errors <path>");
    process.exit(1);
  }
  const res = await send("node.errors", { nodePath });
  if (res.status === "error") {
    console.error(`Error: ${res.error}`);
    process.exit(1);
  }
  const errors = res.data as string[];
  if (errors.length === 0) {
    console.log("No errors.");
    return;
  }
  for (const e of errors) {
    console.log(`  ${e}`);
  }
}
