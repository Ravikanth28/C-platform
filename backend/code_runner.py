"""
In-process code runner.

- Python  → exec() inside a daemon thread with stdout/stderr capture + 10s timeout
- JavaScript → Node.js subprocess
- C++      → g++ compile then subprocess
"""

import io
import os
import subprocess
import sys
import tempfile
import threading
import traceback


# ── Python in-process ────────────────────────────────────────────────────────

def _run_python(code: str, stdin_input: str, result: dict, done: threading.Event) -> None:
    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()
    stdin_buf = io.StringIO(stdin_input)

    _old_out, _old_err, _old_in = sys.stdout, sys.stderr, sys.stdin
    sys.stdout, sys.stderr, sys.stdin = stdout_buf, stderr_buf, stdin_buf

    try:
        exec(compile(code, "<student_code>", "exec"), {"__builtins__": __builtins__, "__name__": "__main__"})
        result["output"] = stdout_buf.getvalue()
        result["error"] = stderr_buf.getvalue()
        result["status"] = "success"
    except SystemExit:
        result["output"] = stdout_buf.getvalue()
        result["error"] = ""
        result["status"] = "success"
    except Exception:
        result["output"] = stdout_buf.getvalue()
        result["error"] = traceback.format_exc()
        result["status"] = "error"
    finally:
        sys.stdout, sys.stderr, sys.stdin = _old_out, _old_err, _old_in
        done.set()


def run_python_inprocess(code: str, stdin_input: str = "", timeout: int = 10) -> dict:
    result: dict = {"output": "", "error": "", "status": "success"}
    done = threading.Event()
    thread = threading.Thread(target=_run_python, args=(code, stdin_input, result, done), daemon=True)
    thread.start()
    thread.join(timeout)
    if not done.is_set():
        result["output"] = result.get("output", "")
        result["error"] = f"Time Limit Exceeded ({timeout}s)"
        result["status"] = "tle"
    return result


# ── Subprocess helpers ────────────────────────────────────────────────────────

def _subprocess_run(cmd: list, stdin_input: str = "", timeout: int = 10) -> dict:
    try:
        proc = subprocess.run(
            cmd,
            input=stdin_input,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "output": proc.stdout,
            "error": proc.stderr,
            "status": "success" if proc.returncode == 0 else "error",
        }
    except subprocess.TimeoutExpired:
        return {"output": "", "error": f"Time Limit Exceeded ({timeout}s)", "status": "tle"}
    except FileNotFoundError as exc:
        return {"output": "", "error": f"Runtime not found: {exc}", "status": "error"}
    except Exception as exc:
        return {"output": "", "error": str(exc), "status": "error"}


def run_javascript(code: str, stdin_input: str = "", timeout: int = 10) -> dict:
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False)
    try:
        tmp.write(code)
        tmp.close()
        return _subprocess_run(["node", tmp.name], stdin_input, timeout)
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


def run_cpp(code: str, stdin_input: str = "", timeout: int = 10) -> dict:
    src = tempfile.NamedTemporaryFile(mode="w", suffix=".cpp", delete=False)
    out_path = src.name.replace(".cpp", "")
    try:
        src.write(code)
        src.close()

        compile_proc = subprocess.run(
            ["g++", "-O2", "-o", out_path, src.name],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if compile_proc.returncode != 0:
            return {"output": "", "error": compile_proc.stderr, "status": "error"}

        return _subprocess_run([out_path], stdin_input, timeout)
    except FileNotFoundError:
        return {"output": "", "error": "g++ not found. Install GCC/MinGW to run C++.", "status": "error"}
    except subprocess.TimeoutExpired:
        return {"output": "", "error": "Compilation timed out.", "status": "error"}
    finally:
        for path in (src.name, out_path):
            try:
                os.unlink(path)
            except OSError:
                pass


# ── Dispatcher ────────────────────────────────────────────────────────────────

def run_code(code: str, language: str, stdin_input: str = "") -> dict:
    lang = language.lower()
    if lang == "python":
        return run_python_inprocess(code, stdin_input)
    elif lang == "javascript":
        return run_javascript(code, stdin_input)
    elif lang in ("cpp", "c++"):
        return run_cpp(code, stdin_input)
    return {"output": "", "error": f"Language '{language}' is not supported.", "status": "error"}
