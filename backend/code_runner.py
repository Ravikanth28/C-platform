"""
C Code Runner – compiles and executes C code in a temporary sandbox.
Works on both Windows (gcc must be in PATH) and Linux.
"""
import os
import subprocess
import tempfile
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
    return exe, ""


def run_once(exe: str, input_data: str, time_limit: float = 5.0) -> Dict:
    """Run compiled binary with given input. Returns dict with output/status."""
    start = time.monotonic()
    try:
        proc = subprocess.run(
            [exe],
            input=input_data,
            capture_output=True,
            text=True,
            timeout=time_limit,
            preexec_fn=_limit_preexec(),
        )
        elapsed = (time.monotonic() - start) * 1000  # ms
        if proc.returncode != 0:
            logger.error(f"Runtime execution error for {exe} (returncode {proc.returncode}):\n{proc.stderr}")
            return {
                "status": "Runtime Error",
                "output": proc.stderr[:500],
                "time_ms": elapsed,
            }
        return {
            "status": "ok",
            "output": _normalize(proc.stdout)[:_MAX_OUTPUT],
            "time_ms": elapsed,
        }
    except subprocess.TimeoutExpired as e:
        logger.error(f"Execution timeout for {exe} after {time_limit}s")
        return {
            "status": "Time Limit Exceeded",
            "output": "",
            "time_ms": time_limit * 1000,
        }


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
