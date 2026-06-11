"""Curated beginner challenges, seeded on first startup when the table is empty."""
import models

# ── Predict-the-output: short, self-contained snippets (no stdin) ───────────
_PREDICT = [
    {
        "title": "Integer division",
        "topic": "basics", "difficulty": "easy",
        "snippet": '#include <stdio.h>\nint main() {\n    int a = 7, b = 2;\n    printf("%d\\n", a / b);\n    printf("%d\\n", a % b);\n    return 0;\n}',
        "expected_output": "3\n1",
        "explanation": "In C, dividing two ints does integer division (truncates toward zero): 7 / 2 = 3, and 7 % 2 = 1 (the remainder).",
    },
    {
        "title": "char + int",
        "topic": "basics", "difficulty": "easy",
        "snippet": '#include <stdio.h>\nint main() {\n    char c = \'A\';\n    printf("%c\\n", c + 1);\n    printf("%d\\n", c);\n    return 0;\n}',
        "expected_output": "B\n65",
        "explanation": "A char holds its ASCII code. 'A' is 65, so c + 1 is 66 which prints as 'B' with %c, and 'A' prints as 65 with %d.",
    },
    {
        "title": "Post vs pre increment",
        "topic": "basics", "difficulty": "medium",
        "snippet": '#include <stdio.h>\nint main() {\n    int i = 5;\n    printf("%d\\n", i++);\n    printf("%d\\n", ++i);\n    return 0;\n}',
        "expected_output": "5\n7",
        "explanation": "i++ uses the value (5) then increments to 6. ++i increments to 7 first, then uses it.",
    },
    {
        "title": "float printed with %d",
        "topic": "basics", "difficulty": "medium",
        "snippet": '#include <stdio.h>\nint main() {\n    float x = 5.0 / 2;\n    printf("%.1f\\n", x);\n    return 0;\n}',
        "expected_output": "2.5",
        "explanation": "5.0 is a double, so the division is floating-point: 5.0 / 2 = 2.5. (Using %d here would be undefined — always match the specifier to the type.)",
    },
    {
        "title": "for-loop count",
        "topic": "loops", "difficulty": "easy",
        "snippet": '#include <stdio.h>\nint main() {\n    for (int i = 0; i < 3; i++)\n        printf("%d ", i);\n    return 0;\n}',
        "expected_output": "0 1 2",
        "explanation": "The loop starts at 0 and runs while i < 3, so it prints 0, 1, 2 (it stops before 3).",
    },
    {
        "title": "while with break",
        "topic": "loops", "difficulty": "medium",
        "snippet": '#include <stdio.h>\nint main() {\n    int n = 0;\n    while (1) {\n        if (n == 4) break;\n        n += 2;\n    }\n    printf("%d\\n", n);\n    return 0;\n}',
        "expected_output": "4",
        "explanation": "n goes 0 → 2 → 4; when it equals 4 the break stops the infinite loop, so 4 is printed.",
    },
    {
        "title": "Array indexing",
        "topic": "arrays", "difficulty": "easy",
        "snippet": '#include <stdio.h>\nint main() {\n    int a[] = {10, 20, 30, 40};\n    printf("%d\\n", a[0] + a[3]);\n    return 0;\n}',
        "expected_output": "50",
        "explanation": "Arrays are 0-indexed: a[0] is 10 and a[3] is 40, so the sum is 50.",
    },
    {
        "title": "String length",
        "topic": "strings", "difficulty": "medium",
        "snippet": '#include <stdio.h>\n#include <string.h>\nint main() {\n    char s[] = "hello";\n    printf("%d\\n", (int)strlen(s));\n    printf("%d\\n", (int)sizeof(s));\n    return 0;\n}',
        "expected_output": "5\n6",
        "explanation": "strlen counts characters (5). sizeof counts bytes including the hidden '\\0' terminator, so 6.",
    },
    {
        "title": "Pointer dereference",
        "topic": "pointers", "difficulty": "medium",
        "snippet": '#include <stdio.h>\nint main() {\n    int x = 42;\n    int *p = &x;\n    *p = *p + 8;\n    printf("%d\\n", x);\n    return 0;\n}',
        "expected_output": "50",
        "explanation": "p points to x. *p = *p + 8 changes the value at that address, so x becomes 50.",
    },
    {
        "title": "Conditional ladder",
        "topic": "conditionals", "difficulty": "easy",
        "snippet": '#include <stdio.h>\nint main() {\n    int m = 75;\n    if (m >= 90) printf("A\\n");\n    else if (m >= 60) printf("B\\n");\n    else printf("C\\n");\n    return 0;\n}',
        "expected_output": "B",
        "explanation": "75 is not >= 90, but it is >= 60, so the second branch runs and prints B.",
    },
]

# ── Fix-the-bug: buggy starter + the input it's run with + correct output ───
_FIXBUG = [
    {
        "title": "Sum of two numbers",
        "topic": "basics", "difficulty": "easy",
        "snippet": '#include <stdio.h>\nint main() {\n    int a, b;\n    scanf("%d %d", a, b);   // bug here\n    printf("%d\\n", a + b);\n    return 0;\n}',
        "test_input": "4 6",
        "expected_output": "10",
        "explanation": "scanf needs the ADDRESS of each variable: scanf(\"%d %d\", &a, &b). Without &, it reads into garbage addresses.",
    },
    {
        "title": "Print 1 to 5",
        "topic": "loops", "difficulty": "easy",
        "snippet": '#include <stdio.h>\nint main() {\n    for (int i = 1; i < 5; i++)   // bug here\n        printf("%d ", i);\n    return 0;\n}',
        "test_input": "",
        "expected_output": "1 2 3 4 5",
        "explanation": "i < 5 stops at 4. Use i <= 5 (or i < 6) so 5 is included.",
    },
    {
        "title": "Missing semicolon",
        "topic": "basics", "difficulty": "easy",
        "snippet": '#include <stdio.h>\nint main() {\n    int x = 9\n    printf("%d\\n", x);\n    return 0;\n}',
        "test_input": "",
        "expected_output": "9",
        "explanation": "Every statement ends with a semicolon. Add ; after int x = 9.",
    },
    {
        "title": "Largest of two",
        "topic": "conditionals", "difficulty": "easy",
        "snippet": '#include <stdio.h>\nint main() {\n    int a = 3, b = 8;\n    int max = a;\n    if (b > max)\n        max = a;        // bug here\n    printf("%d\\n", max);\n    return 0;\n}',
        "test_input": "",
        "expected_output": "8",
        "explanation": "When b is the larger value, you must store b — not a. Change 'max = a;' to 'max = b;' so max ends up as 8.",
    },
    {
        "title": "Average of array",
        "topic": "arrays", "difficulty": "medium",
        "snippet": '#include <stdio.h>\nint main() {\n    int a[5] = {2, 4, 6, 8, 10};\n    int sum = 0;\n    for (int i = 0; i <= 5; i++)   // bug here\n        sum += a[i];\n    printf("%d\\n", sum / 5);\n    return 0;\n}',
        "test_input": "",
        "expected_output": "6",
        "explanation": "i <= 5 reads a[5], which is out of bounds (valid indices are 0..4). Use i < 5. The average is 30 / 5 = 6.",
    },
    {
        "title": "Reverse a string print",
        "topic": "strings", "difficulty": "medium",
        "snippet": '#include <stdio.h>\n#include <string.h>\nint main() {\n    char s[] = "abc";\n    for (int i = 0; i <= strlen(s); i++)   // bug here\n        printf("%c", s[strlen(s) - i]);\n    printf("\\n");\n    return 0;\n}',
        "test_input": "",
        "expected_output": "cba",
        "explanation": "When i = 0, s[len] is the '\\0' terminator (prints nothing visible) and the loop also overshoots. Loop i from 1 to len: print s[len - i] for i = 1..len, giving c, b, a.",
    },
]


def seed_if_empty(db):
    """Insert the curated set once (idempotent — only when no challenges exist)."""
    if db.query(models.Challenge).first():
        return 0
    n = 0
    for item in _PREDICT:
        db.add(models.Challenge(kind="predict", is_active=True, **item))
        n += 1
    for item in _FIXBUG:
        db.add(models.Challenge(kind="fixbug", is_active=True, **item))
        n += 1
    db.commit()
    return n
