"""
Detailed interactive-lesson curriculum.

Every lesson follows the SAME structure:
  2+ concept steps (200+ words each) → a runnable example → 2-3 quick checks
  → a references block (appended automatically).
"""
import json

from sqlalchemy import text

import models

# Bump whenever the curriculum content changes so it re-seeds on next start.
_CURRICULUM_VERSION = 4

_LESSONS = [
    # ───────────────────────── 1. What is C ────────────────────────────────
    {
        "title": "What is C?",
        "topic": "basics", "order_index": 1,
        "blocks": [
            {"type": "concept", "body": "## What is C?\n\n**C** is a general-purpose programming language created by **Dennis Ritchie** at Bell Labs in **1972**, originally to write the Unix operating system. More than fifty years later it is still one of the most important languages in the world — and learning it well is one of the best things you can do as a programmer.\n\nWhy is C still everywhere?\n\n- **Operating systems** — the Linux, Windows and macOS kernels are largely written in C.\n- **Embedded systems** — microwaves, cars, routers, medical devices and microcontrollers run C because it is small and fast.\n- **Performance-critical software** — databases (MySQL, Redis), compilers, browsers and game engines rely on C/C++.\n- **A foundation language** — C++, Java, C#, Go and even Python's interpreter borrow C's syntax and ideas. Once you know C, picking up other languages is far easier.\n\nThe real reason C makes you a stronger programmer is that it is **close to the hardware**. It doesn't hide memory or pointers from you the way Python or Java do. You see exactly how data is stored, how much space it takes, and what happens when a program runs. That understanding stays with you for your whole career, no matter what language you use later."},
            {"type": "concept", "body": "## Compiled, not interpreted\n\nC is a **compiled** language, and understanding what that means is key.\n\nWhen you write C, you create **source code** — ordinary human-readable text in a `.c` file. The CPU cannot run that text directly. A program called a **compiler** (you'll use **`gcc`**) translates your source code into **machine code**: the raw binary instructions your processor executes. The result is a standalone **executable** file.\n\nThis is different from an **interpreted** language like Python, where an interpreter reads and runs your code line-by-line every time. Because C is compiled ahead of time into native machine code, C programs are typically **much faster** and use less memory — which is exactly why it's chosen for systems and performance work.\n\nThere are a few ground rules you'll rely on from day one:\n\n- C is **case-sensitive**: `Age`, `age` and `AGE` are three different names.\n- Almost every statement ends with a **semicolon** `;`.\n- All executable code lives inside **functions**, and every program begins running at a special function called `main`.\n- Whitespace and indentation don't change meaning, but good indentation makes code readable.\n\nKeep these in mind and the rest of the language will feel far less mysterious."},
            {"type": "example", "title": "Your very first C program — Run it", "stdin": "",
             "code": "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, C! I am learning to code.\\n\");\n    return 0;\n}\n"},
            {"type": "check", "mode": "mcq",
             "question": "What kind of language is C?",
             "options": ["Interpreted line-by-line at runtime", "Compiled to machine code before running", "Only used for building websites", "A type of spreadsheet program"],
             "answer": "Compiled to machine code before running",
             "explanation": "A compiler (gcc) translates your C source into machine code the CPU runs directly — which is why C is fast and close to the hardware."},
            {"type": "check", "mode": "mcq",
             "question": "Where does a C program start running?",
             "options": ["At the first line of the file", "At the function called main", "Wherever printf is", "At the #include line"],
             "answer": "At the function called main",
             "explanation": "Execution always begins at main(). Other functions only run when something calls them."},
            {"type": "check", "mode": "mcq",
             "question": "Are `total` and `Total` the same variable name in C?",
             "options": ["Yes, C ignores capitalization", "No — C is case-sensitive, so they're different"],
             "answer": "No — C is case-sensitive, so they're different",
             "explanation": "C treats uppercase and lowercase letters as distinct, so `total` and `Total` are two separate names."},
        ],
    },
    # ───────────────────────── 2. How a program works ──────────────────────
    {
        "title": "How a C Program Works",
        "topic": "basics", "order_index": 2,
        "blocks": [
            {"type": "concept", "body": "## The anatomy of a C program\n\nEvery C program shares the same skeleton. Read this one carefully:\n\n```c\n#include <stdio.h>   // 1. bring in printf / scanf\n\nint main() {          // 2. execution starts here\n    printf(\"Hello!\\n\"); // 3. a statement (ends with ;)\n    return 0;         // 4. tell the OS we finished OK\n}\n```\n\nLet's break down each piece:\n\n- **`#include <stdio.h>`** is a *preprocessor directive*. It pastes in the **Standard Input/Output** header so the compiler knows what `printf` and `scanf` are. Without it, the compiler doesn't recognise those functions.\n- **`int main()`** is the **entry point** — the function the operating system calls to start your program. The `int` means it returns an integer.\n- **`{ ... }`** marks the **body** of the function. Everything between the braces is the work `main` does.\n- **`printf(\"Hello!\\n\");`** is a **statement**: a single instruction ending in a semicolon. `\\n` prints a newline.\n- **`return 0;`** ends `main` and reports an **exit status** to the OS. `0` means success; any non-zero value signals an error.\n\nComments — `// like this` or `/* like this */` — are notes for humans; the compiler ignores them. Use them to explain *why* your code does something."},
            {"type": "concept", "body": "## From source code to a running program\n\nWhen you press **Run** (or type `gcc hello.c -o hello`), your code goes through four stages before it ever executes — the **build pipeline**:\n\n1. **Preprocessing** — the preprocessor handles every line starting with `#`. It pastes in the contents of `#include` headers and substitutes any `#define` macros, producing one big expanded source file.\n2. **Compilation** — the compiler checks your syntax and translates the expanded C into **assembly language**, the human-readable form of CPU instructions for your machine.\n3. **Assembly** — the assembler converts that assembly into **object code**, a binary `.o` file of machine instructions that isn't runnable on its own yet.\n4. **Linking** — the linker combines your object code with the precompiled library code you used (like the real `printf` from the C standard library) into a single, complete **executable** file.\n\nOnly then does the operating system **load** the executable into memory and hand it to the **CPU**, which runs your instructions one after another.\n\nA practical tip for later: always compile with **`-Wall`** (\"warn about everything\"). Warnings are free bug detectors that catch mistakes before they bite you — never ignore them. Use `-g` to add debug info and `-O2` to optimise for speed."},
            {"type": "example", "title": "Compile & run — try editing the message", "stdin": "",
             "code": "#include <stdio.h>\n\nint main() {\n    printf(\"Line one\\n\");\n    printf(\"Line two\\n\");\n    return 0;\n}\n"},
            {"type": "check", "mode": "mcq",
             "question": "What does `#include <stdio.h>` actually do?",
             "options": ["Runs the program", "Declares library functions like printf/scanf so you can use them", "Prints text to the screen", "Ends the program"],
             "answer": "Declares library functions like printf/scanf so you can use them",
             "explanation": "Headers tell the compiler what library functions look like. Without stdio.h, the compiler doesn't know printf."},
            {"type": "check", "mode": "mcq",
             "question": "Which build step combines your object code with library code (like printf) into one executable?",
             "options": ["Preprocessing", "Compilation", "Linking", "Loading"],
             "answer": "Linking",
             "explanation": "The linker stitches your compiled object code together with the libraries you used to produce the final executable."},
            {"type": "check", "mode": "output",
             "question": "What does the example program above print? (write both lines)",
             "answer": "Line one\nLine two",
             "explanation": "Each printf runs in order, and each \\n moves to a new line — so you get 'Line one' then 'Line two'."},
        ],
    },
    # ───────────────────────── 3. Binary & memory ──────────────────────────
    {
        "title": "Bits, Bytes & Binary",
        "topic": "basics", "order_index": 3,
        "blocks": [
            {"type": "concept", "body": "## Everything is 0s and 1s\n\nAt the lowest level, a computer only understands **binary** — two states, `0` and `1`, represented physically by electrical signals being off or on. A single 0-or-1 is called a **bit**. Bits are tiny, so we group **8 bits** together to make **1 byte**, the basic unit of storage.\n\nBinary is simply **base-2** counting. In our everyday **base-10** system each digit is worth ten times the one to its right (1, 10, 100…). In base-2 each position is worth **twice** the one to its right (1, 2, 4, 8, 16…). To read a binary number, add up the position-values where a bit is `1`. For example `1011`:\n\n| bit | 1 | 0 | 1 | 1 |\n|-----|---|---|---|---|\n| value | 8 | 4 | 2 | 1 |\n\n`8 + 0 + 2 + 1 = 11`, so binary `1011` equals decimal `11`.\n\nWith 8 bits (one byte) you can represent `2^8 = 256` different patterns, i.e. the values 0 to 255. Text works the same way: each character has a number (its **ASCII** code) stored in a byte — `'A'` is 65, `'a'` is 97. So letters, numbers, images and sound are *all* just bytes; their meaning comes from how the program interprets them."},
            {"type": "concept", "body": "## Memory: a giant row of numbered boxes\n\nThink of your computer's RAM as one enormous row of bytes, where **every byte has its own address** — like houses on a street, each with a unique number. When you create a **variable**, the program reserves one or more bytes at some address and gives them a name you can use.\n\nDifferent **types** reserve different amounts of space, which is why each type has a **limited range**:\n\n- `char` → **1 byte** — holds 0–255, or a single ASCII character.\n- `int` → usually **4 bytes** (32 bits) — about **−2,147,483,648 to +2,147,483,647**.\n- `double` → **8 bytes** — decimal numbers with about 15 digits of precision.\n\nBecause the size is fixed, the range is fixed too. If you try to store a value larger than the type allows, you get **overflow**: the value silently *wraps around* (for a 32-bit int, `INT_MAX + 1` becomes a large negative number). This causes real, hard-to-find bugs in loops, counters and sizes, so being aware of type ranges matters.\n\nAn `unsigned` type (e.g. `unsigned int`) refuses to store negatives, which doubles its positive range. Understanding that variables are just *named, fixed-size boxes of bytes at addresses* is the mental model that makes pointers click later."},
            {"type": "example", "title": "How big is each type? — Run it", "stdin": "",
             "code": "#include <stdio.h>\n\nint main() {\n    printf(\"char   = %d byte\\n\", (int)sizeof(char));\n    printf(\"int    = %d bytes\\n\", (int)sizeof(int));\n    printf(\"double = %d bytes\\n\", (int)sizeof(double));\n    return 0;\n}\n"},
            {"type": "check", "mode": "mcq",
             "question": "How many bits are in one byte?",
             "options": ["2", "4", "8", "16"], "answer": "8",
             "explanation": "1 byte = 8 bits, which can represent 256 different values (0–255)."},
            {"type": "check", "mode": "output",
             "question": "What decimal number is the binary value 1011?",
             "answer": "11",
             "explanation": "1011 = 8 + 0 + 2 + 1 = 11."},
            {"type": "check", "mode": "mcq",
             "question": "Why does an `int` have a limited range?",
             "options": ["The compiler is slow", "It uses a fixed number of bytes (usually 4), so only so many values fit", "C dislikes big numbers", "Because of the operating system"],
             "answer": "It uses a fixed number of bytes (usually 4), so only so many values fit",
             "explanation": "A 4-byte int has 32 bits → 2^32 possible patterns, so values beyond that range overflow and wrap around."},
        ],
    },
    # ───────────────────────── 4. Variables ────────────────────────────────
    {
        "title": "Variables",
        "topic": "basics", "order_index": 4,
        "blocks": [
            {"type": "concept", "body": "## Storing values in variables\n\nA **variable** is a named box in memory that holds a value your program can read and change. In C you must always **declare** a variable's *type* before you use it, so the compiler knows how much space to reserve and how to interpret the bytes.\n\n```c\nint age;          // declaration: reserve an int box named age\nage = 20;         // assignment: store 20 in it\nint score = 95;   // declare AND initialise in one line\n```\n\n**Declaration** creates the variable; **assignment** (using the `=` operator) puts a value into it; **initialisation** is assigning a value at the moment of declaration. You can reassign as often as you like — `score = score + 5;` reads the current value, adds 5, and stores the result back.\n\n**Naming rules** you must follow:\n\n- Use letters, digits and the underscore `_` — but a name **cannot start with a digit** (`2x` is invalid, `x2` is fine).\n- Names are **case-sensitive**: `total` and `Total` differ.\n- You **cannot** use reserved **keywords** like `int`, `return`, `for`, `while` as names.\n- Choose **meaningful** names — `studentCount` tells the reader far more than `c`.\n\nGood variable names are one of the cheapest ways to make code readable and bug-free."},
            {"type": "concept", "body": "## Initialise before you use — scope & constants\n\nA crucial beginner rule: **always give a variable a value before you read it.** If you declare `int n;` and never assign it, `n` contains whatever leftover bytes were already at that memory address — a **garbage value**. Using it produces unpredictable results that change from run to run:\n\n```c\nint n;             // uninitialised → garbage\nprintf(\"%d\", n);   // prints a random-looking number\n```\n\nEither initialise it (`int n = 0;`) or read into it (with `scanf`) before use. Many compilers warn about this if you compile with `-Wall`.\n\n**Scope** is *where* a variable exists:\n\n- A **local** variable is declared inside `{ }` (e.g. inside a function or loop) and only exists there; it disappears when the block ends.\n- A **global** variable is declared outside all functions and lives for the whole program — convenient but easy to misuse, so prefer locals.\n\nWhen a value should never change, make it a **constant** with `const`:\n\n```c\nconst int MAX_USERS = 100;\n```\n\nNow the compiler will reject any attempt to modify `MAX_USERS`, which documents your intent and prevents accidental bugs. Constants are perfect for fixed limits, sizes and configuration values."},
            {"type": "example", "title": "Declare, assign, reassign — Run it", "stdin": "",
             "code": "#include <stdio.h>\n\nint main() {\n    int score = 50;\n    printf(\"Start: %d\\n\", score);\n    score = score + 25;      // reassign using the old value\n    printf(\"After: %d\\n\", score);\n    return 0;\n}\n"},
            {"type": "check", "mode": "mcq",
             "question": "Which is a VALID variable name in C?",
             "options": ["2ndPlace", "my-score", "int", "user_age"],
             "answer": "user_age",
             "explanation": "`user_age` uses letters and an underscore. `2ndPlace` starts with a digit, `my-score` has a hyphen, and `int` is a keyword."},
            {"type": "check", "mode": "output",
             "question": "What does the example above print on the second line?",
             "answer": "After: 75",
             "explanation": "score starts at 50, then `score = score + 25` makes it 75."},
            {"type": "check", "mode": "mcq",
             "question": "What happens if you print an `int` you declared but never assigned?",
             "options": ["It is always 0", "It prints a garbage (unpredictable) value", "The program won't compile", "It prints nothing"],
             "answer": "It prints a garbage (unpredictable) value",
             "explanation": "Uninitialised variables hold leftover memory contents — always initialise before reading."},
        ],
    },
    # ───────────────────────── 5. Data types ───────────────────────────────
    {
        "title": "Data Types",
        "topic": "basics", "order_index": 5,
        "blocks": [
            {"type": "concept", "body": "## The core data types\n\nEvery value in C has a **type** that decides how much memory it uses and what operations make sense. The four types you'll use constantly are:\n\n| Type | Holds | Typical size | printf specifier |\n|------|-------|--------------|------------------|\n| `int` | whole numbers | 4 bytes | `%d` |\n| `float` | decimals (~6–7 digits) | 4 bytes | `%f` |\n| `double` | decimals (~15 digits) | 8 bytes | `%lf` |\n| `char` | one character | 1 byte | `%c` |\n\nThe **format specifier** is the placeholder you put in a `printf`/`scanf` string, and it **must match** the variable's type. Using the wrong one (e.g. `%d` for a `double`) produces garbage output or undefined behaviour.\n\nModifiers fine-tune these types. `unsigned int` stores only non-negative values but doubles the positive range. `long` and `long long` give larger integer ranges for big values. `short` uses less space. For most beginner programs, `int` for whole numbers and `double` for decimals are the right defaults — reach for the others only when you have a specific reason, like needing very large numbers or saving memory on an embedded device. Picking the right type up front matters: it decides the range of values you can store, how much memory each variable costs, and which format specifier you must use, so a moment's thought here prevents overflow and formatting bugs later on."},
            {"type": "concept", "body": "## Type conversion and the integer-division trap\n\nWhen you mix types in an expression, C **automatically converts** values to a common type — usually promoting smaller types to larger ones. Most of the time this is helpful, but it hides one of the most famous beginner bugs: **integer division**.\n\nWhen *both* operands of `/` are integers, C performs integer division and **throws away the fractional part**:\n\n```c\nint a = 7, b = 2;\nprintf(\"%d\", a / b);   // prints 3, NOT 3.5\n```\n\nThe `.5` is discarded because the result of `int / int` is an `int`. To keep the decimal, at least one operand must be a floating-point value. You force that with a **cast** — temporarily treating a value as another type using `(type)`:\n\n```c\nprintf(\"%.2f\", (float)a / b);   // 3.50\n```\n\nHere `(float)a` makes the division floating-point, so the result is `3.5`.\n\nTwo more conversion tips. First, assigning a `double` to an `int` (`int x = 3.9;`) truncates to `3` — it does not round. Second, comparing floating-point numbers with `==` is risky because of tiny rounding errors; compare with a small tolerance instead. Being deliberate about types saves you from a whole category of silent, confusing bugs."},
            {"type": "example", "title": "Integer vs floating-point division — Run it", "stdin": "",
             "code": "#include <stdio.h>\n\nint main() {\n    int a = 7, b = 2;\n    printf(\"int   : %d\\n\", a / b);\n    printf(\"float : %.2f\\n\", (float)a / b);\n    return 0;\n}\n"},
            {"type": "check", "mode": "output",
             "question": "What does `7 / 2` print with %d when both are int?",
             "answer": "3",
             "explanation": "Integer division discards the fraction: 7 / 2 = 3 (not 3.5)."},
            {"type": "check", "mode": "mcq",
             "question": "How do you make `a / b` produce a decimal result?",
             "options": ["Use a bigger int", "Cast one operand to float/double, e.g. (float)a / b", "Add 0.5 afterwards", "Use %f in printf only"],
             "answer": "Cast one operand to float/double, e.g. (float)a / b",
             "explanation": "Division is integer division only when BOTH sides are ints; casting one to float makes it floating-point."},
            {"type": "check", "mode": "mcq",
             "question": "Which specifier matches a `double`?",
             "options": ["%d", "%c", "%lf", "%s"],
             "answer": "%lf",
             "explanation": "%lf reads/prints a double; %d is int, %c is char, %s is a string."},
        ],
    },
    # ───────────────────────── 6. Input & Output ───────────────────────────
    {
        "title": "Input & Output",
        "topic": "basics", "order_index": 6,
        "blocks": [
            {"type": "concept", "body": "## Output with printf\n\n`printf` (\"print formatted\") writes text to the screen and is the function you'll use most. Its first argument is a **format string** in double quotes; everything else is the values to insert.\n\nInside the format string you can place:\n\n- **Format specifiers** — placeholders filled, in order, by the arguments that follow: `%d` (int), `%f` (float/double), `%c` (char), `%s` (string). You can control formatting too: `%.2f` shows two decimals, `%5d` pads an int to width 5.\n- **Escape sequences** — special characters written with a backslash: `\\n` is a newline, `\\t` is a tab, `\\\\` prints a single backslash, and `\\\"` prints a double quote.\n\n```c\nint x = 5;\ndouble pi = 3.14159;\nprintf(\"x = %d\\tpi = %.2f\\n\", x, pi);   // x = 5    pi = 3.14\n```\n\nThe arguments are matched to the specifiers **left to right**, so the number and types of specifiers should match the number and types of arguments. A mismatch (too few arguments, or `%d` paired with a `double`) leads to garbage output or crashes — one more reason to compile with `-Wall`, which catches many of these. As a habit, glance over each `%` placeholder and confirm it lines up with an argument of the matching type before you run; that one check prevents a surprising amount of garbled or wrong output, and it's the kind of discipline that separates careful C programmers from frustrated ones."},
            {"type": "concept", "body": "## Input with scanf — and the all-important &\n\n`scanf` (\"scan formatted\") reads typed input from the keyboard and stores it in your variables. It uses the same specifiers as `printf`, but with one critical difference: **you must pass the *address* of each variable using the `&` operator.**\n\n```c\nint n;\nscanf(\"%d\", &n);        // read an int into n — note the &\n```\n\nWhy the `&`? `scanf` needs to know *where in memory* to put the value it reads. `&n` means \"the address of `n`\", so `scanf` can write directly into that box. (This is your first taste of pointers — addresses are exactly what pointers store.) **Forgetting the `&` is the number-one beginner bug** and usually crashes the program.\n\nYou can read several values at once; whitespace in the format string matches any spaces or newlines the user types:\n\n```c\nint a, b;\nscanf(\"%d %d\", &a, &b);   // reads two integers\n```\n\nA couple of gotchas: read a `double` with `%lf` (not `%f`), and when mixing numbers with `%c`, put a space before it (`\" %c\"`) to skip leftover whitespace. To read a whole line *including spaces*, use `fgets` instead of `scanf(\"%s\")`, which stops at the first space."},
            {"type": "example", "title": "Read two numbers and add them — Run it", "stdin": "4 6",
             "code": "#include <stdio.h>\n\nint main() {\n    int a, b;\n    scanf(\"%d %d\", &a, &b);\n    printf(\"%d + %d = %d\\n\", a, b, a + b);\n    return 0;\n}\n"},
            {"type": "check", "mode": "mcq",
             "question": "Why does scanf need `&` before the variable?",
             "options": ["It's optional styling", "To pass the variable's address so scanf can store the value there", "To make scanf faster", "To print the value"],
             "answer": "To pass the variable's address so scanf can store the value there",
             "explanation": "scanf writes into your variable, so it needs the variable's memory address (&n). Omitting & usually crashes."},
            {"type": "check", "mode": "output",
             "question": "With input `4 6`, what does the example above print?",
             "answer": "4 + 6 = 10",
             "explanation": "scanf reads a=4 and b=6, then printf shows the sum."},
            {"type": "check", "mode": "mcq",
             "question": "What does `\\t` produce in a printf string?",
             "options": ["A backslash", "A new line", "A tab", "A quote"],
             "answer": "A tab",
             "explanation": "\\t is the tab escape sequence; \\n is newline."},
        ],
    },
    # ───────────────────────── 7. Operators ────────────────────────────────
    {
        "title": "Operators",
        "topic": "basics", "order_index": 7,
        "blocks": [
            {"type": "concept", "body": "## Arithmetic operators\n\nOperators are symbols that perform operations on values. The arithmetic ones are the most familiar: `+`, `-`, `*`, `/` and `%`.\n\nAddition, subtraction and multiplication behave as you'd expect. Two need special attention:\n\n- **Division `/`** — when both operands are integers this is *integer division* and discards the remainder (`7 / 2` is `3`). If either operand is a floating-point number, you get true division (`7.0 / 2` is `3.5`).\n- **Modulo `%`** — gives the **remainder** of integer division. `17 % 5` is `2` because 17 ÷ 5 is 3 remainder 2. Modulo only works on integers, and it's incredibly useful: `n % 2 == 0` tests whether `n` is **even**, `n % 10` extracts the last digit of a number, and modulo is the key to wrapping values around a range.\n\n```c\nprintf(\"%d\\n\", 17 / 5);   // 3\nprintf(\"%d\\n\", 17 % 5);   // 2\n```\n\n**Compound assignment** operators are shorthand for updating a variable using its own value: `x += 3` means `x = x + 3`, and likewise `-=`, `*=`, `/=`, `%=` exist. They keep code short and make your intent obvious. Mastering arithmetic — especially `/` and `%` — unlocks a surprising number of classic programming problems."},
            {"type": "concept", "body": "## Comparison, logic, increment — and a famous trap\n\n**Relational operators** compare two values and produce a truth value (`1` for true, `0` for false): `==` (equal), `!=` (not equal), `<`, `>`, `<=`, `>=`. You'll use these constantly inside `if` and loops.\n\n> ⚠️ **The classic bug:** `=` *assigns*, `==` *compares*. Writing `if (x = 5)` stores 5 in `x` (always true) instead of testing it. Always use `==` in conditions.\n\n**Logical operators** combine conditions: `&&` (AND — both must be true), `||` (OR — at least one true), and `!` (NOT — flips true/false). They are **short-circuit**: in `a && b`, if `a` is false, `b` isn't even evaluated — handy and occasionally important.\n\n**Increment and decrement** add or subtract 1: `i++` and `++i` both increase `i` by one, but the *value of the expression* differs. `i++` (post-increment) gives the **old** value first, then increments; `++i` (pre-increment) increments first, then gives the **new** value.\n\nFinally, **precedence** decides the order operations happen: `*` and `/` bind tighter than `+` and `-`, just like in maths. When in doubt, add **parentheses** — `(a + b) * c` — to make the order explicit and your code unmistakable. There are many operators with subtle precedence rules, and almost nobody memorises the full table; experienced programmers simply reach for parentheses whenever an expression mixes different operators, because clear, obviously-correct code is always worth more than saving a couple of keystrokes."},
            {"type": "example", "title": "Modulo & increment — Run it", "stdin": "",
             "code": "#include <stdio.h>\n\nint main() {\n    printf(\"17 %% 5 = %d\\n\", 17 % 5);\n    int i = 5;\n    printf(\"i++ gives %d\\n\", i++);   // uses 5, then i becomes 6\n    printf(\"now i = %d\\n\", i);       // 6\n    return 0;\n}\n"},
            {"type": "check", "mode": "output",
             "question": "What is `17 % 5`?",
             "answer": "2",
             "explanation": "17 ÷ 5 is 3 remainder 2, so 17 % 5 = 2."},
            {"type": "check", "mode": "output",
             "question": "Given `int i = 5;`, what value does the expression `i++` evaluate to?",
             "answer": "5",
             "explanation": "Post-increment yields the OLD value (5) first, then increments i to 6."},
            {"type": "check", "mode": "mcq",
             "question": "Which condition correctly checks if x equals 10?",
             "options": ["if (x = 10)", "if (x == 10)", "if (x =< 10)", "if (x := 10)"],
             "answer": "if (x == 10)",
             "explanation": "== compares; a single = assigns (a common bug that's always 'true')."},
        ],
    },
    # ───────────────────────── 8. Conditions ───────────────────────────────
    {
        "title": "Conditions: if / else / switch",
        "topic": "conditionals", "order_index": 8,
        "blocks": [
            {"type": "concept", "body": "## Making decisions with if / else\n\nPrograms become useful when they can choose different actions based on data. The `if` statement runs a block **only when a condition is true**:\n\n```c\nif (marks >= 90) {\n    printf(\"Grade A\\n\");\n} else if (marks >= 60) {\n    printf(\"Grade B\\n\");\n} else {\n    printf(\"Grade C\\n\");\n}\n```\n\nC evaluates the conditions **top to bottom** and runs the **first** block whose condition is true, then skips the rest. The `else if` chain (an *else-if ladder*) is how you handle several ranges or cases. The final `else` is optional and acts as a catch-all.\n\nA condition is any expression: C treats **zero as false and any non-zero value as true**. Conditions usually use relational operators (`>=`, `==`, `!=`, …) and can be combined with logical operators:\n\n```c\nif (age >= 13 && age <= 19) printf(\"teenager\\n\");\nif (day == 0 || day == 6)   printf(\"weekend\\n\");\n```\n\n**Best practice:** always wrap bodies in braces `{ }`, even one-liners. It prevents a whole class of bugs where someone later adds a second line that silently falls outside the `if`. And remember the `=` vs `==` trap — conditions compare with `==`. You can also **nest** an `if` inside another to handle layered decisions, but conditions that go three or four levels deep become hard to read and easy to get wrong; when that happens, combine tests with `&&`/`||`, return early, or switch to a cleaner structure so the logic stays obvious to whoever reads it next — including future you."},
            {"type": "concept", "body": "## switch, and the ternary operator\n\nWhen you're comparing **one variable against many fixed values**, a long else-if ladder gets clunky. The `switch` statement is cleaner and often faster:\n\n```c\nswitch (choice) {\n    case 1:\n        printf(\"One\\n\");\n        break;\n    case 2:\n        printf(\"Two\\n\");\n        break;\n    default:\n        printf(\"Other\\n\");\n}\n```\n\nEach `case` matches one constant value. The **`break;`** is essential: without it, execution *falls through* and keeps running the following cases too — a very common bug. `default` is the catch-all, like a final `else`. Note that `switch` only works with integer-like values (ints, chars, enums), not with ranges or strings.\n\nFor a simple either/or choice that produces a **value**, the **ternary operator** `?:` is a compact one-liner:\n\n```c\nint bigger = (a > b) ? a : b;   // if a>b then a, else b\n```\n\nRead it as \"condition ? value-if-true : value-if-false\". It's perfect for short assignments, but don't nest several ternaries — at that point an `if/else` is clearer. One more subtlety: a *dangling else* binds to the nearest `if`, so use braces to make nesting explicit and avoid surprises. As a rule of thumb, choose `switch` when you're matching one value against many constants, an `if/else` ladder when you're testing ranges or complex conditions, and the ternary only for a quick either/or value — picking the right tool keeps your decision logic readable and easy to extend."},
            {"type": "example", "title": "Grade with an else-if ladder — Run it", "stdin": "",
             "code": "#include <stdio.h>\n\nint main() {\n    int marks = 72;\n    if (marks >= 90)      printf(\"Grade A\\n\");\n    else if (marks >= 60) printf(\"Grade B\\n\");\n    else                  printf(\"Grade C\\n\");\n    return 0;\n}\n"},
            {"type": "check", "mode": "output",
             "question": "With marks = 72, what does the program print?",
             "answer": "Grade B",
             "explanation": "72 isn't ≥ 90 but it is ≥ 60, so the second branch runs."},
            {"type": "check", "mode": "mcq",
             "question": "What happens in a switch if you forget `break;`?",
             "options": ["Nothing changes", "It falls through and runs the following cases too", "The program won't compile", "It skips the case entirely"],
             "answer": "It falls through and runs the following cases too",
             "explanation": "Without break, execution continues into the next case(s) — usually a bug."},
            {"type": "check", "mode": "mcq",
             "question": "In C, which values count as 'true' in a condition?",
             "options": ["Only the value 1", "Any non-zero value", "Only positive numbers", "Only the word true"],
             "answer": "Any non-zero value",
             "explanation": "C treats 0 as false and any non-zero value (positive or negative) as true."},
        ],
    },
    # ───────────────────────── 9. Loops ────────────────────────────────────
    {
        "title": "Loops: for / while / do-while",
        "topic": "loops", "order_index": 9,
        "blocks": [
            {"type": "concept", "body": "## Repeating work with loops\n\nLoops let you run the same code many times without copying it. C has three.\n\nThe **`for`** loop is ideal when you know how many times to repeat. It packs three parts into one line:\n\n```c\nfor (int i = 1; i <= 5; i++) {\n    printf(\"%d \", i);\n}\n//   init      condition  update\n```\n\nThe order is precise: the **init** runs once at the start; the **condition** is checked *before* each pass (if false, the loop ends); the body runs; then the **update** runs; then it checks the condition again. This prints `1 2 3 4 5`.\n\nThe **`while`** loop repeats as long as a condition stays true, checking *before* each pass — so it may run zero times:\n\n```c\nwhile (lives > 0) {\n    play();\n}\n```\n\nThe **`do-while`** loop is like `while`, but the condition is checked at the **end**, so the body always runs **at least once** — perfect for input menus that must show before you can quit. Choose the loop that fits: `for` for counted repetition, `while` for condition-driven repetition, `do-while` when the body must run before the first check. All three are interchangeable in principle — any `for` can be rewritten as a `while` — but picking the one that matches your intent makes the code read naturally, so a reader instantly understands whether you're counting a fixed number of times or waiting for some condition to change."},
            {"type": "concept", "body": "## break, continue, nesting — and the pitfalls\n\nTwo keywords give you finer control inside loops. **`break`** exits the loop immediately, skipping the rest of it. **`continue`** skips the rest of the *current* iteration and jumps straight to the next one. Use them sparingly — they're great for stopping a search early, but overuse makes loops hard to follow.\n\n**Nested loops** are loops inside loops, essential for grids, tables and patterns. The inner loop runs fully for *each* pass of the outer loop:\n\n```c\nfor (int row = 1; row <= 3; row++) {\n    for (int col = 1; col <= 3; col++) {\n        printf(\"*\");\n    }\n    printf(\"\\n\");\n}\n```\n\nTwo classic bugs to watch for. The **off-by-one error**: `i <= n` includes `n`, while `i < n` stops one short — choosing the wrong one is the most common loop mistake, so think carefully about whether the last value should be included. The **infinite loop**: if the loop variable never changes (you forgot `i++`) or the condition can never become false, the loop runs forever and the program hangs. When debugging a stuck program, an infinite loop is the first thing to suspect. (Intentional infinite loops like `while (1)` are sometimes useful — for example a game or server main loop — but they always contain a `break` or `return` inside so there's a clear way out.) Trace your loop variable on paper for the first two or three iterations whenever a loop misbehaves; it's the fastest way to spot an off-by-one or a missing update."},
            {"type": "example", "title": "Sum 1..N — Run it (input is 5)", "stdin": "5",
             "code": "#include <stdio.h>\n\nint main() {\n    int n, sum = 0;\n    scanf(\"%d\", &n);\n    for (int i = 1; i <= n; i++) {\n        sum += i;\n    }\n    printf(\"Sum 1..%d = %d\\n\", n, sum);\n    return 0;\n}\n"},
            {"type": "check", "mode": "output",
             "question": "What does `for (int i = 1; i <= 5; i++) printf(\"%d \", i);` print?",
             "answer": "1 2 3 4 5",
             "explanation": "It starts at 1 and runs while i ≤ 5, printing each value with a trailing space."},
            {"type": "check", "mode": "output",
             "question": "With input 5, what does the Sum example print?",
             "answer": "Sum 1..5 = 15",
             "explanation": "1+2+3+4+5 = 15."},
            {"type": "check", "mode": "mcq",
             "question": "Which loop always runs its body at least once?",
             "options": ["for", "while", "do-while", "none of them"],
             "answer": "do-while",
             "explanation": "do-while checks its condition at the end, so the body runs once before the first check."},
        ],
    },
    # ───────────────────────── 10. Functions ───────────────────────────────
    {
        "title": "Functions",
        "topic": "functions", "order_index": 10,
        "blocks": [
            {"type": "concept", "body": "## Reusable blocks of code\n\nA **function** is a named block of code that does one job. Instead of repeating logic, you write it once and **call** it whenever needed. Every function has a **return type**, a **name**, and a list of **parameters** (inputs):\n\n```c\nint add(int a, int b) {   // returns an int; takes two ints\n    return a + b;         // hand a value back to the caller\n}\n\nint main() {\n    int total = add(3, 4);   // call it; total becomes 7\n    printf(\"%d\\n\", total);\n}\n```\n\nThe `return` statement sends a value back and ends the function. If a function returns nothing, its return type is **`void`** (and it has no `return value;`). Parameters are local variables that receive the **arguments** you pass in the call.\n\nWhy bother? Functions make programs **organised** (each does one clear thing), **reusable** (write once, call many times), **easier to test** (check one function in isolation), and **easier to read** (a well-named call like `area(width, height)` documents itself). As programs grow, splitting work into small, well-named functions is the single biggest factor in keeping code manageable. A good rule of thumb: if a block of code does something you can name, it probably deserves to be its own function."},
            {"type": "concept", "body": "## Pass-by-value, prototypes & recursion\n\nC passes arguments **by value**: the function receives a *copy* of each argument, so changing a parameter inside the function does **not** affect the caller's original variable. If you genuinely need a function to modify the caller's data, you pass a **pointer** to it (covered in the Pointers lesson) — which is exactly why `scanf` takes `&n`.\n\nIf you want to call a function before its definition appears in the file, declare a **prototype** first — the header line followed by a semicolon:\n\n```c\nint add(int, int);   // prototype: \"add exists, takes 2 ints, returns int\"\n```\n\nIn large projects, prototypes live in **`.h` header files** while the bodies live in `.c` files, letting code be split across many files.\n\n**Recursion** is a function that calls *itself* to solve a smaller version of a problem. Every recursive function needs a **base case** that stops the recursion, or it calls forever and overflows the **call stack** (crashing the program):\n\n```c\nint fact(int n) {\n    if (n <= 1) return 1;        // base case\n    return n * fact(n - 1);      // recursive step\n}\n```\n\nRecursion is elegant for problems like factorials, tree traversal and divide-and-conquer, though many recursive solutions can also be written as loops."},
            {"type": "example", "title": "A function + recursion — Run it", "stdin": "",
             "code": "#include <stdio.h>\n\nint add(int a, int b) {\n    return a + b;\n}\n\nint fact(int n) {\n    if (n <= 1) return 1;\n    return n * fact(n - 1);\n}\n\nint main() {\n    printf(\"add(3,4) = %d\\n\", add(3, 4));\n    printf(\"5! = %d\\n\", fact(5));\n    return 0;\n}\n"},
            {"type": "check", "mode": "output",
             "question": "What does `fact(5)` print (5!)?",
             "answer": "5! = 120",
             "explanation": "5! = 5×4×3×2×1 = 120, computed by multiplying n by fact(n-1) until the base case."},
            {"type": "check", "mode": "mcq",
             "question": "If a function changes its int parameter, does the caller's variable change?",
             "options": ["Yes, always", "No — C passes a copy (pass-by-value)", "Only for global variables", "Only inside main"],
             "answer": "No — C passes a copy (pass-by-value)",
             "explanation": "Functions get copies of arguments; to modify the original you must pass a pointer."},
            {"type": "check", "mode": "mcq",
             "question": "What MUST every recursive function have?",
             "options": ["A loop", "A base case that stops the recursion", "A global variable", "A void return type"],
             "answer": "A base case that stops the recursion",
             "explanation": "Without a base case the function calls itself forever and overflows the stack."},
        ],
    },
    # ───────────────────────── 11. Arrays ──────────────────────────────────
    {
        "title": "Arrays",
        "topic": "arrays", "order_index": 11,
        "blocks": [
            {"type": "concept", "body": "## Many values under one name\n\nAn **array** stores a fixed number of values of the **same type** in a single, contiguous block of memory, accessed by one name plus an **index**. Indices start at **0**:\n\n```c\nint a[5] = {10, 20, 30, 40, 50};\nprintf(\"%d\\n\", a[0]);   // 10  (the FIRST element)\nprintf(\"%d\\n\", a[4]);   // 50  (the LAST of 5)\n```\n\nFor an array of size `N`, the valid indices are `0` to `N - 1`. So `a[5]` above is **out of bounds** — there is no sixth element. This is one of the most important things to internalise about C: **the language does not check bounds for you.** Reading or writing past the end of an array is *undefined behaviour* — it might print garbage, corrupt other data, or crash, often far away from the actual mistake.\n\nYou almost always process arrays with a **loop**, using the loop variable as the index:\n\n```c\nint sum = 0;\nfor (int i = 0; i < 5; i++) {\n    sum += a[i];\n}\n```\n\nArrays are the foundation of strings, matrices and most data structures, so getting comfortable with 0-based indexing and bounds is essential. Note the array's size is fixed at creation — you can't grow it later (that needs dynamic memory)."},
            {"type": "concept", "body": "## 2-D arrays, and arrays with functions\n\nA **two-dimensional array** is an array of arrays — a grid with rows and columns, perfect for matrices, game boards and tables:\n\n```c\nint grid[2][3] = {\n    {1, 2, 3},\n    {4, 5, 6}\n};\nprintf(\"%d\\n\", grid[1][2]);   // 6  (row 1, column 2)\n```\n\nYou walk a 2-D array with **nested loops** — the outer loop over rows, the inner over columns. The same 0-based, bounds-aware rules apply to each dimension.\n\nWhen you pass an array to a function, something subtle happens: C does **not** copy the whole array. Instead the array's name *decays* into a **pointer to its first element**. This means the function works on the *original* array (so it can modify it), but it also means the function has **no idea how long the array is** — `sizeof` inside the function would measure a pointer, not the array. The standard solution is to **pass the length as a separate argument**:\n\n```c\nint sumArray(int arr[], int n) {\n    int s = 0;\n    for (int i = 0; i < n; i++) s += arr[i];\n    return s;\n}\n```\n\nAlso remember you **cannot copy** an array with `=` or compare two arrays with `==` — you must loop element by element (or use functions like `memcpy`)."},
            {"type": "example", "title": "Sum & max of an array — Run it", "stdin": "",
             "code": "#include <stdio.h>\n\nint main() {\n    int a[5] = {12, 7, 25, 3, 18};\n    int sum = 0, max = a[0];\n    for (int i = 0; i < 5; i++) {\n        sum += a[i];\n        if (a[i] > max) max = a[i];\n    }\n    printf(\"Sum = %d, Max = %d\\n\", sum, max);\n    return 0;\n}\n"},
            {"type": "check", "mode": "mcq",
             "question": "For `int a[5]`, what is the LAST valid index?",
             "options": ["5", "4", "1", "0"], "answer": "4",
             "explanation": "5 elements use indices 0,1,2,3,4. a[5] is out of bounds."},
            {"type": "check", "mode": "output",
             "question": "What does the Sum & Max example print?",
             "answer": "Sum = 65, Max = 25",
             "explanation": "12+7+25+3+18 = 65, and the largest element is 25."},
            {"type": "check", "mode": "mcq",
             "question": "Why do we pass an array's length to a function separately?",
             "options": ["For speed", "Because the array decays to a pointer, so the function can't know its size", "C requires two arguments", "To copy the array"],
             "answer": "Because the array decays to a pointer, so the function can't know its size",
             "explanation": "A passed array becomes a pointer to its first element; the length information is lost, so you pass it explicitly."},
        ],
    },
    # ───────────────────────── 12. Strings ─────────────────────────────────
    {
        "title": "Strings",
        "topic": "strings", "order_index": 12,
        "blocks": [
            {"type": "concept", "body": "## A string is a char array\n\nC has no dedicated string type. Instead, a **string is an array of `char`** that ends with a special **null terminator** — the character `'\\0'` (a byte with value 0). That terminator is what tells every string function *where the text stops*:\n\n```c\nchar name[] = \"Sam\";   // stored as {'S', 'a', 'm', '\\0'}\n```\n\nNotice the three letters take **four bytes** — the hidden `'\\0'` always needs room. This is why, if you declare a fixed-size buffer, it must be **at least one larger** than the longest text you'll store: a 10-character word needs `char word[11];`.\n\nYou print a string with the `%s` specifier, and you can index individual characters just like any array (`name[0]` is `'S'`). String literals in double quotes (`\"hello\"`) automatically include the terminator for you.\n\nBecause a string is really an array, the same rules apply: indices start at 0, and going out of bounds is undefined behaviour. The terminator also means many operations are **O(length)** — to find a string's length, the computer walks byte by byte until it hits `'\\0'`. Understanding that a string is \"a char array with a `'\\0'` at the end\" demystifies almost everything else about text handling in C."},
            {"type": "concept", "body": "## The string.h toolbox, and reading input\n\nManipulating strings by hand is tedious, so the standard library provides ready-made functions in **`<string.h>`**:\n\n- **`strlen(s)`** — the length, *not* counting the `'\\0'`.\n- **`strcpy(dest, src)`** — copy `src` into `dest`.\n- **`strcat(dest, src)`** — append (concatenate) `src` onto `dest`.\n- **`strcmp(a, b)`** — compare; returns **0** when the strings are equal.\n\nThat last one matters: you **cannot** compare strings with `==`, because `==` compares their *addresses*, not their contents. Always use `strcmp(a, b) == 0` to test equality.\n\nReading text input has its own gotchas. `scanf(\"%s\", word)` reads a **single word** and stops at the first space — so it can't read \"John Smith\" into one string. To read a whole line including spaces, use **`fgets(line, sizeof(line), stdin)`**.\n\nThe biggest danger with strings is the **buffer overflow**: functions like `strcpy` and `strcat` don't check whether the destination is big enough, so copying a long string into a small buffer writes past the end and corrupts memory. Safer variants (`strncpy`, `strncat`) and always sizing buffers with room for `'\\0'` keep your programs robust. (The platform's Memory check button catches many of these.) Buffer overflows aren't just bugs — historically they've been one of the most common security vulnerabilities in real software, because writing past a buffer can let attackers overwrite memory they shouldn't. Treating every string's size with care is therefore a habit worth building from your very first programs."},
            {"type": "example", "title": "Length & last character — Run it", "stdin": "",
             "code": "#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[] = \"hello\";\n    printf(\"length = %d\\n\", (int)strlen(s));\n    printf(\"last   = %c\\n\", s[strlen(s) - 1]);\n    return 0;\n}\n"},
            {"type": "check", "mode": "output",
             "question": "What is `strlen(\"hello\")`?",
             "answer": "5",
             "explanation": "strlen counts characters before the '\\0': h-e-l-l-o = 5."},
            {"type": "check", "mode": "mcq",
             "question": "How many bytes does the string \"Sam\" occupy?",
             "options": ["3", "4", "2", "8"], "answer": "4",
             "explanation": "Three letters plus the hidden null terminator '\\0' = 4 bytes."},
            {"type": "check", "mode": "mcq",
             "question": "How should you check if two strings are equal?",
             "options": ["a == b", "strcmp(a, b) == 0", "a.equals(b)", "a = b"],
             "answer": "strcmp(a, b) == 0",
             "explanation": "== compares addresses, not contents. strcmp returns 0 when the strings match."},
        ],
    },
    # ───────────────────────── 13. Pointers ────────────────────────────────
    {
        "title": "Pointers",
        "topic": "pointers", "order_index": 13,
        "blocks": [
            {"type": "concept", "body": "## Addresses and pointers\n\nEvery variable lives at a specific **address** in memory. A **pointer** is simply a variable whose value *is* an address — it \"points to\" where another variable lives. Pointers are the feature that makes C powerful, and they rest on three symbols:\n\n- **`&x`** — the *address-of* operator: gives the memory address of `x`.\n- **`int *p`** — declares `p` as a pointer to an `int`.\n- **`*p`** — the *dereference* operator: gives the *value stored at* the address `p` holds.\n\nPut together:\n\n```c\nint x = 42;\nint *p = &x;          // p holds the address of x\nprintf(\"%d\\n\", *p);   // 42  — follow the pointer to the value\n*p = 100;             // write THROUGH the pointer; x is now 100\nprintf(\"%d\\n\", x);    // 100\n```\n\nThe key idea: `p` and `x` now refer to the **same box**. Changing `*p` changes `x`, because they're the same memory. Think of `&` as \"where is it?\" and `*` as \"what's there?\".\n\nPointers feel abstract at first, so anchor them to the model from earlier lessons: memory is numbered boxes, and a pointer just stores one of those box numbers. Drawing little box-and-arrow diagrams while you trace pointer code is the fastest way to build intuition — and the Code Visualizer on this platform does exactly that for you."},
            {"type": "concept", "body": "## Why pointers matter — and the danger zone\n\nPointers aren't an academic curiosity; they power several everyday things:\n\n- **scanf** — `scanf(\"%d\", &n)` passes the *address* of `n` so the function can write into it. That `&` is a pointer.\n- **Pass-by-reference** — since C copies arguments, the only way for a function to modify a caller's variable is to pass a pointer to it. This is how you write a working `swap(int *a, int *b)`.\n- **Arrays** — an array's name behaves like a pointer to its first element, and `a[i]` is really `*(a + i)`. Pointer arithmetic (`p + 1` moves to the next element) is how arrays and pointers connect.\n- **Dynamic memory** — `malloc(n * sizeof(int))` reserves memory at runtime and returns a pointer to it, letting you create arrays whose size you don't know until the program runs. You must release it later with `free()`.\n\nWith that power comes responsibility — pointers are also C's most common source of crashes:\n\n- **NULL / uninitialised pointers** — dereferencing a pointer that points nowhere crashes instantly. Initialise pointers, and check for `NULL`.\n- **Dangling pointers** — using memory after `free()`-ing it. Set freed pointers to `NULL`.\n- **Memory leaks** — every `malloc` needs a matching `free`, or memory is lost until the program exits.\n\nUse the platform's **🛡️ Memory check** to catch these automatically as you learn."},
            {"type": "example", "title": "Change a variable through a pointer — Run it", "stdin": "",
             "code": "#include <stdio.h>\n\nint main() {\n    int x = 42;\n    int *p = &x;\n    *p = *p + 8;          // modify x via the pointer\n    printf(\"x = %d\\n\", x);\n    return 0;\n}\n"},
            {"type": "check", "mode": "output",
             "question": "What does the example print?",
             "answer": "x = 50",
             "explanation": "p points to x (42); `*p = *p + 8` writes 50 back into x."},
            {"type": "check", "mode": "mcq",
             "question": "What does the `*` do in `*p`?",
             "options": ["Multiplies p", "Gives the address of p", "Gives the value stored at the address p holds (dereference)", "Declares a new pointer"],
             "answer": "Gives the value stored at the address p holds (dereference)",
             "explanation": "Dereferencing follows the pointer to read/write the value it points at."},
            {"type": "check", "mode": "mcq",
             "question": "Every malloc should be paired with what, to avoid a memory leak?",
             "options": ["another malloc", "free()", "return", "sizeof"],
             "answer": "free()",
             "explanation": "Memory you allocate with malloc must be released with free() when you're done, or it leaks."},
        ],
    },
    # ───────────────────────── 14. Structures ──────────────────────────────
    {
        "title": "Structures",
        "topic": "structures", "order_index": 14,
        "blocks": [
            {"type": "concept", "body": "## Grouping related data with struct\n\nArrays hold many values of the *same* type. But real-world things — a student, a point, an employee — bundle together values of *different* types. A **structure** (`struct`) lets you group related fields into one custom type:\n\n```c\nstruct Student {\n    char name[20];\n    int  age;\n    float gpa;\n};\n\nstruct Student s = {\"Sam\", 20, 8.5};\nprintf(\"%s is %d\\n\", s.name, s.age);\n```\n\nYou define the structure once (the blueprint), then create variables of that type. To read or write a field, use the **dot operator** `.`:\n\n```c\ns.age = 21;\nprintf(\"%.1f\\n\", s.gpa);\n```\n\nThe fields are stored together in memory in the order you declare them, so a `struct` is essentially a single box subdivided into labelled compartments. This is how C builds up *meaningful* data instead of juggling dozens of loose variables. Grouping a student's name, age and GPA into one `struct Student` value is far cleaner — you can pass the whole record to a function, store it in an array, or return it from a function as a single unit. Structures are the first step toward modelling complex data and, eventually, building larger data structures. Think of a `struct` as defining a brand-new type tailored to your problem: once you have a `Student` or a `Point` type, the rest of your program can talk in those meaningful terms instead of juggling loose, unrelated variables — which is exactly how well-organised C programs are built."},
            {"type": "concept", "body": "## Arrays of structs, typedef, and pointers (->)\n\nStructures become really powerful when you combine them with what you already know.\n\nAn **array of structs** models a *list* of records — exactly how you'd store a whole class of students:\n\n```c\nstruct Student class[30];\nclass[0].age = 20;\n```\n\nTyping `struct Student` everywhere is verbose, so **`typedef`** lets you create a shorter alias:\n\n```c\ntypedef struct {\n    int x, y;\n} Point;\n\nPoint p = {3, 4};   // no 'struct' keyword needed\n```\n\nWhen you have a **pointer to a struct**, you can't use the dot operator directly — you'd have to write `(*ptr).field`, which is awkward. C provides the **arrow operator `->`** as clean shorthand:\n\n```c\nPoint *pp = &p;\npp->x = 10;        // same as (*pp).x = 10\n```\n\nUse `.` on a struct *value* and `->` on a struct *pointer*. Passing big structs to functions by pointer (`struct Student *`) avoids copying the whole thing and lets the function modify the original. A couple of advanced notes: the compiler may insert invisible **padding** between fields for alignment, so `sizeof(struct)` can exceed the sum of its fields; and structs combined with pointers are the building blocks of linked lists, trees and other dynamic data structures you'll meet later."},
            {"type": "example", "title": "A student record — Run it", "stdin": "",
             "code": "#include <stdio.h>\n\nstruct Student {\n    char name[20];\n    int  age;\n};\n\nint main() {\n    struct Student s = {\"Sam\", 20};\n    printf(\"%s is %d years old\\n\", s.name, s.age);\n    return 0;\n}\n"},
            {"type": "check", "mode": "mcq",
             "question": "Which operator reads a member of a struct *variable* (not a pointer)?",
             "options": [".  (dot)", "->  (arrow)", "*  (star)", "&  (ampersand)"],
             "answer": ".  (dot)",
             "explanation": "Use `.` on a struct variable (s.age); use `->` when you have a pointer to a struct (p->age)."},
            {"type": "check", "mode": "output",
             "question": "What does the student-record example print?",
             "answer": "Sam is 20 years old",
             "explanation": "The struct is initialised with name=\"Sam\", age=20, then printed with %s and %d."},
            {"type": "check", "mode": "mcq",
             "question": "What does `typedef` let you do with a struct?",
             "options": ["Make it run faster", "Create a shorter alias so you can drop the 'struct' keyword", "Store more fields", "Turn it into an array"],
             "answer": "Create a shorter alias so you can drop the 'struct' keyword",
             "explanation": "typedef gives the struct a one-word name (e.g. Point) so you needn't write 'struct' every time."},
        ],
    },
]

# ── Per-topic references (further reading) ──────────────────────────────────
_GFG = "https://www.geeksforgeeks.org/c-programming-language/"
_REFS = {
    "basics": [
        {"title": "learn-c.org — free interactive C tutorial", "url": "https://www.learn-c.org/"},
        {"title": "cppreference — C language reference", "url": "https://en.cppreference.com/w/c/language"},
        {"title": "GeeksforGeeks — C Programming", "url": _GFG},
    ],
    "conditionals": [
        {"title": "GeeksforGeeks — Decision making in C", "url": "https://www.geeksforgeeks.org/decision-making-c-c-else-nested-else/"},
        {"title": "cppreference — if / switch", "url": "https://en.cppreference.com/w/c/language/if"},
        {"title": "learn-c.org — Conditions", "url": "https://www.learn-c.org/en/Conditions"},
    ],
    "loops": [
        {"title": "GeeksforGeeks — Loops in C", "url": "https://www.geeksforgeeks.org/c-loops/"},
        {"title": "cppreference — for / while", "url": "https://en.cppreference.com/w/c/language/for"},
        {"title": "learn-c.org — For loops", "url": "https://www.learn-c.org/en/For_loops"},
    ],
    "functions": [
        {"title": "GeeksforGeeks — Functions in C", "url": "https://www.geeksforgeeks.org/functions-in-c/"},
        {"title": "GeeksforGeeks — Recursion", "url": "https://www.geeksforgeeks.org/recursion/"},
        {"title": "cppreference — Functions", "url": "https://en.cppreference.com/w/c/language/functions"},
    ],
    "arrays": [
        {"title": "GeeksforGeeks — Arrays in C", "url": "https://www.geeksforgeeks.org/c-arrays/"},
        {"title": "cppreference — Arrays", "url": "https://en.cppreference.com/w/c/language/array"},
        {"title": "learn-c.org — Arrays", "url": "https://www.learn-c.org/en/Arrays"},
    ],
    "strings": [
        {"title": "GeeksforGeeks — Strings in C", "url": "https://www.geeksforgeeks.org/strings-in-c-2/"},
        {"title": "cppreference — <string.h>", "url": "https://en.cppreference.com/w/c/string/byte"},
        {"title": "learn-c.org — Strings", "url": "https://www.learn-c.org/en/Strings"},
    ],
    "pointers": [
        {"title": "GeeksforGeeks — Pointers in C", "url": "https://www.geeksforgeeks.org/c-pointers/"},
        {"title": "GeeksforGeeks — Dynamic memory (malloc/free)", "url": "https://www.geeksforgeeks.org/dynamic-memory-allocation-in-c-using-malloc-calloc-free-and-realloc/"},
        {"title": "cppreference — Pointers", "url": "https://en.cppreference.com/w/c/language/pointer"},
    ],
    "structures": [
        {"title": "GeeksforGeeks — Structures in C", "url": "https://www.geeksforgeeks.org/structures-c/"},
        {"title": "cppreference — struct", "url": "https://en.cppreference.com/w/c/language/struct"},
        {"title": "learn-c.org — Structures", "url": "https://www.learn-c.org/en/Structures"},
    ],
}


def _build_blocks(item):
    """Lesson blocks + a references block appended at the end."""
    blocks = list(item["blocks"])
    refs = _REFS.get(item["topic"]) or _REFS["basics"]
    blocks.append({"type": "reference", "items": refs})
    return blocks


def _lessons_version(db):
    db.execute(text("CREATE TABLE IF NOT EXISTS app_meta (k VARCHAR(64) PRIMARY KEY, v VARCHAR(255))"))
    row = db.execute(text("SELECT v FROM app_meta WHERE k='lessons_version'")).fetchone()
    try:
        return int(row[0]) if row else 0
    except Exception:
        return 0


def _set_lessons_version(db, ver):
    db.execute(text("DELETE FROM app_meta WHERE k='lessons_version'"))
    db.execute(text("INSERT INTO app_meta (k, v) VALUES ('lessons_version', :v)"), {"v": str(ver)})


# Every title this seeder has ever produced — so re-seeding refreshes our own
# lessons by title while leaving admin-authored (custom-titled) lessons alone.
_SEED_TITLES = (
    {"Variables & Output", "Making Decisions: if / else", "Repeating with Loops",
     "Arrays: lists of values", "Pointers: the basics"}
    | {item["title"] for item in _LESSONS}
)


def seed_if_empty(db):
    """Install/upgrade the built-in curriculum. Re-seeds when _CURRICULUM_VERSION
    changes, refreshing only seed-owned lessons (admin's custom lessons are kept)."""
    if _lessons_version(db) >= _CURRICULUM_VERSION:
        return 0

    for l in db.query(models.Lesson).filter(models.Lesson.title.in_(_SEED_TITLES)).all():
        db.delete(l)
    db.flush()

    for item in _LESSONS:
        db.add(models.Lesson(
            title=item["title"], topic=item["topic"], order_index=item["order_index"],
            content=json.dumps(_build_blocks(item)), is_active=True,
        ))
    _set_lessons_version(db, _CURRICULUM_VERSION)
    db.commit()
    return len(_LESSONS)
