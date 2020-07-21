#!/usr/bin/python3

import os, os.path, sys
from shlex import quote

from Includes.printUtil import *
from Includes.argsUtil import *

ENCODING = "utf-8"

# Merge all .js files in sourceDirectory.
def merge(sourceDirectory):
    files = os.listdir(sourceDirectory)
    
    contents = ""

    for fileName in files:
        if fileName.endswith(".js"):
            contents += "\n// Inserted file %s encoding='%s'" % (quote(fileName), ENCODING)
            contents += "\n"

            fileObj = open(os.path.join(sourceDirectory, fileName))
            contents += fileObj.read()
            fileObj.close()

    return contents


def printHelp():
    cprint("Help: \n", FORMAT_COLORS['YELLOW'])
    cprint("  Summary: ", FORMAT_COLORS['YELLOW'])
    print()
    print("    Unify all JavaScript files in a directory. Does not support ES6 exports/modules.")
    cprint("  Usage: ", FORMAT_COLORS['GREEN'])
    print()
    print("    python3 %s in/directory/here [--help|--exports]" % sys.argv[0])
    print("  --help,-h         \t Print this help message.")
    print("  --exports,-e      \t Read exports from stdin.")
    print("  in/directory/here \t Unify all JavaScript files in this directory. Do not recurse.")
    print("All output is sent to stdout. Exports should be a newline-separated list")
    print("of the global-scope objects that should be exported from the given")
    print("directory. For example,")
    cprint(" SubWindowHelper", FORMAT_COLORS['GREEN'])
    print()
    cprint(" EditorHelper", FORMAT_COLORS['GREEN'])
    print()
    cprint(" JSHelper", FORMAT_COLORS['GREEN'])
    print()
    cprint(" HTMLHelper", FORMAT_COLORS['GREEN'])
    print()
    print("The above exports SubWindowHelper, EditorHelper, JSHelper, ")
    print("and HTMLHelper to global scope. As such, including the generated")
    print("JS file includes these objects in the project's global scope.")

if __name__ == "__main__":

    if __name__ == "__main__":
        args = parseArgs(sys.argv,
        {
            'h': "help",
            'e': "exports"
        })
        
        if 'help' in args:
            printHelp()
        else:
            # Print message to stderr because usually, output goes to stdout.
            if not args['default']:
                print("Usage: " + str(sys.argv[0]) + " [DIRNAME] ... other args ...", file=sys.stderr)
                print("Sends output to stdout.", file=sys.stderr)
                print()
                sys.exit(1)

            dirName = args['default'][0]
            print("\"use strict\";") # Enforce strict mode.
            print("(function()") # Wrap everything in a function...
            print("{")
            print(merge(dirName))

            # If given exports, put them here.
            if args['exports']:
                for line in sys.stdin:
                    exportName = line.rstrip()
                    print("self.%s = %s;", exportName, exportName)

            print("})();")
    
