"""
C Code Runner – compiles and executes C code in a temporary sandbox.
Works on both Windows (gcc must be in PATH) and Linux.
"""
import os
import re
import signal
import subprocess
import tempfile
import threading
import time
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

try:
    import resource  # POSIX only (Linux/Render); absent on Windows
except ImportError:
    resource = None

# Hard ceilings for any student program. Keeps a single submission from OOM-ing
# or fork-bombing a small instance (e.g. Render free tier = 512 MB / shared CPU).
_MEM_BYTES = 256 * 1024 * 1024   # 256 MB address space
_CPU_SECS = 6                    # CPU seconds (idle waiting for input doesn't count)
_FSIZE_BYTES = 16 * 1024 * 1024  # max file write
_NPROC = 64                      # max processes/threads
_MAX_OUTPUT = 64 * 1024          # bytes of captured stdout we keep


def _limit_preexec():
    """Return a preexec_fn applying rlimits, or None on Windows."""
    if resource is None:
        return None

    def _apply():
        for res, val in (
            (resource.RLIMIT_AS, _MEM_BYTES),
            (resource.RLIMIT_CPU, _CPU_SECS),
            (resource.RLIMIT_FSIZE, _FSIZE_BYTES),
            (getattr(resource, "RLIMIT_NPROC", None), _NPROC),
        ):
            if res is None:
                continue
            try:
                resource.setrlimit(res, (val, val))
            except Exception:
                pass

    return _apply


def _memcheck_preexec():
    """Like _limit_preexec but WITHOUT the address-space cap — AddressSanitizer
    reserves a huge virtual address range and would be killed by RLIMIT_AS."""
    if resource is None:
        return None

    def _apply():
        for res, val in (
            (resource.RLIMIT_CPU, _CPU_SECS),
            (resource.RLIMIT_FSIZE, _FSIZE_BYTES),
            (getattr(resource, "RLIMIT_NPROC", None), _NPROC),
        ):
            if res is None:
                continue
            try:
                resource.setrlimit(res, (val, val))
            except Exception:
                pass

    return _apply

# On Windows, ensure MinGW/UCRT64 gcc is findable if not already in PATH
_GCC_HINTS = [
    r"C:\msys64\ucrt64\bin",
    r"C:\msys64\mingw64\bin",
    r"C:\MinGW\bin",
]
for _hint in _GCC_HINTS:
    if os.path.isfile(os.path.join(_hint, "gcc.exe")) and _hint not in os.environ.get("PATH", ""):
        os.environ["PATH"] = _hint + os.pathsep + os.environ.get("PATH", "")
        break


def _normalize(output: str) -> str:
    """Strip trailing whitespace from each line and trim the whole block."""
    return "\n".join(line.rstrip() for line in output.strip().splitlines())


def _exe_name(tmpdir: str) -> str:
    return os.path.join(tmpdir, "sol.exe" if os.name == "nt" else "sol")


# Force-included before the student's source for the interactive console so
# stdout/stderr are UNBUFFERED — every printf streams instantly over a plain
# pipe, which is what makes prompts appear before scanf (CodeBlocks-style)
# even without a real terminal.
_UNBUFFER_HEADER = """#include <stdio.h>
static void __cf_unbuffer(void) __attribute__((constructor));
static void __cf_unbuffer(void) {
    setvbuf(stdout, (char *)0, _IONBF, 0);
    setvbuf(stderr, (char *)0, _IONBF, 0);
}
"""


def compile_code(src: str, tmpdir: str, force_unbuffered: bool = False) -> tuple[str, str]:
    """
    Compile C source.  Returns (exe_path, error_message).
    exe_path is empty string on failure.

    force_unbuffered: prepend a constructor that disables stdout buffering —
    used by the interactive console so output streams live over a pipe.
    """
    src_file = os.path.join(tmpdir, "solution.c")
    exe = _exe_name(tmpdir)
    with open(src_file, "w", encoding="utf-8") as f:
        f.write(src)

    cmd = ["gcc", "-o", exe]
    if force_unbuffered:
        hdr = os.path.join(tmpdir, "__cf_unbuffer.h")
        with open(hdr, "w", encoding="utf-8") as f:
            f.write(_UNBUFFER_HEADER)
        cmd += ["-include", hdr]
    cmd += [src_file, "-Wall", "-lm", "-O2"]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=15,
        )
    except FileNotFoundError as e:
        logger.error(f"Compiler execution error (gcc not found): {e}")
        return "", (
            "gcc not found.\n"
            "Please install MinGW-w64 and make sure gcc.exe is in your PATH.\n"
            "Download from: https://winlibs.com/ or https://www.mingw-w64.org/"
        )
    if result.returncode != 0:
        logger.error(f"Compilation failed with returncode {result.returncode}:\n{result.stderr}")
        return "", result.stderr
    return exe, result.stderr  # stderr on success = compiler warnings (if any)


def run_once(exe: str, input_data: str, time_limit: float = 5.0) -> Dict:
    """Run compiled binary with given input. Returns {status, output, time_ms, mem_kb}."""
    if os.name == "posix":
        return _run_posix(exe, input_data, time_limit)
    return _run_simple(exe, input_data, time_limit)


def _run_simple(exe, input_data, time_limit):
    """Windows / fallback path (no peak-memory measurement)."""
    start = time.monotonic()
    try:
        proc = subprocess.run(
            [exe], input=input_data, capture_output=True, text=True,
            timeout=time_limit, preexec_fn=_limit_preexec(),
        )
        elapsed = (time.monotonic() - start) * 1000
        if proc.returncode != 0:
            return {"status": "Runtime Error", "output": proc.stderr[:500], "time_ms": elapsed, "mem_kb": None}
        return {"status": "ok", "output": _normalize(proc.stdout)[:_MAX_OUTPUT], "time_ms": elapsed, "mem_kb": None}
    except subprocess.TimeoutExpired:
        return {"status": "Time Limit Exceeded", "output": "", "time_ms": time_limit * 1000, "mem_kb": None}


def _run_posix(exe, input_data, time_limit):
    """POSIX path: measures peak RSS via os.wait4 (ru_maxrss, KB on Linux)."""
    proc = subprocess.Popen(
        [exe], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        preexec_fn=_limit_preexec(), start_new_session=True,
    )
    out_chunks, err_chunks = [], []

    def reader(stream, sink):
        try:
            for chunk in iter(lambda: stream.read(65536), b""):
                sink.append(chunk)
        except Exception:
            pass

    t_out = threading.Thread(target=reader, args=(proc.stdout, out_chunks), daemon=True)
    t_err = threading.Thread(target=reader, args=(proc.stderr, err_chunks), daemon=True)
    t_out.start()
    t_err.start()

    timed_out = {"v": False}

    def killer():
        timed_out["v"] = True
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass

    timer = threading.Timer(time_limit, killer)
    timer.start()
    try:
        if input_data:
            proc.stdin.write(input_data.encode())
        proc.stdin.close()
    except Exception:
        pass

    start = time.monotonic()
    try:
        _, status, ru = os.wait4(proc.pid, 0)
    except ChildProcessError:
        status, ru = 0, None
    elapsed = (time.monotonic() - start) * 1000
    timer.cancel()
    t_out.join(timeout=1)
    t_err.join(timeout=1)

    out = b"".join(out_chunks).decode("utf-8", "replace")
    err = b"".join(err_chunks).decode("utf-8", "replace")
    mem_kb = int(ru.ru_maxrss) if ru else None  # Linux reports KB

    if timed_out["v"]:
        return {"status": "Time Limit Exceeded", "output": "", "time_ms": time_limit * 1000, "mem_kb": mem_kb}
    if not (os.WIFEXITED(status) and os.WEXITSTATUS(status) == 0):
        logger.error(f"Runtime error for {exe}: {err[:200]}")
        return {"status": "Runtime Error", "output": err[:500], "time_ms": elapsed, "mem_kb": mem_kb}
    return {"status": "ok", "output": _normalize(out)[:_MAX_OUTPUT], "time_ms": elapsed, "mem_kb": mem_kb}


def judge_submission(code: str, test_cases: List[Dict], time_limit: float = 5.0) -> Dict:
    """
    Full judge: compile once, run all test cases, return verdict.

    Each item in `test_cases` must have: id, input_data, expected_output, is_hidden.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        exe, compile_error = compile_code(code, tmpdir)
        if not exe:
            return {
                "status": "Compilation Error",
                "error": compile_error,
                "results": [],
                "passed": 0,
                "total": len(test_cases),
                "score": 0.0,
                "execution_time": 0.0,
            }

        results = []
        passed = 0
        max_time = 0.0

        for tc in test_cases:
            run = run_once(exe, tc.get("input_data", ""), time_limit)
            expected = _normalize(tc.get("expected_output", ""))
            actual = run["output"]
            tc_status = run["status"]

            if tc_status == "ok":
                tc_status = "Passed" if actual == expected else "Failed"
                if tc_status == "Passed":
                    passed += 1

            max_time = max(max_time, run["time_ms"])
            results.append(
                {
                    "test_case_id": tc.get("id"),
                    "status": tc_status,
                    "actual_output": actual,
                    "execution_time": run["time_ms"],
                    "is_hidden": tc.get("is_hidden", False),
                }
            )

        total = len(test_cases)
        score = round((passed / total) * 100, 2) if total else 0.0

        # Determine overall status
        statuses = {r["status"] for r in results}
        if passed == total:
            overall = "Accepted"
        elif "Time Limit Exceeded" in statuses:
            overall = "Time Limit Exceeded"
        elif "Runtime Error" in statuses:
            overall = "Runtime Error"
        else:
            overall = "Wrong Answer"

        return {
            "status": overall,
            "error": "",
            "results": results,
            "passed": passed,
            "total": total,
            "score": score,
            "execution_time": max_time,
        }


# ──────────────────────── Memory-safety check (ASan / UBSan) ────────────────

_SANITIZE_FLAGS = ["-fsanitize=address,undefined", "-fno-omit-frame-pointer", "-g", "-O1"]

# Map raw sanitizer error kinds to beginner-friendly explanations.
_ASAN_KIND_HELP = {
    "heap-buffer-overflow": "You read/wrote past the end of a heap array (malloc'd memory). Check your indices and sizes.",
    "stack-buffer-overflow": "You read/wrote past the end of a local array. An index is out of bounds.",
    "global-buffer-overflow": "You read/wrote past the end of a global/static array. Check the index range.",
    "heap-use-after-free": "You used memory after free()-ing it. Don't access a pointer once it's freed.",
    "stack-use-after-return": "You used a pointer to a local variable after its function returned.",
    "double-free": "You called free() twice on the same pointer.",
    "attempting-free-on-address": "You free()'d a pointer that wasn't returned by malloc/calloc.",
}


def _parse_sanitizer(text: str) -> List[Dict]:
    """Turn ASan/UBSan stderr into a small list of findings (with line numbers when known)."""
    findings = []
    if not text:
        return findings

    # UndefinedBehaviorSanitizer: "<file>:LINE:COL: runtime error: <msg>"
    for m in re.finditer(r":(\d+):\d+:\s*runtime error:\s*([^\n]+)", text):
        findings.append({"type": "undefined-behavior", "line": int(m.group(1)),
                         "title": m.group(2).strip(), "help": "Undefined behavior — e.g. overflow, bad shift, or out-of-range value."})

    # AddressSanitizer: "ERROR: AddressSanitizer: <kind> on address ..."
    for m in re.finditer(r"ERROR:\s*AddressSanitizer:\s*([a-z0-9\-]+)", text):
        kind = m.group(1)
        findings.append({"type": "address", "line": None,
                         "title": kind.replace("-", " "),
                         "help": _ASAN_KIND_HELP.get(kind, "Invalid memory access.")})

    # LeakSanitizer
    if "detected memory leaks" in text or "LeakSanitizer" in text:
        lm = re.search(r"SUMMARY:\s*AddressSanitizer:\s*[\d,]+\s*byte\(s\)\s*leaked", text) \
            or re.search(r"(\d[\d,]*)\s*byte\(s\)\s*leaked", text)
        bytes_txt = ""
        bm = re.search(r"(\d[\d,]*)\s*byte\(s\)\s*leaked", text)
        if bm:
            bytes_txt = f" (~{bm.group(1)} bytes)"
        findings.append({"type": "leak", "line": None,
                         "title": f"memory leak{bytes_txt}",
                         "help": "You allocated memory with malloc/calloc but never free()'d it."})

    # de-dupe by (type, line, title)
    seen, out = set(), []
    for f in findings:
        key = (f["type"], f["line"], f["title"])
        if key not in seen:
            seen.add(key); out.append(f)
    return out


def memcheck(code: str, input_data: str = "", time_limit: float = 8.0) -> Dict:
    """
    Compile with AddressSanitizer + UndefinedBehaviorSanitizer and run once.
    Detects leaks, buffer overflows, use-after-free, out-of-bounds, bad shifts, etc.
    Returns {status, clean, output, report, findings}.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        src_file = os.path.join(tmpdir, "solution.c")
        exe = _exe_name(tmpdir)
        with open(src_file, "w", encoding="utf-8") as f:
            f.write(code)

        cmd = ["gcc", "-o", exe, src_file, *_SANITIZE_FLAGS, "-lm"]
        try:
            comp = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
        except FileNotFoundError:
            return {"status": "Error", "clean": False, "output": "", "findings": [],
                    "report": "gcc not found on the server."}
        if comp.returncode != 0:
            # Could be a real compile error, or this toolchain lacks the sanitizer libs
            # (common on Windows/mingw — works on the Linux Render image).
            err_l = (comp.stderr or "").lower()
            unsupported = any(t in err_l for t in ("asan", "sanitiz", "-lasan", "__ubsan", "libasan"))
            return {"status": "Compilation Error", "clean": False, "output": "", "findings": [],
                    "report": comp.stderr,
                    "note": "Memory check needs a server with AddressSanitizer (your Render Linux deploy has it; local mingw may not)." if unsupported else None}

        env = dict(os.environ)
        env["ASAN_OPTIONS"] = "detect_leaks=1:abort_on_error=0:exitcode=1:print_summary=1:log_to_stderr=1"
        env["UBSAN_OPTIONS"] = "print_stacktrace=0:halt_on_error=0"
        try:
            proc = subprocess.run([exe], input=input_data or "", capture_output=True, text=True,
                                  timeout=time_limit, preexec_fn=_memcheck_preexec(), env=env)
        except subprocess.TimeoutExpired:
            return {"status": "Time Limit Exceeded", "clean": False, "output": "", "findings": [], "report": ""}

        report = proc.stderr or ""
        findings = _parse_sanitizer(report)
        clean = not findings
        return {
            "status": "ok",
            "clean": clean,
            "output": _normalize(proc.stdout)[:_MAX_OUTPUT],
            "report": report[:8000],
            "findings": findings,
        }
