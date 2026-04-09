import { send } from "../client/tcp-client";

export async function param(args: string[]) {
  const subcommand = args[0];

  switch (subcommand) {
    case "get":
      return paramGet(args.slice(1));
    case "set":
      return paramSet(args.slice(1));
    default:
      console.error("Usage: td param <get|set> [options]");
      process.exit(1);
  }
}

async function paramGet(args: string[]) {
  const nodePath = args[0];
  const paramName = args[1];
  if (!nodePath) {
    console.error("Usage: td param get <path> [param]");
    process.exit(1);
  }
  const params: Record<string, unknown> = { nodePath };
  if (paramName) params.paramName = paramName;

  const res = await send("param.get", params);
  if (res.status === "error") {
    console.error(`Error: ${res.error}`);
    process.exit(1);
  }

  if (Array.isArray(res.data)) {
    const pars = res.data as Array<{ name: string; value: unknown; default: unknown }>;
    for (const p of pars) {
      const defaultMarker = p.value === p.default ? "" : " (modified)";
      console.log(`  ${p.name} = ${p.value}${defaultMarker}`);
    }
  } else {
    const p = res.data as { name: string; value: unknown; default: unknown };
    console.log(`${p.name} = ${p.value}`);
  }
}

async function paramSet(args: string[]) {
  const nodePath = args[0];
  const paramName = args[1];
  const value = args[2];
  if (!nodePath || !paramName || value === undefined) {
    console.error("Usage: td param set <path> <param> <value>");
    process.exit(1);
  }

  let parsedValue: unknown = value;
  if (!isNaN(Number(value))) {
    parsedValue = Number(value);
  } else if (value === "true") {
    parsedValue = true;
  } else if (value === "false") {
    parsedValue = false;
  }

  const res = await send("param.set", { nodePath, paramName, value: parsedValue });
  if (res.status === "error") {
    console.error(`Error: ${res.error}`);
    process.exit(1);
  }
  const data = res.data as { name: string; value: unknown };
  console.log(`${data.name} = ${data.value}`);
}
