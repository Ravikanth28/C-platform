"""Lightweight observability: a ring buffer of recent events (logs + HTTP) + service checks."""
import collections
import itertools
import logging
import os
import shutil
import subprocess
import time

# One unified feed for both application logs and HTTP requests so the System page
# can show a single live stream (newest-first) the way a backend terminal does.
_RING = collections.deque(maxlen=500)
_SEQ = itertools.count(1)

# Library loggers that are too chatty to keep at INFO — only their WARNING+ get in.
_NOISY = ("sqlalchemy", "uvicorn", "asyncio", "watchfiles", "multipart",
          "httpcore", "httpx", "python_multipart", "PIL")


def _now():
    return time.strftime("%H:%M:%S", time.localtime())


class _RingHandler(logging.Handler):
    def emit(self, record):
        try:
            if record.levelno < logging.WARNING and record.name.split(".")[0] in _NOISY:
                return  # drop chatty INFO/DEBUG from third-party libs
            _RING.append({
                "seq": next(_SEQ),
                "kind": "log",
                "time": _now(),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage()[:600],
            })
        except Exception:
            pass


def install_log_capture(level=logging.INFO):
    """Attach the ring handler to the root logger (captures INFO+ from the app)."""
    root = logging.getLogger()
    if root.level > logging.INFO:
        root.setLevel(logging.INFO)
    if not any(isinstance(h, _RingHandler) for h in root.handlers):
        h = _RingHandler()
        h.setLevel(level)
        root.addHandler(h)


def record_http(method, path, status, ms):
    """Record one finished HTTP request into the live feed."""
    try:
        _RING.append({
            "seq": next(_SEQ),
            "kind": "http",
            "time": _now(),
            "method": method,
            "path": path[:200],
            "status": int(status),
            "ms": round(float(ms), 1),
        })
    except Exception:
        pass


def recent_events(limit=250):
    """Newest-first slice of the unified feed (logs + HTTP)."""
    return list(_RING)[-limit:][::-1]


# Back-compat alias (older callers used recent_logs()).
recent_logs = recent_events


def _which_version(cmd):
    path = shutil.which(cmd)
    if not path:
        return None, None
    try:
        out = subprocess.run([cmd, "--version"], capture_output=True, text=True, timeout=5)
        lines = (out.stdout or out.stderr or "").splitlines()
        return path, (lines[0].strip() if lines else path)
    except Exception:
        return path, path


def run_checks(db_ok, db_detail):
    """Return a list of service checks. `critical` flips overall status to 'issues'."""
    checks = [{"name": "Database", "ok": db_ok, "critical": True, "detail": db_detail}]

    gcc_path, gcc_ver = _which_version("gcc")
    checks.append({
        "name": "C compiler (gcc)", "ok": bool(gcc_path), "critical": True,
        "detail": gcc_ver or "not found — Run / Submit will fail",
    })

    gdb_path, gdb_ver = _which_version("gdb")
    checks.append({
        "name": "Debugger (gdb)", "ok": bool(gdb_path), "critical": False,
        "detail": gdb_ver or "not installed — Code Visualizer is disabled",
    })

    keys = sum(1 for i in range(1, 21) if os.getenv(f"CEREBRAS_API_KEY_{i}", "").strip())
    checks.append({
        "name": "AI tutor (Cerebras)", "ok": keys > 0, "critical": False,
        "detail": f"{keys} API key(s) configured" if keys else "no API keys — AI tutor disabled",
    })

    upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
    try:
        os.makedirs(upload_dir, exist_ok=True)
        probe = os.path.join(upload_dir, ".write_test")
        with open(probe, "w") as f:
            f.write("ok")
        os.remove(probe)
        checks.append({"name": "Uploads storage", "ok": True, "critical": True, "detail": "writable"})
    except Exception as e:
        checks.append({"name": "Uploads storage", "ok": False, "critical": True, "detail": f"not writable: {e}"})

    return checks
