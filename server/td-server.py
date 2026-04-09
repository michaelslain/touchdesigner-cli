"""
TouchDesigner CLI Server
Listens on a TCP port and executes commands via TD's Python API.
All TD API calls are dispatched to the main thread via run() to avoid thread conflicts.
Install: Run 'td setup' from the touchdesigner-cli tool.
"""

import socket
import json
import threading
import queue as _queue

PORT = 9005
HOST = "127.0.0.1"

_request_queue = _queue.Queue()


def handle_action(action, params):
    if action == "info":
        return {
            "version": app.version,
            "build": app.build,
            "osName": app.osName,
            "osVersion": app.osVersion,
        }

    elif action == "project.create":
        name = params["name"]
        node = root.create(baseCOMP, name)
        return {"path": node.path, "name": node.name}

    elif action == "node.list":
        parent_path = params["parentPath"]
        parent = op(parent_path)
        if parent is None:
            raise ValueError(f"Node not found: {parent_path}")
        children = parent.children
        return [
            {"name": c.name, "path": c.path, "type": c.OPType, "family": c.family}
            for c in children
        ]

    elif action == "node.create":
        parent_path = params["parentPath"]
        node_type = params["nodeType"]
        node_name = params.get("nodeName")
        parent = op(parent_path)
        if parent is None:
            raise ValueError(f"Parent not found: {parent_path}")
        import td as _td
        td_type = getattr(_td, node_type, None)
        if td_type is None:
            raise ValueError(f"Unknown node type: {node_type}")
        node = parent.create(td_type, node_name or "")
        return {"name": node.name, "path": node.path, "type": node.OPType}

    elif action == "node.delete":
        node_path = params["nodePath"]
        node = op(node_path)
        if node is None:
            raise ValueError(f"Node not found: {node_path}")
        name = node.name
        node.destroy()
        return {"deleted": name}

    elif action == "node.connect":
        source_path = params["sourcePath"]
        target_path = params["targetPath"]
        source_index = params.get("sourceIndex", 0)
        target_index = params.get("targetIndex", 0)
        source = op(source_path)
        target = op(target_path)
        if source is None:
            raise ValueError(f"Source not found: {source_path}")
        if target is None:
            raise ValueError(f"Target not found: {target_path}")
        target.inputConnectors[target_index].connect(source.outputConnectors[source_index])
        return {"connected": f"{source_path} -> {target_path}"}

    elif action == "node.disconnect":
        source_path = params["sourcePath"]
        target_path = params["targetPath"]
        target_index = params.get("targetIndex", 0)
        target = op(target_path)
        if target is None:
            raise ValueError(f"Target not found: {target_path}")
        target.inputConnectors[target_index].disconnect()
        return {"disconnected": f"{source_path} -x- {target_path}"}

    elif action == "node.errors":
        node_path = params["nodePath"]
        node = op(node_path)
        if node is None:
            raise ValueError(f"Node not found: {node_path}")
        errors = node.errors()
        return [str(e) for e in errors] if errors else []

    elif action == "param.get":
        node_path = params["nodePath"]
        param_name = params.get("paramName")
        node = op(node_path)
        if node is None:
            raise ValueError(f"Node not found: {node_path}")
        if param_name:
            p = getattr(node.par, param_name, None)
            if p is None:
                raise ValueError(f"Parameter not found: {param_name}")
            return {"name": p.name, "value": p.eval(), "default": p.default}
        else:
            return [
                {"name": p.name, "value": p.eval(), "default": p.default}
                for p in node.pars()
            ]

    elif action == "param.set":
        node_path = params["nodePath"]
        param_name = params["paramName"]
        value = params["value"]
        node = op(node_path)
        if node is None:
            raise ValueError(f"Node not found: {node_path}")
        p = getattr(node.par, param_name, None)
        if p is None:
            raise ValueError(f"Parameter not found: {param_name}")
        p.val = value
        return {"name": p.name, "value": p.eval()}

    elif action == "exec":
        script = params["script"]
        result = {"output": None}
        exec_globals = {"result": result}
        exec(script, exec_globals)
        return {"output": result.get("output")}

    else:
        raise ValueError(f"Unknown action: {action}")


def _process_requests():
    """Called on TD main thread via run(). Drains the request queue."""
    while not _request_queue.empty():
        try:
            action, params, result_holder, event = _request_queue.get_nowait()
            try:
                data = handle_action(action, params)
                result_holder["status"] = "ok"
                result_holder["data"] = data
            except Exception as e:
                result_holder["status"] = "error"
                result_holder["error"] = str(e)
            finally:
                event.set()
        except _queue.Empty:
            break


# Store processor on td module so run() can find it
import td as _td_module
_td_module._cli_process = _process_requests


def _dispatch(action, params):
    """Called from TCP threads. Queues work and waits for main thread."""
    result_holder = {}
    event = threading.Event()
    _request_queue.put((action, params, result_holder, event))
    if not event.wait(timeout=10):
        raise TimeoutError("TouchDesigner main thread did not respond within 10s")
    if result_holder["status"] == "error":
        raise ValueError(result_holder["error"])
    return result_holder["data"]


def handle_client(conn, addr):
    try:
        buffer = ""
        while True:
            data = conn.recv(4096)
            if not data:
                break
            buffer += data.decode("utf-8")
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                if not line.strip():
                    continue
                req_id = "unknown"
                try:
                    req = json.loads(line)
                    req_id = req.get("id", "unknown")
                    action = req.get("action", "")
                    params = req.get("params", {})
                    data = _dispatch(action, params)
                    response = {"id": req_id, "status": "ok", "data": data}
                except Exception as e:
                    response = {"id": req_id, "status": "error", "error": str(e)}
                conn.sendall((json.dumps(response) + "\n").encode("utf-8"))
    except Exception as e:
        print(f"[td-cli-server] Client error: {e}")
    finally:
        conn.close()


def start_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(5)
    print(f"[td-cli-server] Listening on {HOST}:{PORT}")

    def accept_loop():
        while True:
            conn, addr = server.accept()
            client_thread = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
            client_thread.start()

    thread = threading.Thread(target=accept_loop, daemon=True)
    thread.start()


# Auto-start when loaded in TouchDesigner
start_server()
