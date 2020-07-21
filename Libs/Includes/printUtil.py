#!python

import sys

FORMAT_COLORS = \
{
    "GREEN": "\033[32m",
    "RED": "\033[31m",
    "YELLOW": "\033[33m"
}

FORMAT_RESET = "\033[0m"
FORMAT_OUTPUT = True
COLOR_PRINT = sys.stdout.isatty()

def cprint(text, color):
    if color in FORMAT_COLORS and FORMAT_OUTPUT and COLOR_PRINT:
        print(FORMAT_COLORS[color] + str(text) + FORMAT_RESET, end='', flush=True)
    elif type(color) == str and COLOR_PRINT:
        print(color + str(text) + FORMAT_RESET, end='', flush=True)
    else:
        print(text, end='', flush=True)
