import { resolve, join } from "path";
import { homedir } from "os";
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  copyFileSync,
  readdirSync,
} from "fs";
import { execSync } from "child_process";

const TD_CLI_DIR = join(homedir(), ".td-cli");
const SERVER_DEST = join(TD_CLI_DIR, "td-server.py");
const TD_APP = "/Applications/TouchDesigner.app";
const TOEEXPAND = join(TD_APP, "Contents/MacOS/toeexpand");
const TOECOLLAPSE = join(TD_APP, "Contents/MacOS/toecollapse");
const TEMPLATE_DIR = join(
  TD_APP,
  "Contents/Resources/tfs/Samples/Setup/Base"
);
const TEMPLATE_TOE = join(TEMPLATE_DIR, "NewProject.toe");
const TEMPLATE_BACKUP = join(TD_CLI_DIR, "NewProject.toe.backup");

export function setup(args: string[]) {
  if (args.includes("--uninstall")) {
    return uninstall();
  }

  const port = getPortArg(args);
  installServer(port);
  patchTemplate();
}

function getPortArg(args: string[]): number | null {
  const idx = args.indexOf("--port");
  if (idx === -1 || idx + 1 >= args.length) return null;
  const port = Number(args[idx + 1]);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error("Invalid port number");
    process.exit(1);
  }
  return port;
}

function installServer(port: number | null) {
  const serverSrcPath = resolve(import.meta.dir, "../../server/td-server.py");
  let serverCode: string;

  try {
    serverCode = readFileSync(serverSrcPath, "utf-8");
  } catch {
    console.error(
      "Server script not found. Is touchdesigner-cli installed correctly?"
    );
    process.exit(1);
  }

  if (port !== null) {
    serverCode = serverCode.replace(/^PORT = \d+/m, `PORT = ${port}`);
  }

  mkdirSync(TD_CLI_DIR, { recursive: true });
  writeFileSync(SERVER_DEST, serverCode);

  console.log("Server script installed.");
  console.log(`  Location: ${SERVER_DEST}`);
  console.log(`  Port: ${port ?? 9005}`);
}

function buildTextFileContent(pythonCode: string): Buffer {
  const content = Buffer.from(pythonCode);
  const header = Buffer.alloc(27);
  // Version line: "2\n*"
  header[0] = 0x32; // '2'
  header[1] = 0x0a; // '\n'
  header[2] = 0x2a; // '*'
  // 5 x BE uint32: 1, 1, 1, 1, 2
  header.writeUInt32BE(1, 3);
  header.writeUInt32BE(1, 7);
  header.writeUInt32BE(1, 11);
  header.writeUInt32BE(1, 15);
  header.writeUInt32BE(2, 19);
  // BE uint32 content length
  header.writeUInt32BE(content.length, 23);
  return Buffer.concat([header, content]);
}

function patchTemplate() {
  if (!existsSync(TOEEXPAND)) {
    console.error(
      "\nTouchDesigner not found at /Applications/TouchDesigner.app"
    );
    console.error("Cannot auto-patch default template.");
    return;
  }

  if (!existsSync(TEMPLATE_TOE)) {
    console.error("\nDefault template not found. Cannot auto-patch.");
    return;
  }

  // Backup original template (only once)
  if (!existsSync(TEMPLATE_BACKUP)) {
    copyFileSync(TEMPLATE_TOE, TEMPLATE_BACKUP);
  }

  // Expand template
  const tmpDir = join(TD_CLI_DIR, "tmp-patch");
  mkdirSync(tmpDir, { recursive: true });

  const tmpToe = join(tmpDir, "NewProject.toe");
  copyFileSync(TEMPLATE_TOE, tmpToe);

  // toeexpand exits with code 1 even on success, so ignore exit code
  try {
    execSync(`"${TOEEXPAND}" "${tmpToe}"`, { stdio: "pipe" });
  } catch {}

  const toeDir = tmpToe + ".dir";
  const toeToc = tmpToe + ".toc";

  if (!existsSync(toeDir) || !existsSync(toeToc)) {
    console.error("\nFailed to expand template. Cannot auto-patch.");
    cleanupDir(tmpDir);
    return;
  }

  // Check if already patched
  const project1Dir = join(toeDir, "project1");
  mkdirSync(project1Dir, { recursive: true });

  if (existsSync(join(project1Dir, "td_cli_server.n"))) {
    console.log("\nDefault template already patched.");
    cleanupDir(tmpDir);
    return;
  }

  // Add Execute DAT node
  writeFileSync(
    join(project1Dir, "td_cli_server.n"),
    "DAT:execute\ntile 600 300 320 160\nflags =  picked on viewer 1 parlanguage 0\nend\n"
  );

  writeFileSync(
    join(project1Dir, "td_cli_server.parm"),
    "?\nactive 0 on\nexecuteloc 0 current\nstart 0 on\n?\n"
  );

  const onStartScript = `import os

def onStart():
\tserver_path = os.path.expanduser('~/.td-cli/td-server.py')
\tif os.path.exists(server_path):
\t\texec(open(server_path).read(), globals())
\treturn

def create():
\treturn

def onExit():
\treturn

def onFrameStart(frame):
\timport td as _td
\tif hasattr(_td, '_cli_process'):
\t\t_td._cli_process()

def onFrameEnd(frame):
\treturn

def onPlayStateChange(state):
\treturn

def onDeviceChange():
\treturn
`;

  writeFileSync(
    join(project1Dir, "td_cli_server.text"),
    buildTextFileContent(onStartScript)
  );

  // Update toc
  const toc = readFileSync(toeToc, "utf-8").trimEnd();
  const tocLines = toc.split("\n");
  // Insert after project1.panel
  const insertIdx =
    tocLines.findIndex((l) => l === "project1.panel") + 1;
  tocLines.splice(
    insertIdx,
    0,
    "project1/td_cli_server.n",
    "project1/td_cli_server.parm",
    "project1/td_cli_server.text"
  );
  writeFileSync(toeToc, tocLines.join("\n") + "\n");

  // toecollapse also exits with code 1 on success
  try {
    execSync(`"${TOECOLLAPSE}" "${tmpToe}"`, { stdio: "pipe" });
  } catch {}

  if (!existsSync(tmpToe)) {
    console.error("\nFailed to collapse template. Cannot auto-patch.");
    cleanupDir(tmpDir);
    return;
  }

  // Replace original template
  copyFileSync(tmpToe, TEMPLATE_TOE);
  cleanupDir(tmpDir);

  console.log("\nDefault template patched!");
  console.log("  Every new TouchDesigner project will auto-start the CLI server.");
  console.log("  Original backed up to: " + TEMPLATE_BACKUP);
}

function cleanupDir(dir: string) {
  try {
    execSync(`rm -rf "${dir}"`, { stdio: "pipe" });
  } catch {}
}

function uninstall() {
  if (existsSync(SERVER_DEST)) {
    unlinkSync(SERVER_DEST);
    console.log("Server script removed.");
  }

  // Restore original template
  if (existsSync(TEMPLATE_BACKUP) && existsSync(TEMPLATE_DIR)) {
    copyFileSync(TEMPLATE_BACKUP, TEMPLATE_TOE);
    unlinkSync(TEMPLATE_BACKUP);
    console.log("Default template restored to original.");
  }

  if (!existsSync(SERVER_DEST) && !existsSync(TEMPLATE_BACKUP)) {
    console.log("Nothing to remove.");
  }
}
