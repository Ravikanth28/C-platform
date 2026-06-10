"""
Interactive program runner.

Best experience = a real pseudo-terminal (PTY):
  • POSIX (Linux/Render) -> stdlib `pty`
  • Windows              -> ConPTY via `pywinpty`  (pip install pywinpty)

If pywinpty can't be imported on Windows we DON'T hard-fail anymore — we fall
back to a plain pipe so the console still works. The only difference is that,
without a terminal, a C program's stdout is block-buffered, so output may
appear only when the program flushes or exits (prompts before `scanf` won't
show live). Install pywinpty to get true line-by-line behaviour.
"""
import os
import subprocess

IS_WIN = os.name == "nt"


class _PosixPty:
    def __init__(self, exe):
        import pty
        from code_runner import _limit_preexec

        limit = _limit_preexec()

        def _pre():
            os.setsid()
            if limit:
                limit()

        self.master, slave = pty.openpty()
        self.proc = subprocess.Popen(
            [exe], stdin=slave, stdout=slave, stderr=slave,
            preexec_fn=_pre, close_fds=True,
        )
        os.close(slave)

    def read(self):
        try:
            data = os.read(self.master, 4096)
        except OSError:
            return ""
        return data.decode("utf-8", "replace")

    def write(self, text):
        try:
            os.write(self.master, text.encode("utf-8"))
        except OSError:
            pass

    def wait_returncode(self):
        try:
            return self.proc.wait(timeout=5)
        except Exception:
            return self.proc.poll()

    def close(self):
        try:
            import signal
            os.killpg(os.getpgid(self.proc.pid), signal.SIGKILL)
        except Exception:
            try:
                self.proc.kill()
            except Exception:
                pass
        try:
            os.close(self.master)
        except Exception:
            pass


class _WinPty:
    def __init__(self, exe):
        from winpty import PtyProcess  # type: ignore

        self.p = PtyProcess.spawn([exe])

    def read(self):
        try:
            return self.p.read()
        except EOFError:
            return ""

    def write(self, text):
        try:
            self.p.write(text)
        except Exception:
            pass

    def wait_returncode(self):
        try:
            return self.p.exitstatus
        except Exception:
            return None

    def close(self):
        try:
            if self.p.isalive():
                self.p.terminate(force=True)
        except Exception:
            pass


class _PipeFallback:
    """
    No-PTY fallback (Windows without a working pywinpty).

    The program is compiled with stdout/stderr UNBUFFERED, so even over a plain
    pipe each printf streams immediately — giving live, line-by-line behaviour.
    There's no terminal echo here, so the frontend echoes typed input itself
    (it switches on the 'pipe' mode reported in the 'started' message).
    """

    def __init__(self, exe):
        self.proc = subprocess.Popen(
            [exe], stdin=subprocess.PIPE,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, bufsize=0,
        )
        self._fd = self.proc.stdout.fileno()

    def read(self):
        try:
            data = os.read(self._fd, 4096)  # returns as soon as ≥1 byte is available
        except OSError:
            return ""
        if not data:
            return ""
        return data.decode("utf-8", "replace")

    def write(self, text):
        try:
            self.proc.stdin.write(text.encode("utf-8"))
            self.proc.stdin.flush()
        except Exception:
            pass

    def wait_returncode(self):
        try:
            return self.proc.wait(timeout=5)
        except Exception:
            return self.proc.poll()

    def close(self):
        try:
            self.proc.kill()
        except Exception:
            pass


def _winpty_import_error() -> str:
    """Return why `import winpty` fails in THIS interpreter, or '' if it works."""
    try:
        import winpty  # noqa: F401
        return ""
    except Exception as e:  # ImportError, DLL load error, etc.
        return f"{type(e).__name__}: {e}"


def make_session(exe):
    """
    Returns (session, mode, note).
      mode: 'pty'  -> true CodeBlocks-style line-by-line
            'pipe' -> degraded fallback (still usable)
      note: a message to surface in the console (only set for 'pipe').
    """
    if IS_WIN:
        if _winpty_import_error():
            # pywinpty unavailable/broken — the pipe fallback still streams live
            # because the program is compiled unbuffered. No scary banner needed.
            return _PipeFallback(exe), "pipe", ""
        return _WinPty(exe), "pty", ""
    return _PosixPty(exe), "pty", ""
