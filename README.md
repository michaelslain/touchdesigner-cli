# touchdesigner-cli

CLI tool to control TouchDesigner over TCP

## Install

```bash
git clone https://github.com/michaelslain/touchdesigner-cli.git
cd touchdesigner-cli
bun install
bun link
```

## Setup

Run the setup command to install the TCP server script into TouchDesigner:

```bash
td setup
```

This copies a Python server script to `~/.td-cli/td-server.py` and patches your TouchDesigner project to run it on startup.

## Usage

### Info

```bash
td info
```

Show TouchDesigner version, OS, and project details.

### Project

```bash
td project create MyProject
```

### Nodes

```bash
td node list /project1
td node create /project1 constant TOP
td node delete /project1/constant1
td node connect /project1/constant1 /project1/null1
td node disconnect /project1/constant1 /project1/null1
td node errors /project1/constant1
```

### Parameters

```bash
td param get /project1/constant1 color
td param set /project1/constant1 color 1,0,0
```

### Execute Python

```bash
td exec "print(op('/project1').children)"
```

Run arbitrary Python inside the TouchDesigner process.

## Configuration

The CLI connects to TouchDesigner via TCP. Set these environment variables to override defaults:

| Variable  | Default     | Description        |
| --------- | ----------- | ------------------ |
| `TD_HOST` | `127.0.0.1` | TouchDesigner host |
| `TD_PORT` | `9090`      | TouchDesigner port |

## Requirements

- [Bun](https://bun.sh) runtime
- [TouchDesigner](https://derivative.ca) installed and running

## Development

```bash
git clone https://github.com/michaelslain/touchdesigner-cli.git
cd touchdesigner-cli
bun install
```

Run directly:

```bash
bun run src/index.ts info
```

Run tests:

```bash
bun test
```

## License

MIT
