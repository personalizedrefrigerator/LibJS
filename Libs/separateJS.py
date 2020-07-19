#!python
import sys, os.path, re
from Includes.printUtil import *
from Includes.argsUtil import *

FILE_SEP = re.compile(r"[/]{2}\s*Inserted file\s+")
STRICT_FILE_START = re.compile(r"^[\"\']use strict[\"\'];")
FILENAME_EXP = re.compile(r"[\"\'](\w+\.\w+)[\"\']\s*(encoding\s*=\s*[\"\'].+[\"\'])?(.\s*)?")
FUNCTION_WRAPPING_START = re.compile(r"([\"\']use strict[\"\'];)?[\s\n]*\(function\s?\(.*\)\s*\n?\s*\{", re.MULTILINE)
FUNCTION_WRAPPING_END = re.compile(r"\}\)\(.*\)\;[\s\n]*$", re.MULTILINE);


def splitJSFile(fileContents, outputDirectory = "./"):
    # Find all "Inserted file ..." coments starting with "//"
    isStrict = re.match(STRICT_FILE_START, fileContents) != None
    fileChunks = re.split(FILE_SEP, fileContents)
    
    outFilename = "setup.js"
    firstChunk = True
    firstChunkWrapped = False
    buff = ""
    
    def writeoutBuff(buff):
        print("[In writeout] Writing out " + str(outFilename))
        if os.path.exists(outFilename):
            cprint("ERROR: %s already exists.\n" % outFilename, FORMAT_COLORS["RED"])
            sys.exit(1)
        
        outFile = open(outFilename, 'w')
        outFile.write(buff)
        outFile.close()
    
    for chunk in fileChunks:
        filenameMatch = FILENAME_EXP.match(chunk)
        if filenameMatch:
            filename = filenameMatch.group(1)
            encoding = filenameMatch.group(2)
            
            if firstChunk:
                firstChunkWrapping = FUNCTION_WRAPPING_START.match(buff)
                if firstChunkWrapping:
                    buff = buff[firstChunkWrapping.end():]
                    firstChunkWrapped = True
            
            print ("Writing out " + str(outFilename))
            writeoutBuff(buff)
            
            outFilename = filename
            
            buff = chunk[filenameMatch.end():]
        else:
            buff += chunk
        
    if firstChunkWrapped:
        endChunkWrapping = FUNCTION_WRAPPING_END.search(buff)
        if endChunkWrapping:
            buff = buff[:endChunkWrapping.start()]
    
    print ("Last out.")
    writeoutBuff(buff)

def printHelp():
    cprint("Help: \n", FORMAT_COLORS['YELLOW'])
    cprint("  Summary: ", FORMAT_COLORS['YELLOW'])
    print("TODO")

if __name__ == "__main__":
    args = parseArgs(sys.argv,
    {
        'h': "help"
    })
    
    if help in args:
        printHelp()
    else:
        if len(args['default']) == 0:
            cprint("Error! The file name is mandatory!\n", FORMAT_COLORS['RED'])
            sys.exit(1)
        
        fileName = args['default'][0]
        
        fileObj = open(fileName, 'r')
        fileContents = fileObj.read()
        fileObj.close()
        
        splitJSFile(fileContents)
        
        