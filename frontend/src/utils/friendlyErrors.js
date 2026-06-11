// Translate cryptic gcc messages into plain-English tips for beginners.
// Returns a short hint string, or null if we don't have a friendlier phrasing.

const RULES = [
  [/expected ['"]?;['"]?/i,
    "You're missing a semicolon ';' — almost every C statement ends with one."],
  [/expected ['"]?\)['"]?/i,
    "A closing parenthesis ')' is missing — check that every '(' has a matching ')'."],
  [/expected ['"]?\(['"]?/i,
    "An opening parenthesis '(' looks missing — e.g. after if / while / a function name."],
  [/expected ['"]?\}['"]?/i,
    "A closing brace '}' is missing — every '{' needs a matching '}'."],
  [/expected ['"]?\{['"]?/i,
    "An opening brace '{' is missing — e.g. to start a function or loop body."],
  [/expected declaration or statement at end of input/i,
    "The file ends unexpectedly — you're probably missing a closing '}'."],
  [/missing terminating " character/i,
    "A string is missing its closing double-quote (\")."],
  [/missing terminating ' character/i,
    "A character literal is missing its closing single-quote (')."],
  [/implicit declaration of function ['"]?(printf|scanf|puts|gets|getchar|putchar)/i,
    "Add  #include <stdio.h>  at the top to use printf / scanf."],
  [/implicit declaration of function ['"]?(strlen|strcpy|strcmp|strcat|strncpy)/i,
    "Add  #include <string.h>  at the top to use string functions."],
  [/implicit declaration of function ['"]?(malloc|calloc|free|realloc|atoi|exit)/i,
    "Add  #include <stdlib.h>  at the top to use this function."],
  [/implicit declaration of function ['"]?(sqrt|pow|floor|ceil|fabs|sin|cos)/i,
    "Add  #include <math.h>  (and compile with -lm) to use math functions."],
  [/implicit declaration of function/i,
    "This function isn't declared — did you #include the right header, or misspell the name?"],
  [/['"]?(\w+)['"]? undeclared/i,
    "You're using a name that wasn't declared. Did you spell the variable correctly, or forget to declare it (e.g. 'int x;')?"],
  [/use of undeclared identifier/i,
    "You're using a name that wasn't declared. Check the spelling, or declare it first."],
  [/['"]?(\w+)['"]? may be used uninitialized|is used uninitialized/i,
    "This variable is read before you gave it a value — did you forget a scanf or an assignment?"],
  [/suggest parentheses around assignment used as truth value/i,
    "Looks like you used '=' (assign) where you meant '==' (compare) inside an if/while."],
  [/comparison .* always (true|false)/i,
    "This comparison is always the same — double-check the condition's logic."],
  [/control reaches end of non-void function/i,
    "Your function should return a value (e.g. add 'return 0;' at the end of main)."],
  [/format ['"]?%[^'"]*['"]? expects argument of type|format specifies type/i,
    "A printf/scanf format specifier doesn't match the variable type (use %d for int, %f for float/double, %c for char, %s for strings)."],
  [/too few arguments to function/i,
    "You're calling a function with fewer arguments than it needs."],
  [/too many arguments to function/i,
    "You're passing more arguments than this function accepts."],
  [/lvalue required/i,
    "The left side of '=' must be something you can assign to (a variable), not a value or expression."],
  [/expected expression/i,
    "Something's incomplete here — check for a stray operator, comma, or a missing value."],
  [/redefinition of|redeclared/i,
    "This name is declared twice — rename one, or remove the duplicate declaration."],
  [/incompatible (pointer )?type|makes integer from pointer/i,
    "The types don't match here — e.g. assigning a pointer to an int, or vice-versa."],
  [/array subscript .* (above array bounds|out of bounds)/i,
    "You're reading past the end of the array — valid indices are 0 to length-1."],
  [/division by zero/i,
    "You're dividing by zero — guard against a zero denominator."],
  [/stray ['"].['"] in program/i,
    "There's an unexpected character (maybe a smart-quote or symbol pasted from elsewhere)."],
]

export function friendlyHint(message) {
  if (!message) return null
  for (const [re, tip] of RULES) {
    if (re.test(message)) return tip
  }
  return null
}

// Build an enriched marker message: the raw gcc text + a 💡 beginner tip.
export function enrichMessage(message) {
  const tip = friendlyHint(message)
  return tip ? `${message}\n💡 ${tip}` : message
}
