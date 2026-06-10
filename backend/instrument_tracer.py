"""
gdb-free execution tracer for C, via source instrumentation.

We rewrite the student's source so that, at the start of each statement, it
prints (to stderr) the current line, the call stack, and every in-scope
variable. Then we compile with gcc (already present everywhere) and run it;
program stdout stays clean (the trace goes to stderr). The emitted trace is
parsed back into the same shape gdb produces: steps = [{line, func, locals, stack}].

Scope: built for the common teaching subset (scalars, 1-D numeric/char arrays,
plain functions, one statement per line). If instrumentation can't compile, the
caller falls back to a normal run (output only).
"""
import os
import re
import subprocess

RS, US, GS, FS = "\x1e", "\x1f", "\x1d", "\x1c"
MAX_STEPS = 600

_PRELUDE = (
    "#include <stdio.h>\n"
    "static int __cf_steps=0; static const char* __cf_stack[64]; static int __cf_stackn=0;\n"
)

# leading keywords we must NOT prepend a trace before (would break syntax/semantics)
_SKIP_LEAD = {"else", "case", "default", "while", "do", "{", "}", "#"}
_CONTROL = {"if", "for", "switch", "return", "else", "while", "do", "case", "default", "goto", "break", "continue"}

_TYPE_WORDS = {"int", "char", "short", "long", "float", "double", "unsigned", "signed", "size_t", "void", "const"}

def _fmt_for(type_str):
    t = type_str.replace("const", "").strip()
    if "double" in t or "float" in t:
        return "%g"
    if "unsigned" in t:
        return "%lu" if "long" in t else "%u"
    if "long long" in t:
        return "%lld"
    if "long" in t:
        return "%ld"
    if "size_t" in t:
        return "%zu"
    return "%d"  # int / short / char(value)

def _strip_for_analysis(line, in_block):
    """Remove string/char literals & comments so brace/paren/keyword scans are safe."""
    out = []
    i, n = 0, len(line)
    while i < n:
        c = line[i]
        if in_block:
            if c == "*" and i + 1 < n and line[i + 1] == "/":
                in_block = False; i += 2; continue
            i += 1; continue
        if c == "/" and i + 1 < n and line[i + 1] == "/":
            break
        if c == "/" and i + 1 < n and line[i + 1] == "*":
            in_block = True; i += 2; continue
        if c == '"':
            i += 1
            while i < n and line[i] != '"':
                if line[i] == "\\": i += 1
                i += 1
            out.append('""'); i += 1; continue
        if c == "'":
            i += 1
            while i < n and line[i] != "'":
                if line[i] == "\\": i += 1
                i += 1
            out.append("'x'"); i += 1; continue
        out.append(c); i += 1
    return "".join(out), in_block

def _parse_decls(stmt):
    """If stmt is a variable declaration, return list of (name, fmt, is_array, size_expr)."""
    s = stmt.strip().rstrip(";").strip()
    m = re.match(r"^((?:const\s+)?(?:unsigned\s+|signed\s+)?(?:long\s+long|long|short|int|char|float|double|size_t)(?:\s+int)?)\s+(.+)$", s)
    if not m:
        return []
    base = m.group(1).strip()
    rest = m.group(2).strip()
    if "(" in rest:  # function decl/call, not a variable
        return []
    decls = []
    depth = 0; buf = ""
    parts = []
    for ch in rest:
        if ch in "([{": depth += 1
        elif ch in ")]}": depth -= 1
        if ch == "," and depth == 0:
            parts.append(buf); buf = ""
        else:
            buf += ch
    if buf.strip():
        parts.append(buf)
    is_char = base.replace("const", "").strip().startswith("char") or " char" in base
    for p in parts:
        p = p.split("=")[0].strip()
        ptr = p.startswith("*")
        am = re.match(r"^\*?\s*([A-Za-z_]\w*)\s*\[([^\]]*)\]", p)
        if am:
            name = am.group(1); size = am.group(2).strip()
            if is_char:
                decls.append((name, "%s", "str", None))
            elif ptr:
                continue
            else:
                decls.append((name, _fmt_for(base), "arr", size or None))
            continue
        nm = re.match(r"^\*?\s*([A-Za-z_]\w*)\s*$", p)
        if nm:
            if ptr:
                continue  # skip pointers
            decls.append((nm.group(1), _fmt_for(base), "scalar", None))
    return decls

def _trace_stmt(line_no, in_scope):
    """C code (single line) that emits one trace record for the given vars."""
    parts = [f'if(__cf_steps<{MAX_STEPS}){{__cf_steps++;',
             f'fprintf(stderr,"{RS}%d{US}",{line_no});',
             'for(int __i=0;__i<__cf_stackn;__i++)fprintf(stderr,"%s,",__cf_stack[__i]);',
             f'fprintf(stderr,"{US}");']
    for name, fmt, kind, size in in_scope:
        if kind == "scalar":
            parts.append(f'fprintf(stderr,"{name}{FS}{fmt}{GS}",{name});')
        elif kind == "str":
            parts.append(f'fprintf(stderr,"{name}{FS}\\"%s\\"{GS}",{name});')
        elif kind == "arr" and size:
            parts.append(f'fprintf(stderr,"{name}{FS}{{");for(int __k=0;__k<({size});__k++)fprintf(stderr,"{fmt},",{name}[__k]);fprintf(stderr,"}}{GS}");')
    parts.append("}")
    return "".join(parts)

def instrument(code):
    lines = code.split("\n")
    out_lines = []
    in_block_comment = False
    brace_depth = 0
    paren_carry = 0
    last_sig = ""
    scope_stack = [[]]          # list of scopes; each is list of (name,fmt,kind,size)
    block_kind = []             # 'func' | 'block' (parallel to braces that pushed scope)
    pending_func_sig = ""       # accumulates top-level tokens for func signature

    def in_scope_vars():
        seen = {}
        for sc in scope_stack:
            for v in sc:
                seen[v[0]] = v
        return list(seen.values())

    for idx, raw in enumerate(lines):
        line_no = idx + 1
        analysis, in_block_comment = _strip_for_analysis(raw, in_block_comment)
        stripped = analysis.strip()
        lead = (re.match(r"^([A-Za-z_]\w*)", stripped) or [None, ""])[1] if stripped else ""

        is_label = bool(re.match(r"^[A-Za-z_]\w*\s*:(?!:)", stripped))
        at_stmt_start = (paren_carry == 0 and last_sig in (";", "{", "}", ""))
        inject = (
            at_stmt_start and brace_depth >= 1 and stripped
            and stripped[0] not in "{}#" and lead not in _SKIP_LEAD
            and not is_label
        )

        prefix = ""
        if inject:
            scope_now = in_scope_vars()
            t = _trace_stmt(line_no, scope_now)
            if lead == "return":
                t += "__cf_stackn--;"
            prefix = t

        # record declarations AFTER building this line's trace (var not yet in scope on its own line)
        if at_stmt_start and lead in _TYPE_WORDS:
            for d in _parse_decls(stripped):
                scope_stack[-1].append(d)

        # scan this line's significant chars to update depth / scopes / func push-pop
        line_out = prefix + raw
        # we must insert push after a function-opening '{' and pop before a func-closing '}'.
        # Do it on the analysis positions mapped to raw — but to stay simple we append/prepend per line.
        rebuilt = []
        # detect signature accumulation at top level
        if brace_depth == 0 and stripped and not stripped.startswith("#"):
            pending_func_sig += " " + stripped

        j = 0
        raw_chars = list(raw)
        # We can't perfectly map analysis->raw indices after literal collapse, so re-scan raw
        # using a lightweight literal tracker for brace/paren only.
        in_s = in_c = lcom = False
        bcom = in_block_comment_before = False
        # NOTE: use a fresh local tracker over raw (block-comment state already advanced via analysis)
        k = 0
        nraw = len(raw_chars)
        insert_after = {}   # index in raw -> text to insert AFTER this char
        insert_before = {}  # index -> text before
        # re-run literal-aware scan on raw to find brace/paren and func markers
        ls = last_sig
        bd = brace_depth
        pc = paren_carry
        sig = pending_func_sig
        bc = in_block_comment  # current state already updated by analysis; approximate
        # Simpler: scan the *analysis* string (no literals) but track index into it; insertions go into raw via mapping by counting.
        # To keep robust, we instead append push/pop at line granularity using detected single-brace lines.
        out_lines.append(line_out)

        # line-granularity func push/pop + depth update using analysis
        # update depth and handle braces
        i2 = 0
        a = analysis
        while i2 < len(a):
            ch = a[i2]
            if ch == "(":
                pc += 1
            elif ch == ")":
                pc = max(0, pc - 1)
            elif ch == "{":
                is_init = ls in ("=", ",", "(")
                if is_init:
                    block_kind_push = "init"
                else:
                    if bd == 0 and ls == ")":
                        block_kind_push = "func"
                    else:
                        block_kind_push = "block"
                bd += 1
                if block_kind_push != "init":
                    scope_stack.append([])
                    block_kind.append(block_kind_push)
                    if block_kind_push == "func":
                        # parse name + params from accumulated signature
                        msig = re.search(r"([A-Za-z_]\w*)\s*\(([^)]*)\)\s*$", sig.strip())
                        params = []
                        if msig:
                            for prm in msig.group(2).split(","):
                                params += _parse_decls(prm.strip() + ";")
                        for prm in params:
                            scope_stack[-1].append(prm)
                        # inject push right after this line (append to the just-added out line)
                        out_lines[-1] += '__cf_stack[__cf_stackn<64?__cf_stackn:63]=__func__;__cf_stackn++;'
                    sig = ""
                else:
                    sig = ""
            elif ch == "}":
                if bd > 0:
                    bd -= 1
                if block_kind:
                    kind = block_kind.pop()
                    if scope_stack:
                        scope_stack.pop()
                    if kind == "func":
                        # prepend a pop before the closing brace on this line
                        # (best effort: put pop at end of previous content)
                        out_lines[-1] = out_lines[-1].replace("}", "__cf_stackn--;}", 1) if "__cf_stackn--;}" not in out_lines[-1] else out_lines[-1]
            ch_strip = ch
            if not ch.isspace():
                ls = ch
            i2 += 1

        brace_depth = bd
        paren_carry = pc
        last_sig = ls
        pending_func_sig = sig if brace_depth == 0 else ""

    return _PRELUDE + "#line 1\n" + "\n".join(out_lines)

def _parse_trace(stderr_text):
    steps = []
    chunks = stderr_text.split(RS)
    for ch in chunks[1:]:
        try:
            line_part, stack_part, vars_part = (ch.split(US) + ["", ""])[:3]
            line = int(re.match(r"^\d+", line_part).group())
        except Exception:
            continue
        stack_names = [s for s in stack_part.split(",") if s]
        locals_ = {}
        for ent in vars_part.split(GS):
            if FS in ent:
                nm, val = ent.split(FS, 1)
                if nm.strip():
                    locals_[nm.strip()] = val
        stack = [{"func": f, "line": 0} for f in stack_names] or [{"func": "main", "line": 0}]
        stack[-1]["line"] = line
        steps.append({"line": line, "func": stack_names[-1] if stack_names else "main", "locals": locals_, "stack": stack})
    return steps

def trace(code, stdin, tmpdir):
    """Returns dict like the gdb tracer: {status, steps, output, error}."""
    try:
        inst = instrument(code)
    except Exception as e:  # noqa: BLE001
        inst = None
        err = f"instrument error: {e}"

    exe = os.path.join(tmpdir, "viz_inst.exe" if os.name == "nt" else "viz_inst")
    src = os.path.join(tmpdir, "viz_inst.c")
    compiled = False
    if inst is not None:
        with open(src, "w", encoding="utf-8") as f:
            f.write(inst)
        c = subprocess.run(["gcc", "-O0", "-o", exe, src, "-lm"], capture_output=True, text=True, timeout=15)
        compiled = c.returncode == 0

    if not compiled:
        # safety net: compile + run the ORIGINAL so we at least show output
        with open(src, "w", encoding="utf-8") as f:
            f.write(code)
        c2 = subprocess.run(["gcc", "-O0", "-o", exe, src, "-lm"], capture_output=True, text=True, timeout=15)
        if c2.returncode != 0:
            return {"status": "Compilation Error", "error": c2.stderr, "steps": [], "output": ""}
        run = subprocess.run([exe], input=stdin or "", capture_output=True, text=True, timeout=8)
        return {"status": "ok", "steps": [], "output": (run.stdout or "")[:65536],
                "note": "Step trace unavailable for this program (running without gdb) — showing output only."}

    try:
        run = subprocess.run([exe], input=stdin or "", capture_output=True, text=True, timeout=8)
    except subprocess.TimeoutExpired:
        return {"status": "Timeout", "error": "Program ran too long.", "steps": [], "output": ""}

    steps = _parse_trace(run.stderr or "")
    return {"status": "ok", "steps": steps[:MAX_STEPS], "output": (run.stdout or "")[:65536]}
