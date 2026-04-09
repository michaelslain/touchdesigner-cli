#!/usr/bin/env bun

import { setup } from "./commands/setup";
import { info } from "./commands/info";
import { project } from "./commands/project";
import { node } from "./commands/node";
import { param } from "./commands/param";
import { exec } from "./commands/exec";

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log("touchdesigner-cli v0.1.0");
  console.log("Usage: td <command> [subcommand] [options]");
  console.log("");
  console.log("Commands:");
  console.log("  setup              Install TD server script");
  console.log("  info               Show TouchDesigner info");
  console.log("  project create     Create a project");
  console.log("  node               Node operations (list, create, delete, connect, disconnect, errors)");
  console.log("  param              Parameter operations (get, set)");
  console.log("  exec               Execute Python in TD");
  process.exit(0);
}

const commandArgs = args.slice(1);

switch (command) {
  case "setup":
    await setup(commandArgs);
    break;
  case "info":
    await info();
    break;
  case "project":
    await project(commandArgs);
    break;
  case "node":
    await node(commandArgs);
    break;
  case "param":
    await param(commandArgs);
    break;
  case "exec":
    await exec(commandArgs);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
