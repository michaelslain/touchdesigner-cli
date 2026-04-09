import { readFileSync } from "fs";
import { send } from "../client/tcp-client";

export async function exec(args: string[]) {
  let script: string;

  if (args[0] === "--file") {
    const filePath = args[1];
    if (!filePath) {
      console.error("Usage: td exec --file <path>");
      process.exit(1);
    }
    try {
      script = readFileSync(filePath, "utf-8");
    } catch {
      console.error(`Cannot read file: ${filePath}`);
      process.exit(1);
    }
  } else {
    script = args.join(" ");
    if (!script) {
      console.error("Usage: td exec \"<python script>\"");
      console.error("       td exec --file <path>");
      process.exit(1);
    }
  }

  const res = await send("exec", { script });
  if (res.status === "error") {
    console.error(`Error: ${res.error}`);
    process.exit(1);
  }
  const data = res.data as { output: unknown };
  if (data.output !== null && data.output !== undefined) {
    console.log(data.output);
  }
}
