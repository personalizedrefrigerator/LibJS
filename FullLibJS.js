"use strict";
(function()
{

// Inserted file IntroScreen.js encoding='utf-8'
"use strict";

function IntroScreen(options)
{
    var me = this;

    options = options || { };

    // TODO: Fill normals, verticies, and colors, if
    //not provided in options.

    let canvas = document.createElement("canvas");
    let textureCanvas = document.createElement("canvas");

    if (!options.parentElement)
    {
        me.subWindow = SubWindowHelper.create({ title: "An Intro Screen", minWidth: 200, minHeight: 200 });
        me.subWindow.appendChild(canvas);

        me.subWindow.setOnCloseListener(() =>
        {
            me.stop();
        });
        
        me.subWindow.enableFlex();
    }
    else
    {
        options.parentElement.appendChild(canvas);
    }

    canvas.style.width = "calc(100% - 2px)";
    canvas.style.height = "auto";
    textureCanvas.width = 400;
    textureCanvas.height = 400;

    let ctx = canvas.getContext("2d");
    let textureCtx = textureCanvas.getContext("2d");

    this.renderer = new Renderer();

    this.renderer.setFogColor(new Vector3(1.0, 1.0, 1.0));
    this.renderer.setZMax(2000);

    let backgroundObject = this.renderer.registerObject();
    backgroundObject.bufferData("a_normal", options.normals);
    backgroundObject.bufferData("a_position", options.verticies);
    backgroundObject.bufferData("a_color", options.vertexColors);
    backgroundObject.bufferData("a_texCoord", options.texCoords);

    let startButton = this.renderer.registerObject();
    startButton.bufferData("a_normal", ModelHelper.Objects.Cube.getNormals());
    startButton.bufferData("a_position", ModelHelper.Objects.Cube.getVerticies());
    startButton.bufferData("a_texCoord", ModelHelper.Objects.Cube.getTexCoords());
    startButton.bufferData("a_color", JSHelper.getArrayOfRandomColors(
        ModelHelper.Objects.Cube.getVerticies().length,
        false, 3, 0.0, 0.1, 0.0, 0.2, 0.2, 0.3));

    let startButtonZ = 0;

    JSHelper.Events.registerPointerEvent("move", canvas, function(e)
    {
        var bbox = canvas.getBoundingClientRect();

        me.renderer.setMousePosition(new Point(e.clientX - bbox.left, (canvas.clientHeight - (e.clientY - bbox.top))));
    });

    canvas.addEventListener("click", function(e)
    {
        var mouseAttributes = me.renderer.getMouseAttributes();

        if (mouseAttributes.selectedObject === startButton)
        {
            startButtonZ -= 100;
        }
    });

    let rotateY = 0, rotateX = 0, crunch = 1, buttonWobble = 0, fogDecay = 10000;

    // Draw textures onto the texture canvas. Currently a test texture. This will change.
    var renderTextures = () =>
    {
        textureCtx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);

        textureCtx.fillStyle = "orange";
        textureCtx.fillRect(0, 0, textureCtx.canvas.width, textureCtx.canvas.height);


        textureCtx.fillStyle = "white";

        let y, count;
        const dx = 20,
              dy = 20;

        count = 0;

        for (let x = 0; x < textureCanvas.width; x += dx)
        {
            for (y = (count % 2) * dy; y < textureCanvas.height; y += dy * 2)
            {
                textureCtx.fillRect(x, y, dx, dy);
            }

            count++;
        }

        textureCtx.fillStyle = "red";

        textureCtx.font = "40pt serif";
        textureCtx.textBaseline = "top";
        textureCtx.fillText("Click to Start...", 0, 30);

    };

    renderTextures();

    this.render = () =>
    {
        // Resize the WebGL context, if needed.
        me.renderer.updateViewIfNeeded(canvas.clientWidth, canvas.clientHeight, false);

        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight)
        {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }

        // Clear the context.
        me.renderer.clear();
        
        me.renderer.updateCamera();

        me.renderer.setFogDecay(fogDecay);

        startButton.bindBuffers(); // Draw the start button first.

        me.renderer.worldMatrix.save();
        me.renderer.worldMatrix.translate([0, 0, startButtonZ]);
        me.renderer.worldMatrix.rotateY(buttonWobble);
        me.renderer.worldMatrix.rotateX(buttonWobble * buttonWobble / 2.0);

        me.renderer.worldMatrix.scale(4, 1, 1);
        me.renderer.worldMatrix.translate([-25, 0, 0]);

        me.renderer.updateWorldMatrix();

        me.renderer.setTexture(textureCanvas);

        // Draw it.
        me.renderer.render(startButton);

        me.renderer.worldMatrix.restore();

        // Note that the main object is to be drawn.
        backgroundObject.bindBuffers();

        me.renderer.worldMatrix.save();

        me.renderer.worldMatrix.translate([0, 0, -800]);

        me.renderer.worldMatrix.rotateY(rotateY);

        me.renderer.setTexture(textureCanvas);

        for (var i = 0; i < 50; i++)
        {
            me.renderer.worldMatrix.save();
            me.renderer.worldMatrix.translate([Math.sin(i * 4) * 300, Math.cos(i) * 300 * crunch, Math.cos(i * 2) * 400]);

            me.renderer.worldMatrix.rotateX(rotateX * (i + 1));

            me.renderer.worldMatrix.translate([0, Math.min(Math.max(Math.tan(i) * (i + 1), -200), 200), 0]);

            me.renderer.updateWorldMatrix();
            me.renderer.worldMatrix.restore();

            // Draw it.
            me.renderer.render(backgroundObject);
        }

        me.renderer.worldMatrix.restore();

        // Copy the contents of the background canvas to the
        //display.
        me.renderer.display(ctx);
    };

    var lastTime = undefined;
    this.animate = () => 
    {
        if (!lastTime)
        {
            lastTime = (new Date()).getTime();
        }

        let nowTime = (new Date()).getTime();
        let deltaTime = nowTime - lastTime;

        rotateY += deltaTime / 1000;
        rotateX += deltaTime / 8000;
        crunch = Math.abs(Math.sin(nowTime / 500) + Math.random() / 8) * 2;
        buttonWobble = Math.sin(nowTime / 1000) * 0.4;
        fogDecay = (Math.sin(nowTime / 5000) + 1.01) * 10000;

        lastTime = nowTime;
    };

    let shouldStop = false;

    this.mainloop = () =>
    {
        if (!shouldStop)
        {
            me.render();
            me.animate();

            requestAnimationFrame(() =>
            {
                me.mainloop.apply(me);
            });
        }
    };

    this.stop = () =>
    {
        shouldStop = true;

        if (me.subWindow)
        {
            me.subWindow.close();
        }
    };
}

const IntroScreenHelper = 
{
    test: () =>
    {
        const modeler = new Modeler3D(undefined, (verticies, normals) =>
        {
            var options = {};

            options.verticies = verticies;
            options.normals = normals; // 0.3 is the tolerance for the normals.
            options.vertexColors = JSHelper.getArrayOfRandomColors(
                verticies.length,
                false,
                3,
                0.3, 0.9,
                0.1, 0.7,
                0.1, 0.7);

            options.texCoords = ModelHelper.getTexCoords(verticies);

            (new IntroScreen(options)).mainloop();
        });
    }
};


// Inserted file Game.js encoding='utf-8'
"use strict";

function SimpleGame(options)
{
    const me = this;
    
    options = options || {};
    
    let canvas = document.createElement("canvas");
    let textureCanvas = document.createElement("canvas");
    let shouldStop = false;
    
    if (!options.parentElement)
    {
        me.subWindow = SubWindowHelper.create({ title: "Simple Game", minWidth: 200, minHeight: 200 });
        me.subWindow.appendChild(canvas);
        
        me.subWindow.setOnCloseListener(() =>
        {
            me.stop();
        });
        
        me.subWindow.enableFlex();
    }
    else
    {
        options.parentElement.appendChild(canvas);
    }
    
    canvas.style.width = "calc(100% - 2px)";
    canvas.style.height = "auto";
    textureCanvas.width = 400;
    textureCanvas.height = 400;
    
    let ctx = canvas.getContext("2d");
    let textureCtx = textureCanvas.getContext("2d");
    
    me.renderer = new Renderer();
    
    me.renderer.setFogColor(new Vector3(1.0, 1.0, 1.0));
    me.renderer.setZMax(2000);
    
    let cubeObject = me.renderer.registerObject();
    cubeObject.bufferData("a_normal", ModelHelper.Objects.Cube.getNormals());
    cubeObject.bufferData("a_position", ModelHelper.Objects.Cube.getVerticies());
    cubeObject.bufferData("a_texCoord", ModelHelper.Objects.Cube.getTexCoords());
    cubeObject.bufferData("a_color", JSHelper.getArrayOfRandomColors(
        ModelHelper.Objects.Cube.getVerticies().length,
        false, 3, 0.5, 0.6, 0.8, 0.9, 0.4, 0.5));
    
    let lastTime = (new Date()).getTime();
    
    let world = WorldHelper.createBasicWorld(me.renderer);
    
    let render = () =>
    {
        me.renderer.updateViewIfNeeded(canvas.clientWidth, canvas.clientHeight, false);
        
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight)
        {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
        
        me.renderer.clear();
        me.renderer.updateCamera();
        
        world.render();
        
        me.renderer.display(ctx);
    };
    
    let animate = () =>
    {
        let nowTime = (new Date()).getTime();
        
        world.tick(nowTime - lastTime);
        
        lastTime = nowTime;
    };
    
    this.mainloop = () =>
    {
        if (!shouldStop)
        {
            render();
            
            requestAnimationFrame(() =>
            {
                me.mainloop.apply(me);
            });
        }
    };
    
    this.stop = () =>
    {
        shouldStop = true;
    };
}


// Inserted file PythonConsole.js encoding='utf-8'
"use strict";

// Do not use this file unless the project is licensed under the MPL!
// This file may be licenced to you under a licence different from that
// of its source distribution. I suggest against using it.

const PYODIDE_WEB_WORKER_URL = "Pyodide/webworker.js";
const USE_PYTHON_WORKER = false;
const PYTHON_WORKER = USE_PYTHON_WORKER ? new Worker(PYODIDE_WEB_WORKER_URL) : undefined;
let PYTHON_CONSOLE_GLOBAL_ID_COUNTER = 0; // Lets python access an associated editor.

function PythonConsole()
{
    // Create UI.
    let consoleWindow = EditorHelper.openWindowedEditor("%%% PY", undefined, 
    {
        title: "Python Console",
        configureWindows: (runWindow, importExportWindow, keyboardWindow, viewerWindow) =>
        {
            // Close unneeded windows.
            runWindow.close();
            importExportWindow.close();
        }
    });
    let pythonConsoleConnection = { push: (content) => { console.error("NOT INITIALIZED"); } };
    let promptColor = "orange";
    const STDOUT_COLOR = "#33ffaa";
    const STDERR_COLOR = "#ffaaaa";
    const CONTINUED_LINE_PROMPT_TEXT = "... ";
    const PROMPT_TEXT = ">>> ";
    const AUTO_INDENT_INDENT_CHARS = "    ";
    const EDITOR_GLOBAL_ID = "_PythonConsoleObject" + PYTHON_CONSOLE_GLOBAL_ID_COUNTER++;
    
    // Make it accessible.
    self[EDITOR_GLOBAL_ID] = this;
    
    // Get the background worker.
    const pythonWorker = PYTHON_WORKER;
    
    // Note that this is a python console.
    consoleWindow.editControl.setDefaultHighlightScheme("py");
    
    // Handle events from python.
    if (pythonWorker) // The pythonWorker does not seem to work in all browsers...
                      // If it hasn't been defined, don't use it.
    {
        pythonWorker.onmessage = (event) =>
        {
            const { results, errors } = event.data;
            
            if (onMessageListeners.length > 0)
            {
                // Notify the first.
                if (results || !errors)
                {
                    (onMessageListeners[0])(results);
                }
                else
                {
                    (onMessageListeners[0])(errors);
                }
                
                onMessageListeners = onMessageListeners.splice(1);
            }
            else
            {
                console.log(results);
                console.warn(errors);
            }
        };
        
        pythonWorker.onerror = (event) =>
        {
            if (onMessageListeners.length > 0)
            {
                onMessageListeners[0]({ filename: event.filename, line: event.lineno,
                                                      message: event.message });
                
                onMessageListeners = onMessageListeners.splice(1);
            }
            else
            {
                console.warn(event.message + " ( " + event.filename + ":" + event.lineno + " ) " );
            }
        };
    }
    
    let onMessageListeners = []; //  A stack of everyone waiting for
                                 // a response from Python.
    
    // Register a listener for events from the python
    //worker. Paramater doNotRejectErrors represents
    //whether to "throw" an exception by calling reject
    //with the content of the error.
    let nextResponsePromise = (doNotRejectErrors) =>
    {
        let result = new Promise((resolve, reject) =>
        {
            onMessageListeners.push((results, failures) =>
            {
                resolve(results);
                
                if (failures && !doNotRejectErrors)
                {
                    reject(failures);
                }
            });
        });
        
        return result;
    };
    
    let runPython = (code) =>
    {
        // Can we use the worker?
        if (pythonWorker)
        {
            pythonWorker.postMessage(
            {
                python: code
            });
            
            return nextResponsePromise();
        } // If not,
        else
        {
            return pyodide.runPythonAsync(code);
        }
    };
    
    window.runPython = runPython;
    
    let handlePyResult = async function()
    {
        let stdoutContent = await runPython("sys.stdout.getvalue()");
        let stderrContent = await runPython("sys.stderr.getvalue()");
        
        await runPython("sys.stdout.truncate(0)\nsys.stdout.seek(0)");
        await runPython("sys.stderr.truncate(0)\nsys.stderr.seek(0)");
        
        if (stdoutContent)
        {
            consoleWindow.displayContent(stdoutContent, (line) =>
            {
                if (!line)
                {
                    return;
                }
                
                line.setColorFunction = (index) =>
                {
                    return STDOUT_COLOR;
                };
                
                line.editable = false;
            });
        }
        
        if (stderrContent)
        {
            consoleWindow.displayContent(stderrContent, (line) =>
            {
                if (!line)
                {
                    return;
                }
                
                line.setColorFunction = (index) =>
                {
                    return STDERR_COLOR;
                };
                
                line.editable = false;
            });
        }
    
        requestAnimationFrame(() =>
        {
            consoleWindow.render();
        });
    };
    
    let indentContinuedLine = (newPromptText, previousPromptText) =>
    {
        // Indent.
        for (let i = 0; i < previousPromptText.length; i++)
        {
            if (previousPromptText.charAt(i) == " ")
            {
                newPromptText += " ";
            }
            else
            {
                break;
            }
        }
        
        // Did the previous line end in a colon?
        if (previousPromptText.trim().endsWith(":"))
        {
            newPromptText += AUTO_INDENT_INDENT_CHARS;
        }
        
        // Did the previous line end in spaces?
        if (previousPromptText.endsWith(AUTO_INDENT_INDENT_CHARS))
        {
            newPromptText = CONTINUED_LINE_PROMPT_TEXT;
        }
        
        return newPromptText;
    };
    
    let promptLine = undefined;
    let createPrompt = (promptText) =>
    {    
        promptText = promptText || PROMPT_TEXT;
        
        let newLine = consoleWindow.editControl.appendLine(promptText);
        
        newLine.setColorFunction = (index) =>
        {
            if (index < promptText.length)
            {
                return promptColor;
            }
        };
        
        newLine.focus();
        consoleWindow.scrollToFocus();
        promptLine = newLine;
        
        
        newLine.onentercommand = () =>
        {
            try
            {
                newLine.onentercommand = function()
                {
                    if (promptLine)
                    {
                        promptLine.text = newLine.text;
                        
                        // Postpone focusing -- the
                        //enter command might still be 
                        //being processed.
                        requestAnimationFrame(() =>
                        {
                            promptLine.focus();
                            
                            consoleWindow.scrollToFocus();
                            
                            consoleWindow.render();
                        });
                    }
                };
                
                newLine.editable = false;
                
                let codeToRun = newLine.text.substring(promptText.length);
                
                pythonConsoleConnection.push(codeToRun).then(
                (result) =>
                {
                    if (!result)
                    {
                        handlePyResult().then(() =>
                        {
                            createPrompt(PROMPT_TEXT);
                        });
                    }
                    else
                    {
                        let newPrompt = createPrompt(CONTINUED_LINE_PROMPT_TEXT);
                        
                        newPrompt.text = indentContinuedLine(newPrompt.text, codeToRun);
                    }
                }).catch((error) =>
                {
                    error = error + "";
                    runPython("sys.stderr.write('''" + error.split("'''").join(",") + "''')");
                    
                    let onComplete = () =>
                    {
                    
                        handlePyResult().then(() =>
                        {
                            createPrompt(PROMPT_TEXT);
                        });
                    };
                    
                    // Push more code to the console. This completes
                    //the command for which an error was thrown.
                    pythonConsoleConnection.push("print('...')").then(onComplete).catch(onComplete);
                });
            }
            catch(e)
            {
                consoleWindow.displayContent("" + e);
                
                createPrompt(promptText);
            }
        };
        
        // Display changes.
        requestAnimationFrame(() =>
        {
            // Move the cursor.
            newLine.cursorPosition = newLine.text.length;
            
            // Render.
            consoleWindow.render();
        });
        
        // Return the line.
        return newLine;
    };
    
    // Run python.
    pythonConsoleConnection = 
    {
        push: (code) =>
        {
            // If we're using the worker,
            if (pythonWorker)
            {
                requestAnimationFrame(() =>
                {
                    pythonWorker.postMessage
                    (
                        {
                            __code: code,
                            python: "from js import __code\n_pushCode" + EDITOR_GLOBAL_ID + "(__code)"
                        }
                    );
                });
                
                return nextResponsePromise();
            }
            else
            {
                return new Promise((resolve, reject) =>
                {
                    try
                    {
                        window.__code = code;
                        resolve(pyodide.runPython("from js import __code\n_pushCode" + EDITOR_GLOBAL_ID + "(__code)"));
                    }
                    catch(e)
                    {
                        reject(e);
                    }
                });
            }
        }
    };
    
    this.codeRefresh = function()
    {
        handlePyResult();
    };
    
    languagePluginLoader.then(() =>
    {
        runPython(
            `
import io, code, sys
from js import self, pyodide

sys.stdout = io.StringIO()
sys.stderr = io.StringIO()

def _formattedPrint(inputObject, currentDepth = 0):
    MAX_LINE_LEN = 100 # Wrap lines at 100 chars
    
    indent = " " * currentDepth
    
    output = str(inputObject)
    
    # Wrap the output at MAX_LINE_LEN characters.
    lines = output.split("\\n")
    wrappedOutput = ""
    
    wordSeparators = [' ', ',', '.', '/']
    
    for i in lines:
        curLine = str(i)
        
        while len(curLine) > MAX_LINE_LEN:
            # Does it have an ending space?
            breakIndex = -1
            
            fullLine = curLine
            curLine = curLine[0:MAX_LINE_LEN]
            
            # Try to make breakIndex not -1.
            for sep in wordSeparators:
                if breakIndex != -1:
                    break
                breakIndex = curLine.rfind(sep)
            
            if breakIndex == -1:
                breakIndex = MAX_LINE_LEN
            
            wrappedOutput += curLine[0:breakIndex] + "\\n"
            curLine = fullLine[breakIndex:]
        
        wrappedOutput += curLine + "\\n"
    
    # Print the wrapped output, excluding the final line-break.
    print (wrappedOutput[0:len(wrappedOutput) - 1])    

# When the editor detects a returned promise...
def _Console_promiseFinished${EDITOR_GLOBAL_ID}(objectName, message):
    from js import ${EDITOR_GLOBAL_ID}
    
    print (objectName)
    _formattedPrint(message, 1) # Show the message
    
    # Refresh the editor.
    ${EDITOR_GLOBAL_ID}.codeRefresh();

# Prefix the console class!
# If running in the window's cPython runtime,
#it might be shared with other consoles!
class Console${EDITOR_GLOBAL_ID}(code.InteractiveConsole):
    def runcode(self, code):
        from js import pyodide
        
        out = pyodide.runPython("\\n".join(self.buffer))
      
        if out != None:
            _formattedPrint(out)
            
            # Is it a promise?
            if "then" in dir(out):
                try:
                    out.then(
                            lambda message: 
                                _Console_promiseFinished${EDITOR_GLOBAL_ID}
                                                    ("%s: " % out, message)
                            )
                except Exception as e:
                    sys.stderr.write("Internal Error: " + str(e))

_mainConsole${EDITOR_GLOBAL_ID} = Console${EDITOR_GLOBAL_ID}(locals=globals())

def _pushCode${EDITOR_GLOBAL_ID}(code):
    return _mainConsole${EDITOR_GLOBAL_ID}.push(code)

# Define a pyodide-specific help menu.
# TODO Finish this
def help_pyodide():
    print ("Welcome to the Python console.")
    print ("This help message (not created")
    print ("by Pyodide) is currently under")
    print ("development! It is a TODO.")
    print ("------Loading Libraries-----")
    print ("1.  from js import pyodide")
    print ("2.  pyodide.loadPackage('package_name_here')")
    print ()
    print ("   The first line requests that")
    print ("  the pyodide object defined in")
    print ("  JavaScript be imported --    ")
    print ("  that python be given access to")
    print ("  it.")
    print ("   On line two, having gotten")
    print ("  access to this package, we ")
    print ("  load a package with name   ")
    print ("  package_name_here.")
    print ("   Packages available in this")
    print ("  way include matplotlib,    ")
    print ("  numpy, pandas, and others. ")
    print (" (See Pyodide's documentation)")
    print ()
    print ()
    print ("------Interacting With JavaScript-------")
    print ("    from js import document")
    print ()
    print ("    As explained previously, objects can")
    print ("  imported from JavaScript! The example")
    print ("  makes the object document visible to")
    print ("  Python.")
    print ()
    print ()
    print ("------Limitations---------------------")
    print ("    Currently, input() calls result in")
    print (" a prompt requesting input. This is not")
    print (" desirable. Additional information")
    print (" might be put here in the future.")

# Display a banner.
print (sys.version)
print ("Python from Pyodide")
print ("(From Mozilla. See https://github.com/iodide-project/pyodide)")
print ("See the provided site for Pyodide's source and license.")
print (" Try typing help(), license() or credits for more information.")
print (" For pyodide-related help, try help_pyodide().")
print ("--------------------------------------------------------------")

license.MAXLINES = 1000 # As of the time of this writing, input() displays
                        # a prompt dialogue. This is undesirable, so the
                        # entire license message should be printed (or
                        # close to it).
`).then(() =>
        {
            handlePyResult().then(() =>
            {
                consoleWindow.editControl.appendLine("");
                
                requestAnimationFrame(() =>
                {
                    createPrompt();
                });
            });
        });
    });
}


// Inserted file Vector3.js encoding='utf-8'
"use strict";

// An object that inherits from Point.
//Is a Vector3 a Point? NO! TODO Refactor
//this. Inheritance should fulfill an IS-A
//relationship.
function Vector3(x, y, z)
{
    Point.call(this, x, y, z); // Inherit from Point.
    this.IS_VECTOR = true;

    var me = this;
    
    this.x = x;
    this.y = y;
    this.z = z;
    
    /*
    A useful menomic for the cross product:
        | i  j  k  |       | y1 z1 |       | x1 z1 |       | x1 y1 |
    R = | x1 y1 z1 | = i * | y2 z2 | - j * | x2 z2 | + k * | x2 y2 |
        | x2 y2 z2 |   
    
    R = i * (y1 * z2 - z1 * y2) - j * (x1 * z2 - x2 * z1) + k * (x1 * y2 - x2 * y1)
    R = i * (y1 * z2 - z1 * y2) + j * (x2 * z1 - x1 * z2) + k * (x1 * y2 - x2 * y1)
    */
    this.cross = function(other)
    {
        var result = new Vector3(me.y * other.z - me.z * other.y, me.z * other.x - other.z * me.x, me.x * other.y - other.x * me.y);
        
        return result;
    };
    
    this.copy = function()
    {
        var result = new Vector3(me.x, me.y, me.z);
        
        return result;
    };
    
    this.mulScalar = function(scalar)
    {
        var result = new Vector3(me.x * scalar, me.y * scalar, me.z * scalar);
        
        return result;
    };
    
    this.multiplyScalar = this.mulScalar;
    
    this.mulScalarAndSet = function(scalar)
    {
        me.x *= scalar;
        me.y *= scalar;
        me.z *= scalar;
    };
    
    this.multiplyScalarAndSet = this.mulScalarAndSet;
    
    this.add = function(other)
    {
        var result = new Vector3(me.x + other.x, me.y + other.y, me.z + other.z);
        
        return result;
    };
    
    this.addAndSet = function(other)
    {
        me.x += other.x;
        me.y += other.y;
        me.z += other.z;
    };
    
    this.subtract = function(other)
    {
        var result = new Vector3(me.x - other.x, me.y - other.y, me.z - other.z);
        
        return result;
    };
    
    this.subtractAndSet = function(other)
    {
        me.x -= other.x;
        me.y -= other.y;
        me.z -= other.z;
    };
    
    // Demonstration/Informal Proof.
    // Given: v = <x, y>, e**(it) = cos t + i sin t.
    //To rotate by PI/2 radians, multiply v by e**(iPI/2),
    //because cos (t + X) + i sin (t + X) = e**(i(t + X)) = e**(it) * e**(iX).
    //Similarly, e**(iPI/2) = i because cos(PI / 2) = 0 and sin(PI/2) = 1.
    //Representing v using imaginary numbers, v = x + iy, so, to 
    //rotate by PI/2 radians, v = i * (x + iy) = ix - y, so,
    //v' = <-y, x> = <-v_y, v_x>. This is the same as crossing v
    //with the z-axis.
    this.perpindicular2D = function()
    {
        return new Vector3(me.y, -me.x, me.z);
    };
    
    this.dot = function(other)
    {
        return other.x * me.x + other.y * me.y + other.z * me.z;
    };
    
    this.getLength = function()
    {
        return Math.sqrt(me.x * me.x + me.y * me.y + me.z * me.z);
    };
    
    this.getLength2D = function()
    {
        return Math.sqrt(me.x * me.x + me.y * me.y);
    };
    
    this.normalize = function()
    {
        var length = me.getLength();
        
        if (length !== 0)
        {
            me.x /= length;
            me.y /= length;
            me.z /= length;
        }
        
        return me;
    };
    
    this.normalize2D = function()
    {
        var length = me.getLength2D();
        
        if (length !== 0)
        {
            me.x /= length;
            me.y /= length;
        }
        
        return me;
    };
    
    this.toString = function()
    {
        return "<" + me.x + ", " + me.y + ", " + me.z + ">";
    };
}

// Inserted file Drawer2D.js encoding='utf-8'
"use strict";

// A simple 2D drawing program, created with the goal of
//allowing users to create and edit textures.

function Drawer2D(onSubmit, options)
{
    //options:
    //  initialHeight,
    //  initialWidth -- The initial size of the window and image, 
    //                  if imageWidth,imageHeight/image not given
    //  initialImage -- An initial entity with width and ehight properties
    //                  that can be drawn onto a Context2D via context.drawImage.
    //  imageHeight,
    //  imageWidth   -- Override initialImage.width, initialImage.height, or use these
    //                  as the dimensions of the new, blank image should no initialImage
    //                  be given.
    //  windowOptions -- Additional options to be given to the SubWindowHelper on window creation.
    //  background   -- CSS background property value for the drawing view. E.g. radial-gradient(red, white).
    options = options || {};    
    
    var me = this;
    
    let undoStack = [];
    let redoStack = [];
    
    const INITIAL_WIDTH = options.initialWidth || 500;
    const INITIAL_HEIGHT = options.initialHeight || 500;
    const MAX_UNDO = 30;
    
    const INITIAL_VIEW_X = 0;
    const INITIAL_VIEW_Y = 0;
    
    // To add something to the undo stack,
    //at least two changes should have occurred
    //and five seconds passed.
    const UNDO_TIME_DELTA = 2000;
    const UNDO_MIN_ACTIONS = 2;
    
    let lastUndoTime = (new Date()).getTime();
    let actionsSinceUndo = 0;

    // Join any provided window options with a set of defaults.
    const windowOptions = JSHelper.mapUnite(options.windowOptions || {}, 
    {
        title: "Drawer 2D", content: "",
        minWidth: INITIAL_WIDTH, 
        minHeight: INITIAL_HEIGHT 
    });
    
    this.mainSubWindow = SubWindowHelper.create(windowOptions);
    this.mainSubWindow.enableFlex(); // Stretches elements vertically, especially the canvas.
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    // The canvas should fill the window.
    canvas.style.width = "calc(100% - 5px)"; // Subtract 5px to prevent the creation
                                             // of scrollbars.
    canvas.style.height = "auto";
    
    // Give the canvas a background, to permit visualization of the alpha channel.
    canvas.style.background = options.background 
            || "radial-gradient(rgba(255, 255, 255, 0.8), rgba(200, 200, 200, 0.6))";
    canvas.style.backgroundSize = "5px 5px";
    
    const imageCanvas = document.createElement("canvas");
    const imageCtx = imageCanvas.getContext("2d");
    
    if (options.initialImage)
    {
        imageCtx.canvas.width = options.imageWidth || options.initialImage.width;
        imageCtx.canvas.height = options.imageHeight || options.initialImage.height;
        
        try
        {
            imageCtx.drawImage(options.initialImage, 0, 0, imageCtx.canvas.width, imageCtx.canvas.height);
        }
        catch(e)
        {
            SubWindowHelper.alert("Unable to draw image", "Error: " + e + ". Proceeding.");
        }
    }
    else
    {
        imageCtx.canvas.width = options.imageWidth || INITIAL_WIDTH;
        imageCtx.canvas.height = options.imageHeight || INITIAL_HEIGHT;
    }
    
    // Get an initial transform matrix.
    let transformMatrix = Mat33Helper.getTranslateMatrix(INITIAL_VIEW_X, INITIAL_VIEW_Y);
    
    me.tools = { "Base Pen": new Drawer2DHelper.BasePen(),
                 "Custom Pen 1": new Drawer2DHelper.CustomizablePen(),
                 "Custom Pen 2": new Drawer2DHelper.CustomizablePen(),
                 "Eraser": new Drawer2DHelper.Eraser(),
                 "View Panner": new Drawer2DHelper.ViewPanner(transformMatrix),
                 "View Zoomer": new Drawer2DHelper.ViewZoomer(transformMatrix) };
    me.currentTool = me.tools["Base Pen"];
    
    // Keep track of the number of context-saves.
    let contextViewSaves = 0;
    
    let saveContextView = () =>
    {
        transformMatrix.save();
        
        contextViewSaves++;
    };
    
    let restoreContextView = () =>
    {
        if (contextSaves > 0)
        {
            transformMatrix.restore();
        
            contextViewSaves--;
        }
        else
        {
            throw "Danger! The number of cached context states is at zero (Drawer2D).";
        }
    };
    
    let resetView = () =>
    {
        // Restore until at the initial state,
        while (contextViewSaves > 0)
        {
            restoreContextView();
        }
        
        // Then save so we can restore it again.
        saveContextView();
    };
    
    //  Allow snapshots of the canvas to be stored and traversed
    // -- an implementation of undo and redo.
    
    // Filters the undo stack, removing 
    let filterUndoStack = () =>
    {
        if (undoStack.length > MAX_UNDO)
        {
            // If the undo stack is longer than expected,
            //trim it.
            let newStack = [];
            
            for (let i = undoStack.length - MAX_UNDO; i < undoStack.length; i++)
            {
                newStack.push(undoStack[i]);
            }
            
            // Swap the stacks.
            undoStack = newStack;
        }
    };
    
    // Cache a snapshot. Note that with the current implementation,
    //no compression is done and tainted canvases cannot be cached.
    let cacheState = (pushToRedoStack) =>
    {
        let imageToCache = new Image();
        
        let loaded = false;
        let onLoad = () => {};
        
        // Add the image to the undo stack after
        //it has loaded.
        imageToCache.addEventListener("load", () =>
        {
            if (pushToRedoStack)
            {
                redoStack.push(imageToCache);
            }
            else
            {
                undoStack.push(imageToCache);
            }
            
            // Filter the undo stack.
            filterUndoStack();
            
            // Note that the image has loaded.
            loaded = true;
            
            // Notify any listeners.
            onLoad(imageToCache);
        });
        
        // Set its source.
        imageToCache.src = imageCanvas.toDataURL("img/png");
        
        // Note the last cache time.
        lastUndoTime = (new Date()).getTime();
        
        let result = new Promise((resolve, reject) =>
        {
            onLoad = (imageToCache) => resolve({ image: imageToCache, dataURL: imageToCache.src });
            
            if (loaded)
            {
                onLoad(imageToCache);
            }
        });
        
        return result;
    };
    
    let performUndo = () =>
    {
        // Can we actually undo?
        if (undoStack.length == 0)
        {
            undoTab.hide();
        
            return;
        }
        
        // Take a state from the stack.
        let currentState = undoStack.pop();
        
        // Push it onto the redo stack.
        cacheState(true);
        
        // Show the redo tab.
        redoTab.show();
        
        clearCanvas(imageCtx);
        
        // Draw it onto the canvas.
        imageCtx.drawImage(currentState, 0, 0);
        
        render();
    };
    
    let performRedo = () =>
    {
        if (redoStack.length == 0)
        {
            redoTab.hide();
            
            return;
        }
        
        let newState = redoStack.pop();
        
        undoStack.push(newState);
        undoTab.show();
        
        clearCanvas(imageCtx);
        imageCtx.drawImage(newState, 0, 0);
        
        render();
    };
    
    // Push state to the undo stack, if necessary.
    let cacheStateIfNecessary = () =>
    {
        let nowTime = (new Date()).getTime();
        
        if (nowTime - lastUndoTime >= UNDO_TIME_DELTA && actionsSinceUndo >= UNDO_MIN_ACTIONS)
        {
            cacheState().then(() =>
            {
                redoStack = []; // Reset the redo stack.
                
                // Hide the redo menu.
                redoTab.hide();
                undoTab.show(); // And show the undo tab.
            });
            
            // Reset the number of actions since the last undo.
            actionsSinceUndo = 0;
        }
    };
    
    // Permit view-resetting by taking an initial snapshot of
    //the state of the context.
    saveContextView();
    cacheState();
    
    var clearCanvas = (currentCtx) =>
    {
        currentCtx = currentCtx || ctx;
        
        currentCtx.save();
        
        currentCtx.setTransform(1, 0, 0, 1, 0, 0);
        currentCtx.clearRect(0, 0, currentCtx.canvas.width, currentCtx.canvas.height);
        
        currentCtx.restore();
    };
    
    var resizePixBuffer = () =>
    {
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight)
        {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
    };
    
    var render = () =>
    {
        resizePixBuffer();
        
        clearCanvas();
        
        ctx.setTransform(transformMatrix.getAt(0, 0), transformMatrix.getAt(0, 1), 
                         transformMatrix.getAt(1, 0), transformMatrix.getAt(1, 1),
                         transformMatrix.getAt(2, 0), transformMatrix.getAt(2, 1));
        
        ctx.strokeRect(-1, -1, imageCanvas.width + 1, imageCanvas.height + 1);
        ctx.drawImage(imageCanvas, 0, 0);
    };
    
    // Create context menus.
    let fileMenu = new SubWindowTab("File");
    let editMenu = new SubWindowTab("Edit");
    let toolMenu = new SubWindowTab("Tools");
    
    // Add the commands.
    if (onSubmit)
    {
        fileMenu.addCommand("Submit", () =>
        {
            cacheState().then((data) =>
            {
                const { image, dataURL } = data;
                
                onSubmit.call(me, image, dataURL);
                me.mainSubWindow.close();
            });
        });
    }
    
    fileMenu.addCommand("Exit", () =>
    {
        me.mainSubWindow.close();
    });
    
    // Edit menu.
    var undoTab = editMenu.addCommand("Undo", () =>
    {
        performUndo();
    });
    
    var redoTab = editMenu.addCommand("Redo", () =>
    {
        performRedo();
    });
    
    // Hide the redo tab initially.
    redoTab.hide();
    
    let selectTool = function(tool)
    {
        if (me.currentTool &&
                    me.currentTool.onDeInit)
        {
            me.currentTool.onDeInit();
        }
        
        me.currentTool = tool;
        
        if (tool.onInit)
        {
            tool.onInit();
        }
    };
    
    // View Menu.
    let showControlTab, controlsWindow;
    showControlTab = toolMenu.addCommand("Show Controls Window", () =>
    {
        showControlTab.hide();
        
        controlsWindow = SubWindowHelper.create({ title: "Tools", noResize: true, alwaysOnTop: true });
        
        let handleToolButton = (toolName, tool) =>
        {
            let newButton = HTMLHelper.addButton(toolName, controlsWindow, () =>
            {
                selectTool(tool);
            });
            
            newButton.style.display = "block";
        };
        
        for (let label in me.tools)
        {
            handleToolButton(label, me.tools[label]);
        }
        
        controlsWindow.setOnCloseListener(() =>
        {
            showControlTab.show();
        });
    });
    
    // Tool menu.
    let handleToolCommand = (toolName, tool) =>
    {
        toolMenu.addCommand(toolName, () =>
        {
            selectTool(tool);
        });
    };
    
    for (let label in me.tools)
    {
        handleToolCommand(label, me.tools[label]);
    }
    
    // Tools might want to de-init/free themselves.
    //Set an onClose listener.
    me.mainSubWindow.setOnCloseListener(() =>
    {
        if (me.currentTool && me.currentTool.onDeInit)
        {
            // Notify the current tool.
            me.currentTool.onDeInit();
        }
        
        // If the controls window is open, close it.
        if (controlsWindow)
        {
            controlsWindow.close();
        }
    });
    
    // Add context menus!
    me.mainSubWindow.addTab(fileMenu);
    me.mainSubWindow.addTab(editMenu);
    me.mainSubWindow.addTab(toolMenu);
    
    // Add the canvas.
    me.mainSubWindow.appendChild(canvas);
    
    let pointerDown = false, lastX, lastY;
    
    // Configure events.
    
    let pointerStartX, pointerStartY, inverseTransform, changesMade;
    JSHelper.Events.registerPointerEvent("down", canvas, function(event)
    {
        event.preventDefault();
    
        let bbox = canvas.getBoundingClientRect();
        
        pointerStartX = event.clientX - bbox.left;
        pointerStartY = event.clientY - bbox.top;
        
        let currentPositionArray = [pointerStartX, pointerStartY, 1];
        inverseTransform = transformMatrix.getInverse();
        MatHelper.transformPoint(currentPositionArray, inverseTransform);
        
        me.currentTool.handlePointerDown(ctx, imageCtx, currentPositionArray[0], currentPositionArray[1], 0, 0);
    
        render();
        pointerDown = true;
        
        changesMade = false;
        
        lastX = pointerStartX;
        lastY = pointerStartY;
    }, false);
    
    JSHelper.Events.registerPointerEvent("move", canvas, function(event)
    {
        if (pointerDown)
        {
            event.preventDefault();
        
            let bbox = canvas.getBoundingClientRect();
            let x = event.clientX - bbox.left;
            let y = event.clientY - bbox.top;
            
                
            let currentPositionArray = [x, y, 1];
            inverseTransform = transformMatrix.getInverse();
            MatHelper.transformPoint(currentPositionArray, inverseTransform);
            
            changesMade = me.currentTool.handlePointerMove(ctx, imageCtx, currentPositionArray[0], currentPositionArray[1], x - lastX, y - lastY, (event.pressure || 0) + 0.1) || changesMade;
            
            render();
            
            lastX = x;
            lastY = y;
        }
    }, false);
    
    JSHelper.Events.registerPointerEvent("stop", canvas, function(event)
    {
        pointerDown = false;
        
        event.preventDefault();
    
        let bbox = canvas.getBoundingClientRect();
        let x = event.clientX - bbox.left;
        let y = event.clientY - bbox.top;
        
        me.currentTool.handlePointerUp(ctx, imageCtx, x, y, x - pointerStartX, y - pointerStartY);
        
        if (changesMade)
        {
            actionsSinceUndo++;
            
            cacheStateIfNecessary();
        }
    }, false);
    
    // Any async setup.
    (async () =>
    {
        // Wait for the window to resize.
        //TODO Remove magic variable.
        await JSHelper.waitFor(500);
        
        render();
    })();
}

// Define tools to be used with the Drawer2D.
var Drawer2DHelper = {}; // Make a pseudo-namespace.

Drawer2DHelper.typeHelper = { CLASS_BASE_TOOL: true, CLASS_BASE_PEN: true, 
                              CLASS_VIEW_PANNER: true, CLASS_VIEW_ZOOMER: true };

// Define base functions.
Drawer2DHelper.BaseTool = function()
{
    this.CLASS_LIST = [Drawer2DHelper.typeHelper.CLASS_BASE_TOOL];

    this.handlePointerDown = (displayCtx, drawCtx, x, y, dx, dy) =>
    {
        // Dummy function. Override this.
        throw "HandlePointerDown must be overridden (BaseTool of Drawer2DHelper).";
    };
    
    this.handlePointerMove = (displayCtx, drawCtx, x, y, dx, dy) =>
    {
        throw "HandlePointerMove was not overridden! It MUST be.";
    };
    
    // Note: Here, dx and dy are the TOTAL DELTA X/Y, from 
    //pointer down to pointer up, while this is not the case
    //for the other events.
    this.handlePointerUp = (displayCtx, drawCtx, x, y, dx, dy) =>
    {
        throw "HandlePointerUp was not overridden! Please, override this!";
    };
};

Drawer2DHelper.BasePen = function(width, color)
{
    this.__proto__ = new Drawer2DHelper.BaseTool();
    
    this.CLASS_LIST.push(Drawer2DHelper.typeHelper.CLASS_BASE_PEN);

    var me = this;
    
    me.width = width || 5;
    me.color = color || "rgba(0, 0, 0, 0.8)";
    
    this.setColor = (newColor) =>
    {
        me.color = color;
    };
    
    let lastX, lastY, vx = 0, vy = 0, 
            smoothingIterations = 10, lastTime,
            lastWeight = 0.2,
            towardsCursorRate = 0.6,
            currentX,
            currentY;
    this.handlePointerDown = (displayCtx, drawCtx, x, y, dx, dy, pressure) =>
    {
        drawCtx.beginPath();
        drawCtx.moveTo(x, y);
        
        lastX = x;
        lastY = y;
        
        currentX = x;
        currentY = y;
        
        vx = 0;
        vy = 0;
        
        lastTime = new Date().getTime();
    };
    
    this.handlePointerMove = (displayCtx, drawCtx, x, y, dx, dy, pressure) =>
    {
        let nowTime = (new Date()).getTime();
        let dt = Math.max(nowTime - lastTime, 1);
        
        dt = Math.min(dt, 100);
        
        drawCtx.save();
        
        drawCtx.lineWidth = me.width * (pressure) * 2.0; // Pressure is at 0.5 by default.
        drawCtx.strokeStyle = me.color;
        drawCtx.lineCap = "round";
        drawCtx.lineJoin = "round";
        
        let oldVx = vx;
        let oldVy = vy;
        let currentMultiplier = 0;
        
        for (let i = 0; i < smoothingIterations; i++)
        {
            let distanceFromCursor = Math.sqrt(Math.pow(x - currentX, 2) + Math.pow(y - currentY, 2));
            
            currentMultiplier = Math.min(1, lastWeight * (2 - i / smoothingIterations));
            
            vx = oldVx * currentMultiplier + ((x - lastX) * (1 - currentMultiplier) / dt + (x - currentX) / dt * towardsCursorRate) * i / smoothingIterations;
            vy = oldVy * currentMultiplier + ((y - lastY) * (1 - currentMultiplier) / dt + (y - currentY) / dt * towardsCursorRate) * i / smoothingIterations;
            
            currentX += vx * dt / smoothingIterations;
            currentY += vy * dt / smoothingIterations;
            
            drawCtx.lineTo(currentX, currentY);
        }
        
        drawCtx.stroke();

        drawCtx.restore();
        
        drawCtx.beginPath();
        drawCtx.moveTo(currentX, currentY);
        
        lastX = x;
        lastY = y;
        
        lastTime = nowTime;
        
        return true; // The view was changed.
    };
    
    this.handlePointerUp = (displayCtx, drawCtx, x, y, dx, dy) =>
    {
        // Do nothing.
    };
};

Drawer2DHelper.CustomizablePen = function(initialWidth, initialColor)
{
    const me = this;
    
    Drawer2DHelper.BasePen.call(this, initialWidth, initialColor);
    
    this.configWindow;
    
    // When this tool is selected.
    this.onInit = () =>
    {
        // Create the config window.
        me.configWindow = SubWindowHelper.create({ title: "Configure Tool", minWidth: "400px", noResize: true, alwaysOnTop: true });
        
        me.colorInput = HTMLHelper.addColorChooser(me.color, // Initial color,
                                                   me.configWindow,
                                                   (newVector, newHTMLColor) =>
        {
            me.color = newHTMLColor;
        }, undefined,
        (tabGroup) =>
        {
            let newInput = tabGroup.addTab("Width", (container) =>
            {
                container.innerHTML = "";
                
                let widthControl = HTMLHelper.addInput("Width", me.width, "range", container,
                        (newWidth) =>
                {
                    me.width = newWidth;
                });
                
                widthControl.min = 1;
                widthControl.max = 60;
                widthControl.step = 3;
            });
        });
        
        me.colorInput.style.width = "50vw";
    };
    
    this.onDeInit = () =>
    {
        me.configWindow.close();
    };
};

Drawer2DHelper.Eraser = function()
{
    const me = this;
    
    Drawer2DHelper.BaseTool.apply(this, arguments);
    
    this.handlePointerDown = function(displayCtx, drawCtx, x, y, dx, dy)
    {
        drawCtx.beginPath();
        drawCtx.moveTo(x, y);
    };
    
    this.handlePointerMove = function(displayCtx, drawCtx, x, y, dx, dy)
    {
        drawCtx.lineTo(x, y);
        
        drawCtx.save();
        drawCtx.clip();
        drawCtx.clearRect(0, 0, drawCtx.canvas.width, drawCtx.canvas.height);
        drawCtx.restore();
        
        return true; // Changes were made!
    };
    
    this.handlePointerUp = function(displayCtx, drawCtx, x, y, dx, dy)
    {
        drawCtx.beginPath();
    };
};

Drawer2DHelper.ViewPanner = function(matrixToManipulate)
{
    var me = this;
    
    Drawer2DHelper.BaseTool.apply(this, arguments);
    
    this.CLASS_LIST.push(Drawer2DHelper.typeHelper.CLASS_VIEW_PANNER);
    
    this.mat = matrixToManipulate;
    
    this.handlePointerDown = (displayCtx, drawCtx, x, y, dx, dy) =>
    {
        // Do nothing.
    };
    
    this.handlePointerMove = (displayCtx, drawCtx, x, y, dx, dy) =>
    {
        me.mat.translate([dx, dy, 1]);
    };
    
    this.handlePointerUp = (displayCtx, drawCtx, x, y, dx, dy) =>
    {
        // Do nothing.
    };
};

Drawer2DHelper.ViewZoomer = function(matrixToManipulate)
{
    var me = this;
    
    this.__proto__ = new Drawer2DHelper.BaseTool();
    this.CLASS_LIST.push(Drawer2DHelper.typeHelper.CLASS_VIEW_ZOOMER);
    
    this.mat = matrixToManipulate;
    
    
    this.handlePointerDown = (displayCtx, drawCtx, x, y, dx, dy) =>
    {
        // Do nothing.
    };
    
    this.handlePointerMove = (displayCtx, drawCtx, x, y, dx, dy) =>
    {
        let minPosition = [0, 0, 0];
        let maxPosition = [drawCtx.canvas.width, drawCtx.canvas.height, 0];
        
        let onScreenW = maxPosition[0] - minPosition[0];
        let onScreenH = maxPosition[1] - minPosition[1];
    
        me.mat.translate([-onScreenW / 2, -onScreenH / 2, 0]);
        me.mat.scalarMul(1 + Math.atan(dx + dy) / 9);
        me.mat.translate([onScreenW / 2, onScreenH / 2, 0]);
        
        // Bug fix: The HTML5 canvas does not support
        //changing the bottom row of the Mat33. Change
        //the JavaScript matrix to reflect this.
        me.mat.setAt(2, 2, 1);
        me.mat.setAt(1, 2, 0);
        me.mat.setAt(0, 2, 0);
    };
    
    this.handlePointerUp = (displayCtx, drawCtx, x, y, dx, dy) =>
    {
        // Do nothing.
    };
};

// Inserted file Renderer.js encoding='utf-8'
"use strict";

/**
 *  A simple WebGL-based rendering object. Danger! At present, 
 * each construction of a render creates a new WebGL context. Most browsers
 * limit the number of accessible contexts, so try to limit the instances of Renderer.
 * For example, rather than constructing Renderer directly, consider using
 * RendererHelper.getRenderer to get a single, global instance of Renderer
 * (this method's implementation might, however, change in the future).
 */

function Renderer(baseCanvas)
{
    var me = this;

    me.objects = {};

    me.storeObject = (objectId, object) =>
    {
        me.objects[Math.floor(objectId * 30)] = object;
    };

    me.retrieveObject = (objectId) =>
    {
        return me.objects[Math.floor(objectId * 30)];
    };

    let lastObjectId = 1;
    function ObjectData(vertexAttribs, specificAttributeData)
    {
        var parent = me;

        this.vao = vertexAttribs; // The vertex attribute array.
        this.specificAttributeData = specificAttributeData;
        this.numTriangles = 0; // The number of triangles to render.
        this.state = {}; // Any user-set information. E.g. a label.

        lastObjectId += 0.1;
        this.id = 0.95 / lastObjectId + 0.05; // Set the object's id.

        me.storeObject(this.id, this);
    }

    ObjectData.prototype.bufferData = function(attrName, data)
    {
        const buffer = this.specificAttributeData[attrName].buffer;

        vaoExtension.bindVertexArrayOES(this.vao);
        me.gl.bindBuffer(me.gl.ARRAY_BUFFER, buffer);

        let bufferObject;

        if (data.length > 0 && typeof data[0] === "number")
        {
            bufferObject = new Float32Array(data);
        }
        else if (data.length > 0 && data[0].IS_VECTOR)
        {
            bufferObject = ModelHelper.vectorArrayToFloat32Array(data);
        }

        me.gl.bufferData(me.gl.ARRAY_BUFFER, bufferObject, me.gl.STATIC_DRAW);

        // Note the number of triangles to be rendered for this object.
        if (attrName === "a_position")
        {
            this.numTriangles = Math.floor(data.length / me.attributes["a_position"]);
        }
    };

    // Load the object from a ModelHelper.Object.
    //Convenience method for calling ObjectData.bufferData
    //for each attribute of the model.
    ObjectData.prototype.fromModel = function(model)
    {
        this.bufferData("a_normal", model.getNormals());
        this.bufferData("a_position", model.getVerticies());
        this.bufferData("a_color", model.getVertexColors());
        this.bufferData("a_texCoord", model.getTexCoords());
    };

    ObjectData.prototype.bindBuffers = function()
    {
        vaoExtension.bindVertexArrayOES(this.vao);
    };

    // Store information associated with an object.
    ObjectData.prototype.attachState = function(key, newState)
    {
        this.state[key] = newState;
    };

    // Retrieve information associated with an object.
    ObjectData.prototype.retrieveState = function(key)
    {
        return this.state[key];
    };
    
    // Save stack for all uniforms.
    let uniformSaveStack = [];

    me.fovY = 70.0; // A 70.0 degree field of view.
    let lookAtPoint = new Vector3(0, 0, 0);
    let lookAtUpDirection = new Vector3(0, 0, 1);
    let cameraPosition = new Vector3(0, 0, 405);
    let lightPosition = new Vector3(1, -36, 800);

    me.zMin = 1;
    me.zMax = 4000;
    
    me.lastClear = [0, 0, 0, 1];

    me.outputCanvas = baseCanvas || document.createElement("canvas");
    me.gl = me.outputCanvas.getContext("webgl");
    
    // Enable extensions.
    const vaoExtension = me.gl.getExtension("OES_vertex_array_object");
    
    if (!vaoExtension)
    {
        throw "VAO Extension not supported!";
    }

    me.backgroundCanvas = document.createElement("canvas");
    me.backgroundCtx = me.backgroundCanvas.getContext("2d");

    me.uniforms = 
    {
       "u_shine": {},
       "u_worldMatrix": {},
       "u_worldInverseTranspose": {},
       "u_viewMatrix": {},
       "u_cameraMatrix": {},

       "u_cameraPosition": {},
       "u_lightPosition": {},
       "u_mousePosition": {},
       "u_objectId": {},
       "u_fogDecay": {},
       "u_fogColor": {},
       "u_tint": {}
    };

    me.attributes =
    {
        "a_position": 3,
        "a_normal": 3,
        "a_color": 3,
        "a_texCoord": 2
    };

    const vertexShaderSource =
    `
    attribute vec4 a_position;
    attribute vec3 a_normal;
    attribute vec3 a_color;
    attribute vec2 a_texCoord;

    uniform mat4 u_worldMatrix;
    uniform mat4 u_worldInverseTranspose; // For normal calculation with stretched objects.
    uniform mat4 u_viewMatrix;
    uniform mat4 u_cameraMatrix;

    uniform vec3 u_cameraPosition;
    uniform vec3 u_lightPosition;
    uniform vec2 u_mousePosition;

    varying vec3 v_color;
    varying vec3 v_toCamera;
    varying vec3 v_toLight;
    varying vec3 v_normal;
    varying vec2 v_texCoord;
    varying vec2 v_mousePosition;

    void main()
    {
        gl_Position = u_viewMatrix * u_cameraMatrix * u_worldMatrix * a_position;

        vec4 worldPosition = u_worldMatrix * a_position;

        v_color = a_color;
        v_toLight = (vec4(u_lightPosition, 1.0) - worldPosition).xyz;
        v_toCamera = (vec4(u_cameraPosition, 1.0) - worldPosition).xyz;

        v_normal = mat3(u_worldInverseTranspose) * a_normal.xyz; // TODO: Review the math for this.

        v_texCoord = a_texCoord;
        v_mousePosition = u_mousePosition;
    }
    `;

    const fragmentShaderSource = 
    `
    precision highp float;

    uniform float u_shine;
    uniform sampler2D u_texture;
    uniform float u_objectId;
    uniform float u_fogDecay;
    uniform vec3 u_fogColor;
    uniform vec3 u_tint;

    varying vec3 v_color;
    varying vec3 v_toLight;
    varying vec3 v_toCamera;
    varying vec3 v_normal;
    varying vec2 v_texCoord;
    varying vec2 v_mousePosition;

    void main()
    {
        vec2 toMouse = gl_FragCoord.xy - v_mousePosition;

        if (toMouse.x < 3.0 && toMouse.x >= -1.0 && abs(toMouse.y) < 4.0)
        {
            gl_FragColor = vec4(v_texCoord.x, v_texCoord.y, u_objectId, 1.0);

            return;
        }
        else if (toMouse.x < -1.1 && toMouse.x > -5.0 && abs(toMouse.y) < 3.0)
        {
            gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);

            return;
        }

        vec3 resultantColor = (v_color + texture2D(u_texture, v_texCoord).xyz) / 2.0; // vec3(v_texCoord.x, 0, v_texCoord.y);

        vec3 normal = normalize(v_normal);
        vec3 toLight = normalize(v_toLight);
        vec3 toCamera = normalize(v_toCamera);
        
        vec3 halfVector = normalize(toLight + toCamera); // The vector between the light and camera.
                                                         //This vector's angle from the camera determines
                                                         //the specular lighting amount.

        float lighting = dot(normal, toLight); // By Lambert's Cosine Law.

        float specular = dot(halfVector, toCamera);

        // If specular lighting should be applied,
        //make it bright!
        if (lighting > 0.0 && specular > 0.0)
        {
            specular = pow(specular, u_shine);
        }
        else
        {
            specular = 0.0;
        }

        resultantColor += u_tint;

        resultantColor += specular;
        resultantColor *= lighting;

        float fogAmount = pow((gl_FragCoord.z + 1.0) / 2.0, u_fogDecay);

        resultantColor = resultantColor * (1.0 - fogAmount) + u_fogColor * fogAmount;

        gl_FragColor = vec4(resultantColor, 1.0);
    }
    `;

    const compileShader = (shaderSource, shaderType) =>
    {
        const shader = me.gl.createShader(shaderType);

        me.gl.shaderSource(shader, shaderSource);

        me.gl.compileShader(shader);

        // Check compile status.
        if (me.gl.getShaderParameter(shader, me.gl.COMPILE_STATUS))
        {
            return shader; // Return the shader on successful compile.
        } // On error,
        else
        {
            // Get the error message.
            const errorMessage = me.gl.getShaderInfoLog(shader);

            // Delete the shader.
            me.gl.deleteShader(shader);

            // Inform the user (or probably just the programmer
            //who is debugging this).
            throw errorMessage;
        }
    };

    const linkProgram = (vertexShader, fragmentShader) =>
    {
        const program = me.gl.createProgram();

        me.gl.attachShader(program, vertexShader);
        me.gl.attachShader(program, fragmentShader);

        me.gl.linkProgram(program); // Link the shaders into a program.

        // Check whether the linking was successful.
        if (me.gl.getProgramParameter(program, me.gl.LINK_STATUS))
        {
            return program; // The program was linked successfully.
        }
        else
        { // Otherwise, inform whoever is debugging the program (or a catch statement)
            // of the error by throwing it.
            const errorText = me.gl.getProgramInfoLog(program);

            // Remove the program (RAII).
            me.gl.deleteProgram(program);

            // Throw the error.
            throw errorText;
        }
    };

    const makeTexture = () =>
    {
        let texture = me.gl.createTexture();

        me.gl.bindTexture(me.gl.TEXTURE_2D, texture);

        // Disable mip-mapping.
        //Note that the S and T notation is from the use of
        //s, t, u, v, for x, y, z, w when using textures.
        //This is why many call texture coordinates "UVs."
        me.gl.texParameteri(me.gl.TEXTURE_2D, me.gl.TEXTURE_WRAP_S, me.gl.CLAMP_TO_EDGE); // Don't tile (x direction).
        me.gl.texParameteri(me.gl.TEXTURE_2D, me.gl.TEXTURE_WRAP_T, me.gl.CLAMP_TO_EDGE); // Y-direction.

        // Just use the nearest mip (there should only be one.
        me.gl.texParameteri(me.gl.TEXTURE_2D, me.gl.TEXTURE_MAG_FILTER, me.gl.NEAREST);
        me.gl.texParameteri(me.gl.TEXTURE_2D, me.gl.TEXTURE_MIN_FILTER, me.gl.NEAREST);
    };

    // Compile and link the program to be used
    //by the renderer.
    const makeProgram = () =>
    {
        const vertexShader = compileShader(vertexShaderSource, me.gl.VERTEX_SHADER);
        const fragmentShader = compileShader(fragmentShaderSource, me.gl.FRAGMENT_SHADER);
        
        const program = linkProgram(vertexShader, fragmentShader);

        me.program = program;

        me.gl.useProgram(program);

        return true;
    };

    // Find the locations of the uniforms
    const findUniforms = () =>
    {
        for (var uniformName in me.uniforms)
        {
            me.uniforms[uniformName] =
            {
                location: me.gl.getUniformLocation(me.program, uniformName)
            };
        }
    };

    // Update a uniform's value. Note: If the 
    //uniform does not exist, this can throw an error.
    const updateUniform = (name, newValue) =>
    {
        if (typeof name === "string") // If a map key.
        {
            me.uniforms[name].setTo(newValue);
        }
        else // If an entry in the map...
        {
            name.setTo(newValue);
        }
    };

    const setUp = () =>
    {
        var gl = me.gl;

        makeProgram();
        findUniforms();

        makeTexture();

        const handleUniform = (name, setFunction, defaultValue, transformInput) =>
        {
            transformInput = transformInput || ((input) => input);

            me.uniforms[name].setTo = (newValue) =>
            {
                setFunction.call(me, me.uniforms[name].location, transformInput(newValue));
                me.uniforms[name].value = newValue;
            };

            if (defaultValue)
            {
                me.uniforms[name].setTo(defaultValue);
            }
        };

        me.worldMatrix = new Mat44();
        me.worldMatrix.rightMulTransform = false;

        me.cameraMatrix = new Mat44();
        me.viewMatrix = new Mat44();

        me.worldMatrix.toIdentity();
        me.cameraMatrix.toIdentity();
        me.viewMatrix.toIdentity();


        handleUniform("u_shine", (location, setTo) => gl.uniform1f(location, setTo), 50000.0);

        const generalMatrixSetFunction = (location, values) => gl.uniformMatrix4fv(location, false, values); // DO transpose.
        const matrixTransformInput = (input) => input.getTranspose().getArray();
        const matrixTransformInputNoTranspose = (input) => input.getArray();

        handleUniform("u_worldMatrix", generalMatrixSetFunction,
                me.worldMatrix, matrixTransformInput);
        
        handleUniform("u_cameraMatrix", generalMatrixSetFunction,
                me.cameraMatrix, matrixTransformInput);

        handleUniform("u_viewMatrix", generalMatrixSetFunction,
                me.viewMatrix, matrixTransformInput);

        handleUniform("u_worldInverseTranspose", generalMatrixSetFunction,
                me.worldMatrix.getInverse(), matrixTransformInputNoTranspose);

        const vector3SetFunction = (location, values) => gl.uniform3fv(location, values);
        const vector2SetFunction = (location, values) => gl.uniform2fv(location, values);

        const vector3TransformInput = (values) => [values.x, values.y, values.z];
        const vector2TransformInput = (values) => [values.x, values.y];

        handleUniform("u_cameraPosition", vector3SetFunction, cameraPosition, vector3TransformInput);
        handleUniform("u_lightPosition", vector3SetFunction, lightPosition, vector3TransformInput);
        handleUniform("u_mousePosition", vector2SetFunction, new Vector3(-100, -100), vector2TransformInput); // Initially offscreen.
        handleUniform("u_objectId", (location, value) => gl.uniform1f(location, value));
        handleUniform("u_fogDecay", (location, value) => gl.uniform1f(location, value), 10000.0); // Set the default fog amount.
        
        handleUniform("u_fogColor", (location, values) =>
        {
            me.setClearColor([values[0], values[1], values[2], me.lastClear[3] || 1.0]);
            
            vector3SetFunction(location, values);
        }, new Vector3(0, 0, 0), vector3TransformInput);
        
        handleUniform("u_tint", vector3SetFunction, new Vector3(0, 0, 0), vector3TransformInput);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        me.updateViewIfNeeded(100, 100, true);

        me.setCameraPosition(0, 0, 405);
        me.setLookAtLocation(12, 0, 10);
        

        me.updateCamera();
    };

    const resizeBackgroundCanvasIfNecessary = () =>
    {
        if (me.backgroundCanvas.width !== me.outputCanvas.width
            || me.backgroundCanvas.height !== me.outputCanvas.height)
        {
            me.backgroundCanvas.width = me.outputCanvas.width;
            me.backgroundCanvas.height = me.outputCanvas.height;

            return true;
        }

        return false;
    };

    me.registerObject = () =>
    {
        var gl = me.gl;

        // Stores data associated with the object.
        const vertexAttribsCollection = vaoExtension.createVertexArrayOES();
        vaoExtension.bindVertexArrayOES(vertexAttribsCollection);

        let specificAttributeData = {};

        const handleAttr = (name, size) =>
        {
            specificAttributeData[name] = {};

            const location = gl.getAttribLocation(me.program, name);
            const buffer = gl.createBuffer();

            specificAttributeData[name].location = location;
            specificAttributeData[name].buffer = buffer;

            // We will be using this buffer, for now.
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

            // Enable it.
            gl.enableVertexAttribArray(location);

            // Tell WebGL how to retrieve data from this buffer,
            //we assume it contains floats.
            gl.vertexAttribPointer(location, size, // size elements/calling.
                    gl.FLOAT,
                    false, // We're not going to normalize.
                    0, 0); // No stride and no offset.

            // We buffer the data when the client requests it.
        };

        for (var attributeName in me.attributes)
        {
            handleAttr(attributeName, me.attributes[attributeName]);
        }

        // Allow rapid switching between objects.
        return new ObjectData(vertexAttribsCollection, specificAttributeData);
    };

    // Set the tint -- a color added to the existing color of
    //an object.
    me.setTint = (newTint) =>
    {
        updateUniform(me.uniforms.u_tint, newTint);
    };
    
    // Set the shinyness of objects displayed!
    me.setShine = (newShine) =>
    {
        updateUniform(me.uniforms.u_shine, newShine);
    };

    // Set the clear and fog colors. Takes a vec3.
    me.setFogColor = (newColor) =>
    {
        updateUniform(me.uniforms.u_fogColor, newColor);
    };
    
    // Sets the clear color, but NOT the fog color.
    //Takes an array of components [r, g, b, a].
    me.setClearColor = (newColor) =>
    {
        me.gl.clearColor(newColor[0], newColor[1], newColor[2], newColor[3]);
        me.lastClear = newColor;
    };

    // Change how rapidly objects moving into the background
    //become obscured by a fog. Greater input, more sudden
    //change. Note: This depends on the maximum z.
    me.setFogDecay = (newFogDecay) =>
    {
        updateUniform(me.uniforms.u_fogDecay, newFogDecay);
    };

    me.setTexture = (image) =>
    {
        me.gl.texImage2D(me.gl.TEXTURE_2D, 0, // level
            me.gl.RGBA, // Internal format
            me.gl.RGBA, // External format
            me.gl.UNSIGNED_BYTE, // Data type
            image);
    };

    const setObjectId = (objectData) =>
    {
        updateUniform(me.uniforms.u_objectId, objectData.id);
    };

    me.setMousePosition = (position) =>
    {
        updateUniform(me.uniforms.u_mousePosition, position);
    };

    /*
        Get information about the objects interacting with
        the mouse. 
        Pre: setMousePosition was called before the last
            render.
        Post: Some information about the mouse's position
            is returned. Note that performance has been
            traded for reliability -- this method is
            not reliable.
    */
    me.getMouseAttributes = () =>
    {
        resizeBackgroundCanvasIfNecessary();

        me.display(me.backgroundCtx);

        var imageData = me.backgroundCtx.getImageData(0, 0, me.backgroundCanvas.width, me.backgroundCanvas.height);
        var data = imageData.data; // The raw data to be searched.
        var countPrior = 0;

        var result = {};

        for (var i = 0; i < data.length; i += 4)
        {
            if (data[i] <= 1 && data[i + 1] >= 254 && data[i + 2] <= 1)
            {
                countPrior ++;
            }
            else if (countPrior > 2 && data[i + 2] > 10)
            {
                result.texCoordX = data[i] / 256;
                result.texCoordY = data[i + 1] / 256;
                result.objectId = data[i + 2] / 256;

                result.selectedObject = me.retrieveObject(result.objectId);

                break;
            }
            else
            {
                countPrior --;

                countPrior = Math.max(countPrior, 0);
            }
        }

        return result;
    };

    me.setCameraPosition = function(x, y, z)
    {
        // If given a vector3, handle it.
        if (typeof x === "object")
        {
            cameraPosition.x = x.x;
            cameraPosition.y = x.y;
            cameraPosition.z = x.z;
        }
        else
        {
            cameraPosition = new Vector3(x, y, z);
        }

        updateUniform(me.uniforms.u_cameraPosition, cameraPosition);
    };

    me.setLightPosition = function(x, y, z)
    {
        if (typeof x === "object")
        {
            lightPosition.x = x.x;
            lightPosition.y = x.y;
            lightPosition.z = x.z;
        }
        else
        {
            lightPosition = new Vector3(x, y, z);
        }

        updateUniform(me.uniforms.u_lightPosition, lightPosition);
    }

    me.setLookAtLocation = function(x, y, z)
    {
        // TODO: Remove code duplication with
        //setCameraPosition.
        if (typeof x === "object")
        {
            lookAtPoint.x = x.x;
            lookAtPoint.y = x.y;
            lookAtPoint.z = x.z;
        }
        else
        {
            lookAtPoint = new Vector3(x, y, z);
        }
    };

    me.updateCamera = function()
    {
        me.cameraMatrix = Mat44Helper.createLookAtMatrix(cameraPosition, lookAtPoint, lookAtUpDirection);

        me.updateCameraUniform();
    };
    
    // Update the camera, but JUST THE UNIFORM.
    me.updateCameraUniform = () =>
    {
        updateUniform(me.uniforms.u_cameraMatrix, me.cameraMatrix);
    };
    
    // Push the state of all uniforms associated with
    //the renderer onto a stack.
    me.saveUniforms = function()
    {
        let saveEntry = {};
        
        // Put each value into the save object.
        for(var uniformName in me.uniforms)
        {
            saveEntry[uniformName] = me.uniforms[uniformName].value;
        }
        
        // Push the save object.
        uniformSaveStack.push(saveEntry);
        
        // If the uniform save stack is getting long, post a warning.
        // For now, warn at 50,000 entries.
        if (uniformSaveStack.length > 50000)
        {
            console.warn("The uniform save stack is getting long... Potential leak.");
        }
    };
    
    // Pop the last saved state containing all uniforms
    //from the relevant stack. This should be FAST and not
    //perform any unneeded updates.
    me.restoreUniforms = function()
    {
        // If we can actually pop,
        if (uniformSaveStack.length > 0)
        {
            let lastEntry = uniformSaveStack.pop();
            
            // Update every uniform.
            for (var uniformName in lastEntry)
            {
                // First, though, check whether we need to update it.
                if (me.uniforms[uniformName].value != lastEntry[uniformName])
                {
                    me.uniforms[uniformName].setTo(lastEntry[uniformName]);
                }
            }
        }
    };

    me.updateViewIfNeeded = (width, height, force) =>
    {
        var gl = me.gl;

        if (me.outputCanvas.width !== width || me.outputCanvas.height !== height || force)
        {
            me.outputCanvas.width = width || 1; // Don't go to zero.
            me.outputCanvas.height = height || 1;

            var aspect = gl.drawingBufferHeight / gl.drawingBufferWidth;
            var fovY = me.fovY / 180.0 * Math.PI;
            
            me.viewMatrix = Mat44Helper.frustumViewMatrix(aspect, fovY, me.zMin, me.zMax);
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

            updateUniform(me.uniforms.u_viewMatrix, me.viewMatrix);
        }
    };

    me.setZMax = (newZMax) =>
    {
        me.zMax = newZMax;

        me.updateViewIfNeeded(me.outputCanvas.width, me.outputCanvas.height, true);
    };

    me.updateWorldMatrix = () =>
    {
        updateUniform(me.uniforms.u_worldMatrix, me.worldMatrix);
        updateUniform(me.uniforms.u_worldInverseTranspose, me.worldMatrix.getInverse());
    };

    me.render = function(objectData)
    {
        objectData.bindBuffers();
        setObjectId(objectData);

        me.gl.drawArrays(me.gl.TRIANGLES, 0, objectData.numTriangles);
    };
    
    // Get the canvas to which this renderer outputs.
    //Note: This can be dangerous if the renderer
    //is shared with other clients. Intended for use
    //with pseudo-reflections.
    me.getOutputCanvas = function()
    {
        return me.outputCanvas;
    };

    me.clear = function()
    {
        me.gl.clear(me.gl.COLOR_BUFFER_BIT | me.gl.DEPTH_BUFFER_BIT);
    };

    me.display = function(ctx2D)
    {
        ctx2D.drawImage(me.gl.canvas, 0, 0);
    };

    setUp();
}

// Define a helper object for the creation and management of rendering objects.
const RendererHelper = {};

// A dictionary containing cached renderers specific to canvases. These renderers are to be
//used for rapid rendering. For example, a background that must update as the user scrolls.
RendererHelper.rapidRenderers = {};

// Get a potentially-shared instance of a renderer.
//Consider using this instead of constructing a single renderer.
//DANGER! If the size of the requested canvas changes frequently,
//this could be slow. (TODO Time it).
RendererHelper.getRenderer = () =>
{
    if (!RendererHelper.renderer)
    {
        RendererHelper.renderer = new Renderer();
    }
    
    return RendererHelper.renderer;
};

// Get a renderer specific to a canvas.
//A canvas element must be given -- the renderer
//will use it directly (instead of writing it
//onto a background canvas first).
// If an identifier is given, it will be used to hash
//the renderer. Otherwise, all calls to getRapidRenderer
//for a given canvas will return new Renderer objects.
//Beware!
RendererHelper.getRapidRenderer = (canvas, canvasId) =>
{
    let result = (canvasId !== undefined && RendererHelper.rapidRenderers[canvasId])
                    ? RendererHelper.rapidRenderers[canvasId]
                    : new Renderer(canvas); 

    if (canvasId !== undefined && !RendererHelper.rapidRenderers[canvasId])
    {
        RendererHelper.rapidRenderers[canvasId] = canvas;
    }

    return result;
};

// Inserted file ModelHelper.js encoding='utf-8'
"use strict";

var ModelHelper = {};

/*
 Compute normals for a given set of verticies. Normals
 will be set to the average of all at the edge of each
 face.
 
 As in interfaces used to connect to WebGL, the stride
 is the number of components of verticies to be considered
  at a time. NOTE: THIS MUST BE GREATER THAN OR EQUAL TO NINE.
   If greater, only the first three components of each vertex
 will be used to compute normals (the cross product is used).
 Verticies are grouped into triangles with each vertex starting at
 CURRENT_INDEX + FLOOR(stride / 3). Please note that the stride should
 be equal to the number of components of verticies per triangle on the object.
*/
ModelHelper.computeNormals = function(verticies, tolerance, stride, offset)
{
    // Set default values.
    if (tolerance === undefined)
    {
        tolerance = 1.0;
    }
    
    stride = stride || 9;
    offset = offset || 0;
    
    // Check for out-of-bounds offset/stride.
    if (stride < 9 || stride > verticies.length)
    {
        throw "Invalid stride: " + stride + ". !(stride >= 9 && stride <= (verticies.length = " + verticies.length + ") ) is true.";
    }
    else if (offset < 0 || offset >= verticies.length)
    {
        throw "Invalid offset of " + offset + ". Offset must be >= 0 and <= verticies.length. Verticies.length is " + verticies.length;
    }
    
    // Get a 3D point from the verticies
    //array at an index. A Vector3 is 
    //used rather than a Point to allow
    //usage of subtract.
    var getPoint = function(index)
    {
        var result = new Vector3(verticies[index], verticies[index + 1], verticies[index + 2]);
        
        return result;
    };
    
    var getMapKey = function(point)
    {
        return point.asRounded(3).toString();
    };
    
    // Note the existence of a normal at a given point.
    var noteNormalExistence = function(point, normal)
    {
        // If the tolerance is one, DO NOT DO THIS.
        if (tolerance === 1.0)
        {
            return;
        }
        
        var mapKey = getMapKey(point);
        
        // If this is the first time the vertex has been recorded in the map,
        //create the array.
        if (coordinateToNormalMap[mapKey] == undefined)
        {
            coordinateToNormalMap[mapKey] = [];
        }
        
        coordinateToNormalMap[mapKey].push(normal);
    };
    
    // Get the averaged normal for a point.
    //If the dot product's absolute value is
    //greater than the tolerance, do not average.
    //NOTE: THIS MUST BE CALLED AFTER POPULATING
    //THE COORDINATETONORMALMAP.
    var getAveragedNormal = function(point, normal)
    {
        // If the tolerance is one, just return the normal.
        if (tolerance === 1.0)
        {
            return normal;
        }
        
        // Otherwise, find similar normals within |cos(dtheta)| <= tolerance.
        var mapKey = getMapKey(point);
        var surroundingNormals = coordinateToNormalMap[mapKey] || [];
        var normalsToAverage = [];
        
        for (var i = 0; i < surroundingNormals.length; i++)
        {
            if (surroundingNormals[i] !== normal && normal.dot(surroundingNormals[i]) >= tolerance)
            {
                normalsToAverage.push(surroundingNormals[i]);
            }
        }
        
        var result = normal;
        
        // Average all acceptable normals.
        //Note that division does not occur
        //until after the summation, leaving 
        //result inaccurate until normalization
        //occurs. Normalization has been added.
        for (var j = 0; j < normalsToAverage.length; j++)
        {
            result.addAndSet(normalsToAverage[j]);
        }
        
        result.normalize();
        
        return result;
    };
    
    // Compute the normal vector for a single point
    //on a triangle.
    var getNormal = function(triangleStart, considerIndexStart)
    {
        // Find the current point.
        var current = getPoint(considerIndexStart);
        
        // Find the two points.
        var triangleVertexIndex = (considerIndexStart - triangleStart) / elementsPerVertex;
        
        //console.log("Vertex: " + triangleVertexIndex);
        
        // Determine the indicies of the other points.
        var other1Index = ((triangleVertexIndex + 1) % 3) * elementsPerVertex + triangleStart;
        var other2Index = ((triangleVertexIndex + 2) % 3) * elementsPerVertex + triangleStart;
        
        // Actually access and store the points.
        var other1 = getPoint(other1Index);
        var other2 = getPoint(other2Index);
        
        // Find the vectors from the current point to the other two.
        var to1 = current.subtract(other1);
        var to2 = current.subtract(other2);
        
        // Cross to1 and to2 to find a vector perpindicular to
        //both. TODO Ensure this vector is in the correct direction.
        var normal = to1.cross(to2);
        
        // Normalize the normal.
        normal.normalize();
        
        //console.log(considerIndexStart + ", " + other1Index + ", " + other2Index 
        //        + " => (" + to1.toString() + "; " + to2.toString() + ") => " + normal.toString());
        
        // Note the normal's existance.
        noteNormalExistence(current, normal);
        
        return normal;
    };
    
    // Prepare output.
    var normals = [];
    var elementsPerVertex = Math.floor(stride / 3);
    var componentIndex = 0;
    
    // We need to be able to average the normals at each point...
    var coordinateToNormalMap = {};
    
    // Ensure we stop computation of normals before an error
    //involving array indicies occurs.
    for (var i = offset; i < verticies.length; i += stride)
    {
        for (componentIndex = 0; componentIndex < stride; componentIndex += elementsPerVertex)
        {
            normals.push(getNormal(i, componentIndex + i));
        }
    }
    
    // If tolerance is not one,
    if (tolerance !== 1.0)
    {
        var unaveragedNormals = normals;
        var averagedNormals = [];
        
        // Average normals, if necessary.
        for (var i = 0; i < unaveragedNormals.length; i++)
        {
            averagedNormals.push
            (
                getAveragedNormal
                (
                    getPoint(i * elementsPerVertex), 
                    unaveragedNormals[i]
                )
            );
        }
        
        normals = averagedNormals;
    }
    
    return normals;
};

/*
    Convert an array of Vector3 objects into a
    Float32Array with three elements per vector.
*/
ModelHelper.vectorArrayToFloat32Array = function(vectorArray)
{
    var result = [];
    
    for (var i = 0; i < vectorArray.length; i++)
    {
        result.push(vectorArray[i].x);
        result.push(vectorArray[i].y);
        result.push(vectorArray[i].z);
    }
    
    return new Float32Array(result);
};

/*
    Connect a set of points, forming verticies.
    Given points must be grouped as an array of columns
    (or rows, depending on the viewpoint) that form
    the object.
*/
ModelHelper.connectVerticies = function(verticies)
{
    var result = [];
    
    // Fix a point's location on the result.
    //Appends point to result.
    var fixPoint = function(point)
    {
        result.push(point.x);
        result.push(point.y);
        result.push(point.z);
    };
    
    var connectQuad = function(point1, point2, point3, point4)
    {
        fixPoint(point1);
        fixPoint(point3);
        fixPoint(point2);
        
        fixPoint(point2);
        fixPoint(point3);
        fixPoint(point4);
    };
    
    var previousRowIndex = verticies.length - 1;
    var j;
    
    var currentRow, previousRow;
    
    // For every row of verticies,
    for (let i = 0; i < verticies.length; i++)
    {
        currentRow = verticies[i];
        previousRow = verticies[previousRowIndex];
        
        // Connect the two rows.
        for (j = 0; j < currentRow.length - 1; j ++)
        {
            connectQuad(previousRow[j], previousRow[j + 1], currentRow[j], currentRow[j + 1]);
        }
        
        previousRowIndex = i;
    }
    
    return result;
};

/*
    Create a solid of revolution with plane-points given by silhouettePoints.
    Returns a contiguous array of floats, 3 elements per vertex.
*/
ModelHelper.silhouetteToVerticies = function(silhouettePoints, startAngle, endAngle, divisions)
{
    // Default values.
    divisions = divisions || 8;
    
    // The rotation matrix.
    var rotationMatrix = new Mat44();
    rotationMatrix.toIdentity();
    rotationMatrix.rotateY(startAngle);
    
    //console.log(rotationMatrix.toString());
    
    var deltaTheta = (endAngle - startAngle) / divisions;
    //console.log("dtheta: " + deltaTheta);
    
    
    var verticies = [];
    var currentRow = [];
    
    var i, currentPoint;
    
    for (var theta = startAngle; theta <= endAngle; theta += deltaTheta)
    {
        currentRow = [];
        
        for (i = 0; i < silhouettePoints.length; i++)
        {
            // Make a copy of the point to prevent modification of the
            //silhouette itself.
            currentPoint = new Vector3(silhouettePoints[i].x || 0, silhouettePoints[i].y || 0, silhouettePoints[i].z || 0);
            
            currentPoint.transformBy(rotationMatrix);
            
            currentRow.push(currentPoint);
        }
        
        verticies.push(currentRow);
        
        rotationMatrix.rotateY(deltaTheta);
    }
    
    let connectedResult = ModelHelper.connectVerticies(verticies);
    
    return connectedResult;
};

/*
    Extrude a silhouette.
*/
ModelHelper.extrude = function(silhouette, extrudeDirection, noCap, capResolution)
{
    var partitions = []; // Not the best variable name...
    var subCaps = [];
    var part, j;
    
    var currentPosition;
    var averagePosition = { x: 0, y: 0, z: 0 };
    
    if (!noCap)
    {
        let leftmostExtreme = 0;
        
        subCaps.push([]);
    
        for (var i = 0; i < silhouette.length; i++)
        {
            averagePosition.x += silhouette[i].x || 0;
            averagePosition.y += silhouette[i].y || 0;
            averagePosition.z += silhouette[i].z || 0;
        }
        
        averagePosition.x /= silhouette.length;
        averagePosition.y /= silhouette.length;
        averagePosition.z /= silhouette.length;
        
        averagePosition = new Vector3(averagePosition.x, averagePosition.y, averagePosition.z);
        
        if (capResolution !== 0)
        {
            var centeredCurrent;
            for (i = 0; i < silhouette.length; i++)
            {
                centeredCurrent = new Vector3(silhouette[i].x || 0, silhouette[i].y || 0, silhouette[i].z || 0);
                centeredCurrent.subtractAndSet(averagePosition);
                
                if (centeredCurrent.x < leftmostExtreme || i === 0)
                {
                    leftmostExtreme = centeredCurrent.x;
                }
                
                subCaps[0].push(centeredCurrent);
            }
            
            var newSubCap = [];
            var wantedX;
            var totalDeltaX = -leftmostExtreme;
            var multiplier = 1;
            
            // For every resolution level,
            for (i = 1; i < capResolution && leftmostExtreme < 0; i++)
            {
                wantedX = totalDeltaX / capResolution * i;
                multiplier = Math.abs(wantedX / leftmostExtreme);
                
                newSubCap = [];
                
                // For every sub-point,
                for (j = 0; j < subCaps[i - 1].length; j++)
                {
                    newSubCap.push(subCaps[i - 1][j].multiplyScalar(multiplier));
                }
                
                subCaps.push(newSubCap);
                
                leftmostExtreme *= multiplier;
            }
        }
    }
    
    for (var i = 0; i < silhouette.length; i++)
    {
        currentPosition = new Vector3(silhouette[i].x || 0, silhouette[i].y || 0, silhouette[i].z || 0);
        
        part = [];
        
        if (!noCap && capResolution === 0)
        {
            part.push(averagePosition);
        }
        else if (!noCap)
        {
            for (j = 1; j < subCaps.length; j++)
            {
                part.push(averagePosition.add(subCaps[j][i]));
            }
            
            part.push(averagePosition);
        }
        
        part.push(currentPosition);
        part.push(currentPosition.add(extrudeDirection));
        
        if (!noCap && capResolution === 0)
        {
            part.push(averagePosition.add(extrudeDirection));
        }
        else if (!noCap)
        {
            for (j = 1; j < subCaps.length; j++)
            {
                part.push(averagePosition.add(extrudeDirection).add(subCaps[j][i]));
            }
            
            part.push(averagePosition.add(extrudeDirection));
        }
        
        partitions.push(part);
    }
    
    let result = ModelHelper.connectVerticies(partitions);
    
    return result;
};

/*
    Get suitable texture coordinates for a set of given
    verticies.
*/
ModelHelper.getTexCoords = (verticies, componentsPerVertex) =>
{
    let result = [];

    if (!componentsPerVertex)
    {
        // Attempt to infer the number of components per
        //vertex.

        if (verticies.length % 3 === 0)
        {
            componentsPerVertex = 3;
        }
        else if (verticies.length % 4 === 0)
        {
            componentsPerVertex = 4;
        }
        else
        {
            componentsPerVertex = 2;
        }
    }

    // Get the contents of a vertex
    //as a Vector3.
    const getVertex = (startIndex) =>
    {
        // Find the contents of each component.
        let x = verticies[startIndex],
            y = verticies[startIndex + 1],
            z = 0; // Default to the plane for which z = 0.
        
        // If a z-component could exist, find it.
        if (componentsPerVertex >= 3)
        {
            z = verticies[startIndex + 2];
        }

        // Return a vector with the found components.
        return new Vector3(x, y, z);
    };

    const handleTriangle = (startIndex) =>
    {
        // Determine the triangle's corners.
        const corners = 
        [
            getVertex(startIndex),
            getVertex(startIndex + componentsPerVertex),
            getVertex(startIndex + componentsPerVertex * 2)
        ];

        // Turn these vectors from the origin into 
        //vectors from the first vertex.
        corners[1] = corners[1].subtract(corners[0]);
        corners[2] = corners[2].subtract(corners[0]);
        corners[0] = new Vector3(0, 0, 0);

        // Ensure that the greatest of these vectors'
        //components are being used...
        // Note that the corners were copied through
        //subtraction above, so this should be safe.
        corners[1].y = Math.max(Math.abs(corners[1].z), Math.abs(corners[1].y));
        corners[2].y = Math.max(Math.abs(corners[2].z), Math.abs(corners[2].y));
        corners[1].x = Math.max(Math.abs(corners[1].z), Math.abs(corners[1].x));
        corners[2].x = Math.max(Math.abs(corners[2].z), Math.abs(corners[2].x));

        // Make normalization work correctly.
        corners[1].z = 0;
        corners[2].z = 0;

        // Normalize these vectors.
        corners[1].normalize();
        corners[2].normalize();

        let runNext = false;

        // Absolute value all components.
        for (let i = 1; i < corners.length; i++)
        {
            corners[i].x = Math.abs(corners[i].x);
            corners[i].y = Math.abs(corners[i].y);

            // Check for zero vectors.
            if (corners[i].x < 0.3 && corners[i].y < 0.3 || runNext)
            {
                corners[i].x = 1.0 * Math.floor(i / 2);
                corners[i].y = 1.0 * Math.floor(2 / i);

                runNext = true;
            }
        }

        if (corners[1].x === corners[2].x)
        {
            corners[1].x = 1.0;
            corners[2].x = 0.5;
        }

        if (corners[1].y === corners[2].y)
        {
            corners[1].y = 0.5;
            corners[2].y = 1.0;
        }

        // Store the length of the result,
        //before adding texture-coordinates.
        const oldLength = result.length;

        // Add these segments to the result.
        result.push(0.0);//corners[0].x);
        result.push(0.0);//corners[0].y);
        result.push(corners[1].x);
        result.push(corners[1].y);
        result.push(corners[2].x);
        result.push(corners[2].y);

        // Make sure the values just added are positive.
        for (let i = result.length - 1; i > oldLength; i--)
        {
            result[i] = Math.abs(result[i]);
        }
    };

    // For now, assume we are working with triangles.
    for (let i = 0; i < verticies.length; i += componentsPerVertex * 3)
    {
        handleTriangle(i);
    }

    return result;
};

// Pre-created objects.
ModelHelper.Objects = {};

/**
 *    Registers an object from an STL ASCII file.
 * Format Ref: https://en.wikipedia.org/wiki/STL_(file_format)
 * 
 */
ModelHelper.Objects.registerFromSTL = function(key, stlText)
{
    // Check for a valid header.
    if (stlText.indexOf("solid ") !== 0)
    {
        throw "Invalid STL header.";
    }
    
    let verticies = [];
    let normals = [];
    
    let recomputeNormals = false;
    
    // Tokenizes a line.
    let tokenize = (lineContent) =>
    {
        let result = [];
        let parts = lineContent.split(" ");
        
        for (let i = 0; i < parts.length; i++)
        {
            if (parts[i].length > 0)
            {
                result.push(parts[i]);
            }
        }
        
        return result;
    };
    
    // Get a vector from an array of strings.
    //Note: All elements should be parsable floats.
    //If not, an error may occur (from parseFloat).
    //Note that the vector is assumed to have three
    //components.
    let getVector = (fromArray, startIndex) =>
    {
        let xComponent = fromArray[startIndex],
            yComponent = fromArray[startIndex + 1],
            zComponent = fromArray[startIndex + 2];
            
        let result = new Vector3(parseFloat(xComponent),
                                 parseFloat(yComponent),
                                 parseFloat(zComponent));
        
        return result;
    };
    
    let state = {};
    state.inSolid = true;
    state.inFacet = false;
    state.inFacetLoop = false;
    state.specifiedNormal = undefined;
    
    let parseLine = (lineContent, lineNumber) =>
    {
        const segments = tokenize(lineContent);
        
        if (segments.length === 0)
        {
            return;
        }
        
        let key = segments[0];
        
        if (key === "facet" && !state.inFacet)
        {
            state.inFacet = true;
            
            // Does the file specify a normal?
            if (segments.length > 4 && segments[1] === "normal")
            {
                // Get the normal.
                state.specifiedNormal = getVector(segments, 2);
            }
            else
            {
                // Otherwise, note that no
                //normal was specified.
                state.specifiedNormal = undefined;
            }
        }
        
        // Check for the beginning of a facet loop.
        if (key === "outer" && state.inFacet
                && segments.length > 1 && segments[1] == "loop")
        {
            state.inFacetLoop = true;
        }
        
        // Check for the end of a facet loop.
        if (key === "endloop")
        {
            state.inFacetLoop = false;
        }
        
        // Check for the end of a facet.
        if (key === "endfacet")
        {
            state.inFacet = false;
        }
        
        // If a vertex and in a facet loop,
        //AND we can get the next three tokens...
        if (key === "vertex" && state.inFacetLoop && segments.length > 3)
        {
            // Get the coordinates of the verticies.
            let vertex = getVector(segments, 1);
            
            verticies = verticies.concat(vertex.toArray());
            
            let newNormal = [];
            if (state.specifiedNormal)
            {
                newNormal = state.specifiedNormal.toArray();;
            }
            else
            {
                recomputeNormals = true;
            }
            
            normals = normals.concat(newNormal);
        }
    };
    
    // Parse every line.
    const lines = stlText.split("\n");
    
    for (let i = 0; i < lines.length; i++)
    {
        parseLine(lines[i], i);
    }
    
    // If recomputing normals, do so.
    if (recomputeNormals)
    {
        normals = ModelHelper.computeNormals(verticies, 0.2); // 0.2 is the tolerance for normal-
                                                              //averaging.
    }
    
    return ModelHelper.Objects.register(key, verticies, normals);
};

/**
 *     Notes the existence of a pre-generated object. For example,
 * a cube. It creates an accessible model, stored in ModelHelper.Objects.
 * If the object already exists, nothing is done.
 */
ModelHelper.Objects.register = function(key, verticies, normals, texCoords, normalTolerance,
                                        vertexColors)
{
    // Do nothing if the object already exists.
    if (ModelHelper.Objects[key])
    {
        return;
    }
    
    let newObject = {};

    newObject.privateInfo = { verticies: verticies, normals: normals, texCoords: texCoords,
                              normalTolerance: normalTolerance, vertexColors: vertexColors };

    newObject.getVerticies = () =>
    {
        return newObject.privateInfo.verticies;
    };

    newObject.getNormals = () =>
    {
        if (!normals)
        {
            newObject.privateInfo.normals = ModelHelper.computeNormals(verticies, newObject.privateInfo.normalTolerance || 0.4);
        }

        return newObject.privateInfo.normals;
    };

    newObject.getTexCoords = () =>
    {
        if (!texCoords)
        {
            newObject.privateInfo.texCoords = ModelHelper.getTexCoords(verticies, 3);
        }

        return newObject.privateInfo.texCoords;
    };
    
    newObject.getVertexColors = () =>
    {
        if (!vertexColors)
        {
            newObject.privateInfo.vertexColors = // Generate random colors.
                     JSHelper.getArrayOfRandomColors(verticies.length,
                         false, // No rounding
                         3, // Three values/color.
                         0.5, 0.6, // Min red, max red.
                         0.5, 0.6, // Minimum green, maximum green.
                         0.5, 0.6); // Min blue, max blue.
        }
        
        return newObject.privateInfo.vertexColors;
    };
    
    // A wrapper around getVerticies, getNormals, and
    //getTexCoords. Returns a single JS object
    //containing these data. Danger: May cause
    //data to autocalculate.
    newObject.getData = () =>
    {
        let result = {};
        
        result.verticies = newObject.getVerticies();
        result.texCoords = newObject.getTexCoords();
        result.normals = newObject.getNormals();
        result.vertexColors = newObject.getVertexColors();
        
        return result;
    };

    ModelHelper.Objects[key] = newObject;
};

/**
 * Get an object. ObjectKeys should be a list
 * of potential objects in order of preference.
 * If the first is not available, the second
 * will be returned.
 */
ModelHelper.Objects.get = function(...objectKeys)
{
    for (let i = 0; i < objectKeys.length; i++)
    {
        if (objectKeys[i] in ModelHelper.Objects)
        {
            return ModelHelper.Objects[objectKeys[i]];
        }
    }

    // Return a cube if no such object
    //was registered.
    return ModelHelper.Objects.Cube;
};

/**
 * Delete an object, if it exists.
 */
ModelHelper.Objects.remove = function(objectKey)
{
    if (objectKey in ModelHelper.Objects)
    {
        delete ModelHelper.Objects[objectKey];
    }
};

// Register a cube. Note that all other
//objects should be registered in a different file.
//This cube allows potential functions to work
//without extra includes (e.g. allowing
//ModelHelper.Objects.get to default to 
//a cube).
ModelHelper.Objects.register("Cube", 
[
    // Face 1
    50, 50, 0,
    50, 0, 0,
    0, 0, 0,
    
    50, 50, 0,
    0, 0, 0,
    0, 50, 0,
    
    // Face 2
    50, 0, 50,
    50, 50, 50,
    0, 50, 50,
    
    50, 0, 50,
    0, 50, 50,
    0, 0, 50,
    
    // Face 3
    0, 50, 0,
    0, 0, 0,
    0, 0, 50,
            
    0, 50, 0,
    0, 0, 50,
    0, 50, 50,
    
    // Face 4
    50, 0, 0,
    50, 50, 0,
    50, 50, 50,
    
    50, 0, 0,
    50, 50, 50,
    50, 0, 50,
    
    // Face 5
    50, 50, 50,
    50, 50, 0,
    0, 50, 0,
    
    50, 50, 50,
    0, 50, 0,
    0, 50, 50,
    
    // Face 6
    50, 0, 50,
    0, 0, 50,
    0, 0, 0,
    
    50, 0, 50,
    0, 0, 0, 
    50, 0, 0
], undefined,
(
    // Get a cube's normals!
    //Note: Copied from Objects.js
    //in the older version of this WebGL 
    //support library.
    function (verticiesCount)
    {
        var locations = [];
        var points = [];
        var j;
        
        var face = 0;

        for(var i = 0; i < verticiesCount / 2; i++)
        {
            face = i;
            
            points = 
            [
                [0, 0],
                [0, 1],
                [1, 1],
                [0, 0],
                [1, 1],
                [1, 0]
            ];
            
            for(j = 0; j < points.length; j++)
            {
                if(face === 0 || face === 2)
                {
                    locations.push(1 - points[j][0]);
                    locations.push(1 - points[j][1]);
                }
                else
                {
                    locations.push(points[j][0]);
                    locations.push(points[j][1]);
                }
            }
        }
        
        return locations;
    }
)(36));


// Inserted file DraggableElement.js encoding='utf-8'
"use strict";

/*
    Something that can be moved through pointer-interaction.
    The parameter, content, is the HTML Element on which a
    listener is placed that shows the dragElement, and calls
    onDrag(delta x, delta y, client x, client y) while the
    content is dragged.
    The trackWindowScroll parameter is a boolean. If true, 
    dx includes changes in window.scrollX and dy includes
    changes in window.scrollY.
*/
function DraggableElement(content, dragElement, onDrag, trackWindowScroll)
{
    var pointerDown = false;
    var lastX, lastY, lastClientX, lastClientY;
    this.onDrag = onDrag;
    this.onBeforeDrag = function() {};
    
    var me = this;

    var eventToPosition = (event) =>
    {
        let x, y;
        
        // If we don't have clientX, clientY (we don't know
        // the type of the given event), re-use the previous.
        // It might be that the mouse has not moved but the 
        // viewport has.
        if (event.clientX !== undefined && event.clientY !== undefined)
        {
            x = event.clientX;
            y = event.clientY;

            lastClientX = x;
            lastClientY = y;
        }
        else
        {
            x = lastClientX;
            y = lastClientY;
        }

        if (trackWindowScroll)
        {
            x += window.scrollX;
            y += window.scrollY;
        }

        return { x: x, y: y };
    };
    
    var eventStart = function(event)
    {
        event.preventDefault();
    
        pointerDown = true;
        dragElement.style.display = "block";

        const position = eventToPosition(event);

        lastX = position.x;
        lastY = position.y;
        
        me.onBeforeDrag(lastX, lastY);
    };
    
    var eventMove = function(event)
    {
        if (pointerDown)
        {
            event.preventDefault();
            
            const position = eventToPosition(event);
            var x = position.x;
            var y = position.y;
        
            var dx = x - lastX;
            var dy = y - lastY;
            
            me.onDrag(dx, dy, x, y);
            
            lastX = x;
            lastY = y;
        }
    };
    
    var eventEnd = function(event)
    {
        event.preventDefault();
    
        pointerDown = false;
        dragElement.style.display = "none";
    };

    // At the time of this writing, Safari DID NOT support
    //pointer events. TODO Due to this, when the first pointer
    //event is fired, note that other event handlers can
    //ignore their input.
    JSHelper.Events.registerPointerEvent("down", content, function(e)
    {
        eventStart(e);
        
        return true;
    });
    
    JSHelper.Events.registerPointerEvent("move", dragElement, function(e)
    {
        eventMove(e);
        
        return true;
    });
    
    JSHelper.Events.registerPointerEvent("stop", dragElement, function(e)
    {
        eventEnd(e);
        
        return true;
    });

    JSHelper.Events.registerPointerEvent("move", content, function(e)
    {
        eventMove(e);
        
        return true;
    });
    
    JSHelper.Events.registerPointerEvent("up", content, function(e)
    {
        eventEnd(e);
        
        return true;
    });

    if (trackWindowScroll)
    {
        document.addEventListener("scroll", function(e)
        {
            // Allow the browser to defer eventMoves.
            requestAnimationFrame(() => eventMove(e));
        });
    }
}



// Inserted file CloudHelper.js encoding='utf-8'
"use strict";

/**
 *  A very simple content management system for uwappdev.github.io.
 * Although it is intended to be usable for changes to page content,
 * its primary goal is for management of tools that might be exposed
 * through the website. For example, displaying a survey without a commit
 * to Github.
 */
 
var ContentManager = {};

ContentManager.URL_PAGE_SPECIFIER_START = "?="; // Use this string to requestF a specific page.
ContentManager.currentPage = null;
ContentManager.SEARCH_CHAR = "→";
ContentManager.PAGE_CHANGE_EVENT = "PAGE_CHANGED_CMS";
ContentManager.UPDATE_PAGE_NOTIFY = "PAGE_SPECIFIC_CHANGED: ";
ContentManager.PAGE_NOT_FOUND = `<h2>We couldn't find that page!</h2>
                                <p>Please, check your spelling and try
                                   again. If you believe that this 
                                   message is in error, please
                                   contact a club administrator!</p>`;

/**
 *  Display a single page. If doNotAddToHistory is set,
 * the page will not be added to the window's set of backstacked pages.
 * Use forceReload to reload a page (set to true).
 */
ContentManager.displayPage = 
async function(name, doNotAddToHistory, forceReload)
{
    // Get elements.
    let contentZone = document.querySelector("#mainData");
    
    // Animate it!
    contentZone.parentElement.classList.add("shrinkGrow");
    
    // Check: Are we already on the page?
    if (ContentManager.currentPage === name && !forceReload)
    {
        return; // No need to load it twice.
    }
    
    await PageDataHelper.awaitLoad(); // Make sure we've loaded the page.
    
    ContentManager.currentPage = name;
    
    // Default values
    name = name || PageDataHelper.defaultPage;
    
    // Set content.
    const pageContent = await PageDataHelper.getPageContent(name);
    contentZone.innerHTML = pageContent || ContentManager.PAGE_NOT_FOUND;
    
    // Did the page request a background?
    JSHelper.Notifier.notify(BACKGROUND_CHANGE_EVENT, PageDataHelper.pageBackgrounds[name]);
    
    // Cleanup animation
    setTimeout(() =>
    {
        contentZone.parentElement.classList.remove("shrinkGrow");
    }, ANIM_SHRINK_GROW_DURATION); // We assume it's safe after a ANIM_SHRINK_GROW_DURATION.
    
    // Push to backstack.
    if (window.history && !doNotAddToHistory)
    {
        const state = { pageName: name },
              title = '',
              url   = ContentManager.URL_PAGE_SPECIFIER_START + name;
              
        window.history.pushState(state, title, url);
    }
    
    // If the pages list was reloaded, reload the page!
    while (true)
    {
        let result = await JSHelper.Notifier.waitForAny(PageDataHelper.PAGES_RELOAD, 
                ContentManager.PAGE_CHANGE_EVENT, ContentManager.UPDATE_PAGE_NOTIFY + name);
        
        
        // Stop if a new page was loaded.
        if (result.event === ContentManager.PAGE_CHANGE_EVENT)
        {
            break;
        }
        
        // Otherwise, reload the current page.
        ContentManager.displayPage(name, true, true); // Don't add it to history again, force reload.
    }
};

// Load a page after a change in
//the backstack data!
ContentManager.onBackstackTransit =
function()
{
    let requestedPage = ContentManager.getURLRequestedPage() || PageDataHelper.defaultPage;
    
    ContentManager.displayPage(requestedPage,
                               true); // Don't push to back stack again.
};

/**
 * Create buttons and connect them to actions.
 */
ContentManager.initializePages = 
async function()
{
    let addedButtons = [];
    
    const createPageButton = (pageName, buttonZones, buttonPrecedence) =>
    {
        for (let i = 0; i < buttonZones.length; i++)
        {
            let newButton = 
            HTMLHelper.addButton(pageName, buttonZones[i], () =>
            {
                ContentManager.displayPage(pageName);
            });
            
            newButton.style.order = buttonPrecedence || 0;
            
            addedButtons.push(newButton);
        }
    };
    
    // Clear all page buttons that have been created.
    const clearButtons = async () =>
    {
        while (addedButtons.length > 0)
        {
            let lastButton = addedButtons.pop();
            
            // Shrink it.
            lastButton.style.filter = "opacity(100%)";
            lastButton.style.transition = "0.1s ease filter";
            
            await JSHelper.nextAnimationFrame();
            lastButton.style.filter = "opacity(0%)";
            
            await JSHelper.waitFor(100); // Wait 100ms.
            lastButton.remove(); // Delete it.
        }
    };
    
    // Load page shortcuts.
    const loadButtons = () =>
    {
        let buttonAreas = document.querySelectorAll(".navigationButtons");
        let pageName;
    
        // Create a button for every linked page.
        for (let pageName in PageDataHelper.linkedPages)
        {
            createPageButton(pageName, buttonAreas, PageDataHelper.linkedPages[pageName]);
        }
        
        // Refresh buttons on edit.
        (async () =>
        {
            await JSHelper.Notifier.waitFor(PageDataHelper.PAGE_BUTTONS_CHANGED);
            
            await clearButtons();
            loadButtons();
        })();
    };

    await PageDataHelper.awaitLoad();
    
    loadButtons();
    
    // Check the URL -- has a specific page been linked to?
    let requestedPage = ContentManager.getURLRequestedPage() || PageDataHelper.defaultPage;
    
    // Display it.
    ContentManager.displayPage(requestedPage);
};

/**
 * Get the name of the page requested by the page's address bar.
 * If no page is requested, undefined is returned.
 */
ContentManager.getURLRequestedPage = () =>
{
    const specifierIndex = location.href.indexOf(ContentManager.URL_PAGE_SPECIFIER_START);
    let requestedPage = undefined;
    
    // Find the requested page.
    if (location.href && specifierIndex > location.href.lastIndexOf("/"))
    {
        // Get the page's name.
        requestedPage = location.href.substring
        (
            specifierIndex + ContentManager.URL_PAGE_SPECIFIER_START.length
        );
    }
    
    return requestedPage;
};

/**
 * Display UI letting users edit/manage pages.
 */
ContentManager.editPages = () =>
{
    const pageEditWindow = SubWindowHelper.create(
    { 
        title: "Manage Pages",
        className: "pageManagementWindow",
        minWidth: 256,
        minHeight: 100,
        fixWindowSize: true
    });
    
    // Enable flex-boxing.
    pageEditWindow.enableFlex("row");
    
    // Create both the left and right panes.
    const leftPane = document.createElement("div");
    const rightPane = document.createElement("div");
    
    // Styling.
    leftPane.classList.add("pageListManage");
    rightPane.classList.add("pageEditManage");
    
    // Add both to the window.
    pageEditWindow.appendChild(leftPane);
    pageEditWindow.appendChild(rightPane);
    
    // Add content to panes.
    let searchInput, pageEditor;
    
    const searchPanel = document.createElement("div");
    searchPanel.classList.add("searchContainer");
    
    // Create the results display.
    const resultsDisplay = document.createElement("div");
    resultsDisplay.style.display = "flex";
    resultsDisplay.style.flexDirection = "column";
    
    let reSearch = () => {};
    let currentPage = undefined;
    
    // Manage search.
    const runSearch = async () =>
    {
        reSearch = async (queryText) =>
        {
            const results = await PageDataHelper.query(queryText);
            
            const createListItem = (pageTitle) =>
            {
                const listItem = document.createElement("div");
                listItem.setAttribute("tabIndex", 2);
                listItem.classList.add("pageListItemManage");
                
                listItem.innerText = pageTitle;
                
                listItem.addEventListener("click", () =>
                {
                    // Select it.
                    if (currentPage && currentPage.classList)
                    {
                        currentPage.classList.remove("selected");
                    }
                    
                    currentPage = listItem;
                    currentPage.classList.add("selected");
                    
                    pageEditor.editPage(pageTitle);
                });
                
                // If the item IS the currently-selected,
                //note this.
                if (pageTitle == pageEditor.getPageName())
                {
                    listItem.classList.add("selected");
                }
                
                // If the item is published, note that, too.
                if (PageDataHelper.isPublished(pageTitle))
                {
                    listItem.classList.add("published");
                    
                    listItem.setAttribute("title", "Edit published " + pageTitle);
                }
                else
                {
                    listItem.setAttribute("title", "Edit " + pageTitle);
                }
                
                resultsDisplay.appendChild(listItem);
            };
            
            // Clear the results.
            resultsDisplay.innerHTML = "";
            
            for (var i = 0; i < results.length; i++)
            {
                createListItem(results[i][0]);
            }
        };
        
        await reSearch(searchInput.value);
    };
    
    // Re-run last search on reload of pages.
    (async () =>
    {
        while (!pageEditWindow.closed)
        {
            // Wait for data refresh.
            await JSHelper.Notifier.waitFor(PageDataHelper.PAGES_RELOAD);
            
            // Re-search.
            reSearch(searchInput.value);
        }
    })();
    
    searchInput = HTMLHelper.addInput("Search Pages...", "", "text", searchPanel, undefined,
                                            runSearch);
    const searchButton = HTMLHelper.addButton(ContentManager.SEARCH_CHAR, searchPanel, runSearch);
    searchButton.setAttribute("title", "Submit search");
    
    searchInput.setAttribute("tabIndex", 2);
    
    // Add elements to panes.
    leftPane.appendChild(searchPanel);
    leftPane.appendChild(resultsDisplay);
    
    // Spacer & commands below it.
    HTMLHelper.addSpacer(leftPane);
    
    // Hide and show left pane buttons.
    let showPane = HTMLHelper.addButton("Show Pane", rightPane, () =>
    {
        leftPane.classList.remove("hidden");
        showPane.classList.add("hidden");
    });
    
    showPane.classList.add("showPane");
    showPane.classList.add("hidden");
    
    HTMLHelper.addButton("Hide Pane", leftPane, () =>
    {
        leftPane.classList.add("hidden");
        showPane.classList.remove("hidden");
    });
    
    // Display a warning if the user isn't an admin.
    (async () =>
     {
        if (!(await AuthHelper.isAdmin()))
        {
            await SubWindowHelper.alert("Danger!", "It looks like you aren't an admin. This editor probably won't work, but you can try to use it anyways.");
        }
     })();

    // Actually create the editor.
    pageEditor = PageEditor.create(rightPane);
    
    pageEditWindow.setOnCloseListener(() =>
    {
        pageEditor.close();
    });
};

/**
 * Add any global content-management controls to the page.
 * For example, a sign-in button and survey management tools.
 */
ContentManager.addCMSControls = 
async function(parent)
{
    AuthHelper.insertAuthCommands(parent);
    
    // Any windows opened by the CMS.
    let CMSWindows = [];
    
    // Wrap all content-management utilities in
    //a div.
    let cmsWrapper = document.createElement("div");
    
    cmsWrapper.style.display = "none";
    cmsWrapper.style.flexDirection = "column";
    
    // Add buttons to the CMS.
    HTMLHelper.addButton("Page Editor", cmsWrapper, () =>
    {
        ContentManager.setBladeClosed(true);
        
        ContentManager.editPages();
    });
    
    // Show the content-management system.
    const showCMS = () =>
    {
        cmsWrapper.style.display = "flex";
    };
    
    // Hide the content-management system.
    const hideCMS = () =>
    {
        cmsWrapper.style.display = "none";
    };
    
    // Add the wrapper.
    parent.appendChild(cmsWrapper);
    
    while (true)
    {
        if (!AuthHelper.isSignedIn())
        {
            await JSHelper.Notifier.waitFor(AuthHelper.SIGN_IN_EVENT);
        }
        
        showCMS();
        
        await JSHelper.Notifier.waitFor(AuthHelper.SIGN_OUT_EVENT);
        
        hideCMS();
    }
};

/**
 * Add a search bar that permits searches through page titles and content.
 */
ContentManager.addPageSearch = 
function(parent)
{
    let searchInput, searchResultsDiv; // Define elements here so they can be accessed in helper
                                    //functions.
    
    const submitSearch = async () =>
    {
        const searchText = searchInput.value;
        
        // Get search results!
        const results = await PageDataHelper.query(searchText);
        
        // Clear the results list.
        searchResultsDiv.innerHTML = "";
        
        const makePageLink = (pageTitle, relevancy) =>
        {
            HTMLHelper.addButton(pageTitle + " (+" + relevancy + ")", searchResultsDiv,
            () =>
            {
                ContentManager.toggleBlade();
                ContentManager.displayPage(pageTitle);
                
                // Clear the search input.
                searchInput.value = "";
            });
        };
        
        // Note the number of results.
        let foundText = HTMLHelper.addTextElement("Found " + results.length + " result" + 
                                                 (results.length == 1 ? '' : 's') + ".",
                                                  searchResultsDiv);
        
        // Link to each.
        for (let i = 0; i < results.length; i++)
        {
            makePageLink(results[i][0], results[i][1]);
        }
        
        // Focus the results.
        searchResultsDiv.setAttribute("tabindex", 2);
        searchResultsDiv.focus();
        
        foundText.setAttribute("tabIndex", 2);
        foundText.focus();
    };
    
    // Clear results on data refresh.
    (async () =>
    {
        while (true)
        {
            // Wait for data refresh.
            await JSHelper.Notifier.waitFor(PageDataHelper.PAGES_RELOAD);
            
            // Clear results.
            searchResultsDiv.innerHTML = "...";
        }
    })();

    searchResultsDiv = document.createElement("div"); 
    const searchDiv     = document.createElement("div");
    searchInput  = HTMLHelper.addInput("Search Pages", "", "text", 
                                            searchDiv, undefined, submitSearch);
    const searchButton = HTMLHelper.addButton(ContentManager.SEARCH_CHAR, searchDiv, submitSearch);
    searchButton.setAttribute("title", "Submit search.");
    
    searchDiv.classList.add("searchContainer");
    searchResultsDiv.classList.add("searchResults");
    
    parent.appendChild(searchResultsDiv);
    parent.appendChild(searchDiv);
};

// Show/hide the blade.
ContentManager.toggleBlade = () => {};
ContentManager.setBladeClosed = (closed) => {};

/**
 *  Connects the main menu's UI to actions, among other things, connecting its
 * logo element to a menu.
 */
ContentManager.initializeMainMenu = 
async function()
{
    let logoDisplay = document.querySelector(".navabar .logo");
    let menuBlade = document.querySelector("#mainBlade"); // Lets call them "blades" --
                                                          //I think that's what they're called.
    
    const showHideBlade = () =>
    {
        menuBlade.classList.toggle("bladeClosed");
        menuBlade.classList.toggle("bladeOpen");
        
        logoDisplay.classList.toggle("requestRotate");
    };
    
    // Click listeners for showing/hiding.
    logoDisplay.addEventListener("click", showHideBlade);
    logoDisplay.setAttribute("tabindex", 1); // Allow focusing.
    logoDisplay.setAttribute("title", "Push to access the main menu. Use as a button." + 
                                       " After opening, items should be selectable with the " +
                                       " up and down arrow keys. ");
    
    ContentManager.toggleBlade = showHideBlade;
    ContentManager.setBladeClosed = (closed) =>
    {
        if (closed)
        {
            menuBlade.classList.add("bladeClosed");
            menuBlade.classList.remove("bladeOpen");
            logoDisplay.classList.remove("requestRotate");
        }
        else
        {
            menuBlade.classList.remove("bladeClosed");
            menuBlade.classList.add("bladeOpen");
            logoDisplay.classList.add("requestRotate");
        }
    };
    
    // Add a sign-in button and a search bar.
    ContentManager.addCMSControls(menuBlade);
    HTMLHelper.addSpacer         (menuBlade);
    ContentManager.addPageSearch (menuBlade);
    
    while (true)
    {
        await JSHelper.Notifier.waitFor(AuthHelper.AUTH_MENU_USED);
        ContentManager.setBladeClosed  (true);
    }
};

// Handle all tasks related to initialization.
//Should be called by main.
ContentManager.init = () =>
{
    const me = ContentManager;
    
    me.initializePages();
    me.initializeMainMenu();
};

// Await page load, but push the request to a
//background frame to ensure JSHelper has loaded.
requestAnimationFrame(
async () =>
{
    await JSHelper.Notifier.waitFor(JSHelper.PAGE_SETUP_COMPLETE, true);
    
    // Enable backstack navigation.
    window.addEventListener("popstate", ContentManager.onBackstackTransit);
});

// Inserted file Worlds.js encoding='utf-8'
"use strict";

/**
 *  A single part of a world. Each world object should
 * have model data that can be rendered (something registered
 * with the renderer), a method to get
 * that data, and an animation request handler. By default,
 * getModel is set to do THROW. It must be overridden.
 * The animate method, however, does nothing by default, as
 * not all objects must animate. The getTransform method,
 * by default, returns this.transformMat, which, at initialization
 * is set to the identity matrix.
 */
function WorldObject()
{
    const me = this;
    
    me.transformMat = new Mat44();
    me.transformMat.toIdentity(); // Select the identity, rather than the
                                  //zero matrix.
                                  
    me.textureCanvas = undefined;
    
    var registeredModel = undefined;
    
    // By default, throw. This method should return
    //refrences to models. This should be called only once.
    //Do not use this to generate dynamic models.
    this.getModel = () =>
    {
        throw "WorldObject.getModel is abstract and must be implemented.";
    };
    
    // Get the registered version of this object's model.
    this.getRegisteredModel = (renderer) => 
    {
        if (registeredModel == undefined)
        {
            me.registerModels(renderer);
        }
    
        return registeredModel;
    };
    
    // Intended for the registration of all models with the renderer.
    this.registerModels = (renderer) =>
    {
        registeredModel = renderer.registerObject();
        registeredModel.fromModel(this.getModel());
    };
    
    this.getTransform = () =>
    {
        return me.transformMat;
    };
    
    // The animate method takes a change in time and a renderer
    //The renderer provides useful context information and permits
    //the registration/unregistration of objects.
    this.animate = (renderer, deltaT) =>
    {
        // By default, do nothing. This is to
        //be overridden by clients who wish to
        //animate.
    };
    
    this.cleanup = () => {}; // Cleanup from an animate/render.
    
    // Render the world object. This method is intended
    //to be final, or if it is overridden, be called by
    //the method that overrides it.
    this.render = function(renderer)
    {
        // Save and restore the world matrix.
        renderer.worldMatrix.save();
        
        // TODO Test this for compliance with both left and
        //right multiplication matricies (e.g. do we need to
        //transpose?).
        renderer.worldMatrix.leftMulAndSet(me.getTransform());
        
        if (me.preRender)
        {
            me.preRender.call(me, renderer);
        }
        
        // Push the world matrix to WebGL.
        renderer.updateWorldMatrix();
        
        // Set textures.
        renderer.setTexture(me.textureCanvas || renderer.getOutputCanvas());
        
        // Bind the object.
        let model = me.getRegisteredModel(renderer);
        
        // Bind the objects buffers and render
        //it.
        model.bindBuffers();
        renderer.render(model);
        
        renderer.worldMatrix.restore();
    };
}

/**
 *      "A world in a box."
 * Construct a single, small world that can
 * coexist with other such worlds. This world
 * responds to ticks of the global clock and
 * shares a renderer with the full container.
 *
 * This is ideal for small, in-page animations,
 * like that of a spinning/squishable logo.
 */
function WorldBox(options)
{
    options = options || {};

    WorldObject.apply(this);            // Each WorldBox is considered
                                        //a box in the larger world.

    const me = this;
    
    this.objects = [];
    this.unregisteredObjects = [];
    this.destinationCtx = undefined;
    this.renderer = options.renderer;   // A renderer to override the FullWorld's default.
    this.outputResolution = 1;
    
    // When asked to register models,
    //simply do that for all sub-objects.
    this.registerModels = (renderer) =>
    {
        let lastObject;
        
        while (me.unregisteredObjects.length > 0)
        {
            lastObject = me.unregisteredObjects.pop();
            
            // Tell the object to register itself.
            lastObject.registerModels(renderer);
            
            // The last object is now registered.
            me.objects.push(lastObject);
        }
    };
    
    this.setDestinationCanvas = function(canvas)
    {
        me.destinationCtx = canvas.getContext("2d");
    };
    
    // Animate!
    //Pass this call to all sub-objects.
    this.animateChildren = function(renderer, deltaT)
    {
        // Register all unregistered objects.
        this.registerModels(renderer);
        
        // Animate all sub-objects.
        for (var i = 0; i < me.objects.length; i++)
        {
            me.objects[i].animate(renderer, deltaT);
        }
    };
    
    this.cleanupChildren = function(renderer)
    {
        for (var i = 0; i < me.objects.length; i++)
        {
            me.objects[i].cleanup(renderer);
        }
    };
    
    this.animate = this.animateChildren;
    
    this.cleanup = this.cleanupChildren;
    
    this.render = function(renderer)
    {
        if (me.destinationCtx || me.renderer)
        {
            var canvas = me.destinationCtx ? me.destinationCtx.canvas : me.renderer.getOutputCanvas();
        
            // Update the renderer's size if necessary.
            renderer.updateViewIfNeeded(canvas.clientWidth * me.outputResolution,
                                           canvas.clientHeight * me.outputResolution,
                                           false); // Don't force.
            
            // Update the size of the rendering context if needed.
            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight)
            {
                canvas.width = canvas.clientWidth * me.outputResolution || 1; // Don't go to zero.
                canvas.height = canvas.clientHeight * me.outputResolution || 1;
            }
        }
        
        let currentObject;
        
        renderer.clear();
    
        renderer.saveUniforms();
        renderer.worldMatrix.save();
        renderer.worldMatrix.leftMulAndSet(me.getTransform());
        
        // If a function has been implemented that handles 
        //the application of renderer settings, call it.
        if (this.preRender)
        {
            this.preRender.call(me, renderer);
        }
        
        // Render every child object.
        for (let i = 0; i < me.objects.length; i++)
        {
            currentObject = me.objects[i];
            
            // Sub-objects might change uniforms.
            //Save and restore them.
            renderer.saveUniforms();
            renderer.worldMatrix.save();
            
            // Render using the default method only if the
            //rendering method hasn't been overridden or unless
            //it requests default rendering.
            if (!me.onRender || me.onRender(currentObject, renderer) === true)
            {
                currentObject.render(renderer);
            }
            
            renderer.restoreUniforms();
            renderer.worldMatrix.restore();
        }
        
        renderer.restoreUniforms();
        renderer.worldMatrix.restore();
        
        if (me.destinationCtx)
        {
            // Clear the destination context.
            me.destinationCtx.clearRect(0, 0, 
                    me.destinationCtx.canvas.width, 
                    me.destinationCtx.canvas.height);
            
            // Render to the destination context.
            renderer.display(me.destinationCtx);
        }
    };
    
    this.addObject = function(newObject)
    {
        me.unregisteredObjects.push(newObject);
    };
    
    this.registerObject = this.addObject;
}

/**
 *  A full world is a collection of smaller, world boxes.
 * It manages the creation and update of such worlds.
 */
function FullWorld()
{
    const me = this;
    
    this.worlds = [];
    let stopLoop = false;
    this.renderer = RendererHelper.getRenderer();
    this.lastAnimateTime = (new Date()).getTime(); // TODO Check for potential bug when
                                                   // animate is called for the first time -- 
                                                   // if the user creates a FullWorld
                                                   // at program init, there could be a
                                                   // significant deltaT, messing things up. 
    
    this.registerWorld = function(world)
    {
        // Add the world.
        me.worlds.push(world);
    };
    
    this.updateWorld = function(world, deltaT)
    {
        let worldRenderer = world.renderer || me.renderer; // Use the world's renderer,
                                                           //if it has one.
    
        worldRenderer.saveUniforms();
        
        world.animate(worldRenderer, deltaT);
        world.render(worldRenderer);
        world.cleanup(worldRenderer);
        
        worldRenderer.restoreUniforms();
    };
    
    this.loopOnce = function()
    {
        const nowTime = (new Date()).getTime();
        const deltaT = nowTime - me.lastAnimateTime;
        
        // Animate and render.
        for (let i = 0; i < me.worlds.length; i++)
        {
            me.updateWorld(me.worlds[i], deltaT);
        }
        
        me.lastAnimateTime = nowTime;
    };
    
    this.loop = function()
    {
        // If not to stop looping,
        if (!stopLoop)
        {
            me.loopOnce();
        
            requestAnimationFrame(() =>
            {
                me.loop.call(me);
            });
        } // Otherwise, we've stopped the loop.
        else
        {
            stopLoop = false;
        }
    };
    
    // Notes that we should stop looping.
    this.cancelLoop = function()
    {
        stopLoop = true;
    };
}


// Inserted file AuthHelper.js encoding='utf-8'
"use strict";

/**
 *  A simple authentication manager.
 */
var AuthHelper = {};

AuthHelper.SIGN_IN_EVENT  = "AUTH_SIGN_IN";
AuthHelper.SIGN_OUT_EVENT = "AUTH_SIGN_OUT";
AuthHelper.AUTH_MENU_USED = "AUTH_MENU_USED";
AuthHelper.PHOTO_STORE_LOCATION = "https://firebasestorage.googleapis.com/";
AuthHelper.PROFILE_PHOTO_SIZE = 150;
AuthHelper.PHOTO_NAME_PREFIX = "_"; // Prefix all photos with this when stored on the server.
AuthHelper.PHOTO_DIR = "profile_photos";
AuthHelper.PASSWORD_REQUIREMENTS = { minLength: 14, 
                                     specialCharCount: 3,
                                     numberCharCount: 4 };

// Add buttons for managing authentication
//to the element, parent. Actions are completed
//in SubWindows.
AuthHelper.insertAuthCommands = 
async (parent) =>
{
    let signedOutDisplay = document.createElement("div");
    let signedInDisplay = document.createElement("div");
    
    let signInButton = HTMLHelper.addButton("Sign In", signedOutDisplay),
        signOutButton = HTMLHelper.addButton("Sign Out", signedInDisplay),
        accountSettings = HTMLHelper.addButton("Account", signedInDisplay),
        createAccount   = HTMLHelper.addButton("Create Account", signedOutDisplay);
    
    signedOutDisplay.classList.add("authCommands");
    signedInDisplay.classList.add("authCommands");
    
    // Shows commands relevant to the user's current sign-in
    //state.
    const showRelevantCommands = () =>
    {
        if (!AuthHelper.isSignedIn())
        {
            signedInDisplay.style.display = "none";
            signedOutDisplay.style.display = "flex";
        }
        else
        {
            signedInDisplay.style.display = "flex";
            signedOutDisplay.style.display = "none";
        }
    };
    
    // Show only commands relevant to the user's current
    //sign-in state.
    showRelevantCommands();
    
    // Add both displays
    parent.appendChild(signedOutDisplay);
    parent.appendChild(signedInDisplay);
    
    // Handle events.
    signInButton.addEventListener   ("click", AuthHelper.signIn       );
    createAccount.addEventListener  ("click", AuthHelper.createAccount);
    signOutButton.addEventListener  ("click", AuthHelper.signOut      );
    accountSettings.addEventListener("click", AuthHelper.manageAccount);
    
    // Show/hide relevant commands when the user authenticates/deauthenticates.
    while (true)
    {
        await JSHelper.Notifier.waitFor([AuthHelper.SIGN_IN_EVENT]);
        showRelevantCommands();
        
        await JSHelper.Notifier.waitFor([AuthHelper.SIGN_OUT_EVENT]);
        showRelevantCommands();
    }
};

// Display a UI permitting the user to sign in or re-authenticate.
AuthHelper.signIn = 
async () =>
{
    JSHelper.Notifier.notify(AuthHelper.AUTH_MENU_USED);
    
    let response = 
    await SubWindowHelper.prompt("Sign In", 
            "Please, enter your email/username and password.",
            { "Email": "text", "Password": "password" });
    
    const email = response.Email;
    
    // Sign the user in.
    try
    {
        const password = response.Password;
        
        // Sign in the user.
        await window.firebase.auth().signInWithEmailAndPassword
                                        (email, password);
    }
    catch(error)
    {
        const errorCode = error.code;
        const errorMessage = error.message;
        
        // Inform the user of the error.
        const resetPassword = await SubWindowHelper.confirm("Error " + errorCode, errorMessage + " Send a password reset email?", "Yes", "No");
        
        if (resetPassword)
        {
            try
            {
                await firebase.auth().sendPasswordResetEmail(email);
            }
            catch (error)
            {
                SubWindowHelper.alert(error.code, error.message);
            }
        }
        
        return;
    }
    
    await SubWindowHelper.alert("Signed in!", "You are signed in!");
    
    return true;
};

// Sign the user out.
AuthHelper.signOut =
async () =>
{
    JSHelper.Notifier.notify(AuthHelper.AUTH_MENU_USED);
    
    try
    {
        await firebase.auth().signOut();
        
        if (AuthHelper.isSignedIn())
        {
            throw "You seem to still be signed in. Please contact a site administrator.";
        }
    }
    catch(e)
    {
        SubWindowHelper.alert(e.code || "Error", e.message || e + "");
        
        return;
    }
    
    SubWindowHelper.alert("Signed out.", "You are now signed out.");
};

// Display UI letting users create
//an account.
AuthHelper.createAccount =
async () =>
{
    JSHelper.Notifier.notify(AuthHelper.AUTH_MENU_USED);
    
    const accountCreateWindow = SubWindowHelper.create(
    {
        title: "Create an Account",
        className: "accountWindow"
    });
    
    let contentWrapper = document.createElement("div");
    
    contentWrapper.style.display = "flex";
    contentWrapper.style.flexDirection = "column";
    contentWrapper.style.padding = "8px";
    
    let emailInput = HTMLHelper.addLabeledInput("Email Address", "", "text", contentWrapper);
    
    let passwordInput = HTMLHelper.addPasswordConcocter(contentWrapper,
                                                       AuthHelper.PASSWORD_REQUIREMENTS);
    let disclaimer = HTMLHelper.addParagraph(`Please, do <i><b>not</b></i> create an
                                              account unless explicitly told to do so
                                              by club administration. We reserve the
                                              right to delete accounts and any data
                                              associated with them. We may also share
                                              any data given to this app <span class = "dash"></span>
                                              including your name and email <span class = "dash"></span>
                                              with anyone.`, contentWrapper);
    
    let submitButton = HTMLHelper.addButton("Sumbit", contentWrapper);
    
    submitButton.style.transition = "0.4s ease all";
    submitButton.style.overflow = "hidden";
    submitButton.style.height = "0em";
    
    passwordInput.onValid(() =>
    {
        submitButton.style.height = "1.5em";
    });
    
    passwordInput.onInvalid(() =>
    {
        submitButton.style.height = "0em";
    });
    
    // Minor styling.
    contentWrapper.style.maxWidth = "500px";
    contentWrapper.style.marginLeft = "auto";
    contentWrapper.style.marginRight = "auto";
    
    // Create the account!
    submitButton.addEventListener("click", 
    async () =>
    {
        const email    = emailInput.value;
        const password = passwordInput.get();
        
        try
        {
            await firebase.auth().createUserWithEmailAndPassword(email, password);
        }
        catch(error)
        {
            SubWindowHelper.alert("Error: " + error.code, error.message);
            
            return;
        }
        
        accountCreateWindow.close();
        
        let user = firebase.auth().currentUser;
        
        if (user)
        {
            try
            {
                await user.sendEmailVerification();
            }
            catch(e)
            {
                SubWindowHelper.alert("Error: " + error.code, error.message);
                
                return;
            }
        }
        else
        {
            console.error("User == null.");
        }
        
        await SubWindowHelper.alert("Success!", "Please, sign in and check your email.");
    });
    
    accountCreateWindow.appendChild(contentWrapper);
};

AuthHelper.photoCtx = document.createElement("canvas").getContext("2d");

// Get the SRC of the current user's profile picture.
AuthHelper.getProfilePhotoSrc = 
async (requestedUserId) =>
{
    let user = firebase.auth().currentUser;
    let userData = user;
    
    if (requestedUserId !== user.id && requestedUserId !== undefined)
    {
        let database = await CloudHelper.awaitComponent(CloudHelper.Service.FIRESTORE);
    
        let doc = database.collection("userData").doc(requestedUserId);
        let docData = await doc.get();
        
        if (docData.exists)
        {
            userData = docData.data();
            userData.photoURL = userData.profileURL; // Correct different naming.
        }
        else
        {
            userData =
            {
                photoURL: null,
                displayName: "?"
            };
        }
    }
    
    // If a photoURL...
    if (userData.photoURL && userData.photoURL.startsWith(AuthHelper.PHOTO_STORE_LOCATION)
            && userData.photoURL.indexOf(" ") === -1)
    {
        return userData.photoURL;
    }
    
    // Reset the canvas.
    let ctx = AuthHelper.photoCtx;
    ctx.canvas.width = AuthHelper.PROFILE_PHOTO_SIZE;
    ctx.canvas.height = AuthHelper.PROFILE_PHOTO_SIZE;
    
    // Clear it!
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw a background.
    ctx.fillStyle = "gray";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw text.
    ctx.fillStyle = "white";
    ctx.font = "12pt courier, sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    let displayName = userData.displayName || "?";
    let nameWords = displayName.split(" ");
    let textToUse = "?";
    
    if (nameWords.length > 0 && nameWords[0].length > 1)
    {
        textToUse = nameWords[0].charAt(0);
        
        if (nameWords.length > 1 && nameWords[nameWords.length - 1].length > 0)
        {
            textToUse += nameWords[nameWords.length - 1].charAt(0);
        }
    }
    
    let outputText = textToUse.toUpperCase();
    
    ctx.fillText(outputText, ctx.canvas.width / 2, ctx.canvas.height / 2);
    
    await JSHelper.nextAnimationFrame();
    
    return ctx.canvas.toDataURL("img/png");
};

// Get whether the current user has admin privlidges.
AuthHelper.isAdmin = async () =>
{
    let user = firebase.auth().currentUser;

    if (user)
    {
    	let database = await CloudHelper.awaitComponent(CloudHelper.Service.FIRESTORE);
    
    	let doc = await database.collection("admins").doc(user.uid).get();
    	
    	return doc.exists;
    }

    return false;
};

AuthHelper.getUid = async () =>
{
    let user = firebase.auth().currentUser;
    
    if (user)
    {
        return user.uid;
    }
    
    return undefined;
};

// Display account-management UI.
//Pre: The user is signed in.
AuthHelper.manageAccount = 
async () =>
{
    JSHelper.Notifier.notify(AuthHelper.AUTH_MENU_USED);
    
    // Global declaration.
    let user,
        changedProperties = {},
        accountManageWindow,
        profileImg;
    
    // Helper functions.
    // Prompt the user for a photograph to
    //be associated with their profile.
    const selectPhoto = 
    async (buttonElement) =>
    {
        let drawer = new Drawer2D(
        async (img, dataURL) =>
        {
            
            // Upload the photo to FireStore.
            let storage = await CloudHelper.awaitComponent(CloudHelper.Service.FIREBASE_STORAGE);
            let storageRef = storage.ref();
            
            let userImages = storageRef.child(AuthHelper.PHOTO_DIR);
            
            let photoFilename = AuthHelper.PHOTO_NAME_PREFIX + user.uid + ".png";
            let photo = userImages.child(photoFilename);
            
            let photoURL;
            
            try
            {
                await photo.putString(dataURL, "data_url");
                
                photoURL = await userImages.child(photoFilename).getDownloadURL();
                await user.updateProfile({ photoURL: photoURL });
                await AuthHelper.publishUserData();
            }
            catch(e)
            {
                SubWindowHelper.alert("Error " + e.code, e.message);
                
                return;
            }
            
            // Set the new photoURL.
            SubWindowHelper.alert("Done!", "Updated photograph!");
            
            // CLose the window.
            accountManageWindow.close();
        },
        {
            initialImage: profileImg,
            imageWidth: AuthHelper.PROFILE_PHOTO_SIZE,
            imageHeight: AuthHelper.PROFILE_PHOTO_SIZE
        });
    };
    
    // Handle a single option (e.g. add an input.
    //See below for usage. Data should be an array
    //of length two. The first element should be the
    //property name, the second, the input type/a button
    //command.
    const handleOption = (description, data, parent) =>
    {
        const userProperty = data[0],
              action       = data[1];
        
        if (typeof (action) === "function")
        {
            // Add a button.
            HTMLHelper.addButton(description, parent, () =>
            {
                action.call(this, this);
            });
        }
        else
        {
            // Add an input.
            HTMLHelper.addLabeledInput(description, user[userProperty], action, parent, 
            (value) =>
            {
                changedProperties[userProperty] = value;
            });
        }
    };
    
    // Define state.
    user = firebase.auth().currentUser;
    
    // Request things of the user, if necessary.
    if (!user.emailVerified)
    {
        try
        {
            await user.sendEmailVerification();
        }
        catch(e)
        {
            await SubWindowHelper.alert("Error " + e.code, e.message);
            
            return;
        }
        
        SubWindowHelper.alert("Email Verification", 
        `
            <p>It looks like you haven't verified your email.
            We've sent you another verification request.
            If you are unable to find this request, please check
            your junk and spam folders.</p>
            <p>Your email is currently listed as ${user.email}.
            If this is in error, please correct it using menus under
            &ldquo;Secured Settings&rdquo;.
        `, undefined, true); // No onclose, but use html.
    }
    
    const singleAuthManaged =
    {
        "Name": ["displayName", "text"],
        "Change Photo": ["photoURL",   selectPhoto]
    };
    
    // Create the window.
    accountManageWindow = SubWindowHelper.create(
    {
        title: "Manage Account",
        className: "accountWindow"
    });
    
    accountManageWindow.enableFlex("column");
    
    
    profileImg = new Image();
    profileImg.crossOrigin = "Anonymous";
    profileImg.setAttribute("title", "Profile Image");
    
    let resetCircle = (waitTime) =>
    {
        // But do it after the display has had time to update.
        setTimeout(() => { accountManageWindow.updateResizeCircleLocation(true); }, waitTime || 200);
    };
    
    // Reset the resize circle's position.
    // TODO Make this better!
    profileImg.addEventListener("load", resetCircle);
    
    // Reset the circle two seconds after load.
    resetCircle(2000);
    
    profileImg.src = await AuthHelper.getProfilePhotoSrc();
    profileImg.classList.add("profilePhoto");
    
    // Add the user's profile photo.
    accountManageWindow.appendChild(profileImg);
    
    for (let description in singleAuthManaged)
    {
        handleOption(description, singleAuthManaged[description], accountManageWindow);
    }
    
    // Add the submit button.
    HTMLHelper.addButton("Submit", accountManageWindow, 
    async () =>
    {
        try
        {
            await user.updateProfile(changedProperties);
            await AuthHelper.publishUserData();
        }
        catch(error)
        {
            SubWindowHelper.alert(error.code, error.message);
            
            return;
        }
        
        accountManageWindow.close();
    });
    
    // Add any double-auth managed state.
    HTMLHelper.addButton("Secured Settings", accountManageWindow,
    async () =>
    {
        await AuthHelper.manageSecureSettings();
        accountManageWindow.close();
    });
};

// Publish user-related data.
AuthHelper.publishUserData = 
async () =>
{
    const dataMismatch = (data, user) =>
    {
        return user.uid !== data.uid || data.displayName !== user.displayName
                    || data.profileURL !== user.photoURL;
    };

    const user = firebase.auth().currentUser;
    
    let database = await CloudHelper.awaitComponent(CloudHelper.Service.FIRESTORE);
    
    let doc = database.collection("userData").doc(user.uid);
    let userDataPublic = await doc.get();
    
    if (!userDataPublic.exists || dataMismatch(userDataPublic.data(), user))
    {
        let docContent = 
        {
            uid: user.uid,
            displayName: user.displayName,
            profileURL: user.photoURL
        };
        
        console.log(docContent);
        
        doc.set(docContent);
    }
};

// Delete all data associated with a user.
AuthHelper.deleteUserData = 
async () =>
{
    // Delete files (for now, just the profile photo).
    const user = firebase.auth().currentUser;
    
    let storage = await CloudHelper.awaitComponent(CloudHelper.Service.FIREBASE_STORAGE);
    let storageRef = storage.ref();
    
    let userImages = storageRef.child(AuthHelper.PHOTO_DIR);
    
    let photoFilename = AuthHelper.PHOTO_NAME_PREFIX + user.uid + ".png";
    let photo = userImages.child(photoFilename);
    
    await photo.delete();
    
    // Delete user data.
    let database = await CloudHelper.awaitComponent(CloudHelper.Service.FIRESTORE);
    
    let userContent = await database.collection("userData").doc(user.uid).get();
    
    if (userContent.exists)
    {
        await database.collection("userData").doc(user.uid).delete();
    }
};

// Manage secured settings -- open a GUI for
//changing password/email/deleting account.
AuthHelper.manageSecureSettings = 
async () =>
{
    // Re-authenticate the user.
    let signInResult = await AuthHelper.signIn();
    
    if (!signInResult)
    {
        return false;
    }
    
    // Create a window with secured settings.
    const accountManageWindow = SubWindowHelper.create(
    {
        title: "Manage Account (Secured Settings)",
        className: "accountWindowSecuredSettings"
    });
    
    // Get the user.
    const user = firebase.auth().currentUser;
    
    // Enable flexible-box
    accountManageWindow.enableFlex("column");
    
    HTMLHelper.addButton("Change Email Address", accountManageWindow,
    async () =>
    {
        accountManageWindow.close();
        
        let emails = {};
        
        do
        {
            emails = await SubWindowHelper.prompt("New Email Address", 
                "Enter and confirm the new email address.",
                { "Email": "text", "Confirm Email": "text" });
        }
        while (emails.Email !== emails["Confirm Email"]);
        
        // Update it!
        try
        {
            await user.updateEmail(emails.Email);
            await user.sendEmailVerification();
        }
        catch(error)
        {
            SubWindowHelper.alert(error.code, error.message);
            return;
        }
        
        SubWindowHelper.alert("Email Address Changed", "Your email address has been changed. Please, verify the new address.");
    });
    
    HTMLHelper.addButton("Change Password", accountManageWindow,
    async () =>
    {
        accountManageWindow.close();
        
        let submitButton;
        
        const passwordChangeWindow = SubWindowHelper.create(
        {
            title: "Change Password",
            className: "accountWindow"
        });
        
        
        HTMLHelper.addLabel("Enter a new password: ", passwordChangeWindow);
        
        const passwordCreator = HTMLHelper.addPasswordConcocter(passwordChangeWindow,
                                                       AuthHelper.PASSWORD_REQUIREMENTS);
        
        submitButton = HTMLHelper.addButton("Submit", passwordChangeWindow, 
        async () =>
        {
            const password = passwordCreator.get();
            
            try
            {
                await user.updatePassword(password);
            }
            catch(error)
            {
                SubWindowHelper.alert(error.message, error.code);
                
                return;
            }
            
            SubWindowHelper.alert("Updated password!", "Your password has been updated.");
            
            passwordChangeWindow.close();
        });
        
        // TODO This looks like duplicated code...
        //      How might this be fixed?
        submitButton.style.height = "0em";
        submitButton.style.transition = "0.4s ease all";
        submitButton.style.overflow = "hidden";
        
        passwordCreator.onValid(() =>
        {
            submitButton.style.height = "1.5em";
        });
        
        passwordCreator.onInvalid(() =>
        {
            submitButton.style.height = "0em";
        });
    });
    
    HTMLHelper.addButton("Delete Account", accountManageWindow,
    async () =>
    {
        const doDelete = await SubWindowHelper.confirm("Confirm Deletion", "Really delete account?", "Yes", "No");
        
        if (!doDelete)
        {
            return;
        }
        
        accountManageWindow.close();
        
        try
        {
            await AuthHelper.deleteUserData();
            await user.delete();
            
            await SubWindowHelper.alert("Deletion", "Account deleted.");
        }
        catch(e)
        {
            await SubWindowHelper.alert("Error: " + e.code, e.message);
        }
    });
};

AuthHelper.isSignedIn = () =>
{
    return AuthHelper.user != undefined;
};

// Initialize on page load.
requestAnimationFrame(
async () =>
{
    await JSHelper.Notifier.waitFor([JSHelper.PAGE_SETUP_COMPLETE], true);
    
    // Only attempt to manage authentication if firebase is defined.
    if (window.firebase)
    {
        window.firebase.auth().onAuthStateChanged((user) =>
        {
            if (user) // User is defined when signed in.
            {
                JSHelper.Notifier.notify(AuthHelper.SIGN_IN_EVENT, user);
            } // Otherwise, the user is signed out.
            else
            {
                JSHelper.Notifier.notify(AuthHelper.SIGN_OUT_EVENT);
            }
            
            // Store the user.
            AuthHelper.user = user;
        });
    }
});

// Inserted file ThreadHelper.js encoding='utf-8'
"use strict";

// Allows THREADED code to execute using eval and workers.
//Note: After adding functions to the thread. Call prepare 
//(or compile, both are the same) before running functions.
function Thread()
{
    this.worker = undefined;
    this.listeners = undefined;
    this.sourceString = 
    `'use strict';
let __FUNCTIONS__ = { };

self.addEventListener("message", function(event)
{
    const data = event.data;
    const args = data.args; // Format: [functionName, listenerId, args]
    const functionName = data.functionName || data.toFn;
    
    console.assert(functionName in __FUNCTIONS__);
    
    const listenerId = data.listenerId || data.fromId;
    let argsToSupply = data.args;
    const functionToCall = __FUNCTIONS__[functionName];
    
    // TODO Combine postError and po
    
    // Replies with an error/success..
    const postResult = function(type, args)
    {
        var toSend = { type: type, toId: listenerId, fromFunction: functionName + "", args: (args || ""), serializedArgs: false };
        
        try
        {
            self.postMessage(toSend);
        }
        catch(e)
        {
            toSend.args = SerializationHelper.serializeObject(args);
            toSend.serializedArgs = true;
            
            self.postMessage(toSend);
        }
    };
    
    // Convienence methods.
    const postSuccess = (args) => postResult("SUCCESS", args);
    const postError = (args) => 
    {
        console.error(args);
        
        return postResult("ERROR", args);
    };
    
    // If the arguments were serialized,
    if (data.argsSerialized)
    {
        // Check for the serialization library.
        try
        {
            console.assert(SerializationHelper.inflateObject != null);
        }
        catch(e)
        {
            // Note the error.
            postError("SerializationHelper must be linked to this thread, to allow processing of one or more of the given arguments.");
            
            return; // Stop.
        }
        
        argsToSupply = [];
        
        // Unserialize.
        for (var i = 0; i < args.length; i++)
        {
            argsToSupply.push(SerializationHelper.inflateObject(args[i]));
        }
    }
    
    // All registered functions MUST return promises.
    functionToCall.apply(self, argsToSupply).then((...responseArgs) =>
    {
        if (responseArgs.length === 1)
        {
            responseArgs = responseArgs[0];
        }
    
        postSuccess(responseArgs);
    }).catch((...errorArgs) =>
    {
        if (errorArgs.length === 1)
        {
            errorArgs = errorArgs[0];
        }
    
        postError(errorArgs);
    });
});
        

    `;

    var me = this; // Keeps a refrence to original context.

    var loadFromSource = function(source)
    {
        // Add libraries to 
    
        // See https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#Transferring_data_to_and_from_workers_further_details
        //and https://developer.mozilla.org/en-US/docs/Web/API/Blob/Blob.
        var blob = new Blob([source], { type: "text/javascript" });
        var scriptURL = URL.createObjectURL(blob);
        
        // If the worker already exists, 
        //terminate it.
        if (me.worker)
        {
            me.worker.terminate();
        }
        
        // Make the worker.
        me.worker = new Worker(scriptURL);
    };
    
    // The key is the function name. The argumentsList variable
    //is either an array of argument names or a string of comma-separated values.
    //All given functions are async.
    this.putFunction = function(key, argumentsList, source)
    {
        if (!(typeof (argumentsList) === "string"))
        {
            argumentsList = (argumentsList || []).join(", ");
        }
        
        if (typeof source === "function")
        {
            let sourceString = source.toString();
            
            source = 
            `
return (${ sourceString }).apply(this, [${ argumentsList }]);
            `;
        }
        
        this.sourceString += `

// Register the function ${key} with those that can be called.
__FUNCTIONS__["${ key }"] = (async (${ argumentsList }) => 
{
    ${ source }
});`;
    };
    
    // Put an object library, like Mat44Helper,
    //or Mat into the thread. Be sure to include
    //ALL OF THE LIBRARY's DEPENDENCIES! This does
    //not work for libraries that depend on the DOM.
    //DANGER: Usage of this method can lead to broken
    //code.
    // Library methods/classes are only accessible by
    //functions placed using putFunction or other libraries
    //(you can't call Mat44Helper.<something> using 
    //Thread.callFunction).
    this.putLibrary = function(libContents, libName)
    {
        var stringContents = libContents.toString();
        
        // If the object was only converted to [object Object],
        //try converting it key by key.
        if (stringContents === "[object Object]")
        {
            stringContents = "let " + libName + " = " + SerializationHelper.stringifyFull(libContents) + ";";
        }
        
        this.sourceString += `
// Imported library.
${ stringContents }
        `;
    };
    
    // This MUST be called before useage of functions.
    this.prepare = function()
    {
        loadFromSource(this.sourceString);
        
        // List of listeners.
        this.listeners = {};
        
        // Keep a refrence to the original context.
        //Added before the use of "me" was found to
        //be necessary.
        var thread = this;
        
        // When a message is sent from the worker,
        this.worker.onmessage = function(event)
        {
            // Find the listener...
            const data = event.data;
            
            // Make sure the listener actually exists...
            console.assert(data.fromFunction in thread.listeners);
            
            let listeners = thread.listeners[data.fromFunction];
            
            // Make sure the listener still exists...
            console.assert(data.toId in listeners);
            
            // Send data to that listener.
            let listener = listeners[data.toId];
            
            let args = data.args;
            
            // If the arguments were serialized, inflate them.
            if (data.serializedArgs)
            {
                args = SerializationHelper.inflateObject(args);
            }
            
            // Notify the listener.
            if (data.type === "ERROR")
            {
                listener.onError(args);
            }
            else
            {
                listener.onComplete(args);
            }
            
            // Remove the listener.
            delete listeners[data.toId];
        };
    };
    
    this.compile = this.prepare; // Link names.
    
    // Returns a promise. Note that args are COPIED
    //before transmission to the thread. If errors
    //occur in transmission of arguments on function
    //calling, try linking the SerializationHelper
    //library.
    this.callFunction = function(fnName, args)
    {
        // So long as the worker to be
        //used exists,
        if (this.worker === undefined)
        {
            throw "This thread must be compiled before it can be run!";
        }
        
        var thread = this; // Keep a refrence to
                           //the calling context.
        return new Promise((accept, reject) =>
        {
            // Create the listeners list, if necessary.
            if (!thread.listeners[fnName])
            {
                thread.listeners[fnName] = {};
            }
            
            // Create a unique listener id.
            const listenerId = (new Date()).getTime();
            
            // Create the message.
            let message = { toFn: fnName, listenerId: listenerId, args: args, argsSerialized: false };
            
            // Post the message.
            try
            {
                thread.worker.postMessage(message);
            }
            catch(exception) // An argument may have been unportable!
            {                //Try to force it.
                            // This will fail if SerializationHelper has
                            //not been linked to the thread.
                if (args) // Only try if args exists.
                {
                    let serializedArgs = [];
                    
                    // Serialize the arguments.
                    for (var i = 0; i < args.length; i++)
                    {
                        serializedArgs.push(SerializationHelper.serializeObject(args[i]));
                    }
                
                    // Change the arguments.
                    message.argsSerialized = true;
                    message.args = serializedArgs;
                
                    // Try to post the message again.
                    thread.worker.postMessage(message);
                }
                else
                {
                    throw exception;
                }
            }
            
            // Set listener properties.
            thread.listeners[fnName][listenerId] = 
            {
                onError: (reason) =>
                {
                    reject(reason);
                },
                onComplete: (args) =>
                {
                    accept(args);
                }
            };
        });
    };
    
    // Get another thread with
    //the same functions.
    this.copy = function()
    {
        var other = new Thread();
        
        other.sourceString = me.sourceString;
        
        if (me.worker)
        {
            other.compile();
        }
        
        return other;
    };
}

var ThreadHelper = {};
ThreadHelper.threadSafeLibraries = {}; // Library names as keys and refrences to the libraries as values.
ThreadHelper.mustAddThreadSafeLibraries = true;

// Make a thread linked with thread-safe libraries.
ThreadHelper.makeLibLinkedThread = function()
{
    // ThreadSafeLibraries is not immediately initialized
    //to prevent refrence errors.
    if (ThreadHelper.mustAddThreadSafeLibraries)
    {
        ThreadHelper.threadSafeLibraries =
        {"Mat": Mat, "Mat44": Mat44, "MatHelper": MatHelper, "Mat44Helper": Mat44Helper, "Point": Point, "Vector3": Vector3, "ModelHelper": ModelHelper, "JSHelper": JSHelper, "ArrayHelper": ArrayHelper,
        "SerializationHelper": SerializationHelper }; 
        
        ThreadHelper.mustAddThreadSafeLibraries = false;
    }
    
    var thread;
    
    // If a library-linked thread already exists,
    //just copy it.
    if (ThreadHelper.__libLinkedThread)
    {
        thread = ThreadHelper.__libLinkedThread.copy();
    }
    else
    {
        var thread = new Thread();
        
        // Otherwise, link it.
        for (var i in ThreadHelper.threadSafeLibraries)
        {
            thread.putLibrary(ThreadHelper.threadSafeLibraries[i], i);
        }
        
        // Make a copy of the thread...
        ThreadHelper.__libLinkedThread = thread.copy();
    }
    
    return thread;
};

// Runs a quick test of the ThreadHelper utility.
ThreadHelper.test = function()
{
    console.log("Testing ThreadHelper...");
    
    var t = ThreadHelper.makeLibLinkedThread();
    t.putFunction("computeVerticies", ["verticies", "startAngle", "endAngle",  "divisions"], ModelHelper.silhouetteToVerticies);
    
    t.compile();
    
    t.callFunction("computeVerticies", [[new Point(0, 0), new Point(1, 1), new Point(3, 3)], 0, Math.PI, 8]).then(result => console.log(result));
    
    return true;
};

// Inserted file setup.js encoding='utf-8'
"use strict";

/**
 * Injects stylesheets necessary for other librarys' proper functioning.
 */

const styleSheets = `
@keyframes fadeIn
{
    0% { filter: opacity(0%); }
    100% { filter: opaicty(100%); }
}

@keyframes fadeOut
{
    0% { filter: opacity(100%); display: block; }
    100% { filter: opacity(0%); display: none; }
}

.windowContainer
{
    box-shadow: 2px 1px 24px rgba(100, 100, 100, 0.6);
    position: fixed;
    background-color: rgba(200, 200, 200, 0.8);
    
    border-top-left-radius: 7px;
}

.windowContainerContent
{
    overflow-y: auto;
    overflow-x: hidden;
}

.windowContainerTitleBar
{
    background-image: radial-gradient(rgba(255, 255, 255, 0.8), rgba(200, 200, 200, 0.9));
    background-size: 4px 3px;
    
    font: 12pt Sans;
    text-shadow: 0px 0px 3px rgba(0, 0, 0, 1);
    color: black;
    
    padding: 4px;
    border-bottom-left-radius: 0px;
    border-top-left-radius: 7px;
    
    user-select: none !important;
    
    cursor: initial;
    
    box-shadow: 0px 2px 3px rgba(0, 0, 0, 0.1);
}

.windowContainerTabZone
{
    background-color: #aaaaaa;
    font: 12pt Sans;
    
    box-shadow: 0px 2px 1px rgba(0, 0, 0, 0.4);
}

.baseTab
{
    cursor: pointer;
    border-bottom: 2px groove gray;
}

.baseTabLabel
{
    padding-right: 5px;
    margin-top: 3px;
    margin-bottom: 3px;
}

.baseMenu
{
    background-color: #aaaaaa;
    box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.4);
    
    animation: fadeIn 0.2s ease;
}

.windowContainerCloseButton
{
    transition: 0.3s ease all;
    
    text-shadow: 0px 0px 3px rgba(255, 0, 0, 0.95);
    color: #bbbbbb;
    
    filter: blur(1px);
    
    animation: fadeIn 0.5s ease;
}

.windowContainerCloseButton:hover
{
    transform: matrix(1, 0, 0.1, 0.9, 0, 0);
    filter: blur(0px);
}

.windowContainerMinimizeButton, .windowContainerMaximizeButton
{
    padding-left: 7px;
    margin-right: 6px;
    margin-left: 4px;
    
    border-color: #dddddd;
    border-style: ridge;
    
    cursor: pointer;
    
    filter: blur(1px);
    
    transform: rotate(0deg);
    
    transition: 1s ease all;
}

.windowContainerMinimizeButton:hover, .windowContainerMaximizeButton:hover
{
    transform: rotate(1deg);
}

.windowContainerMinimizeButton
{
    border-bottom-width: 3px;
    border-top-width: 0px;
    border-left-width: 0px;
    border-right-width: 0px;
}

.windowContainerMaximizeButton
{
    border-top-width: 2px;
    border-left-width: 2px;
    border-right-width: 2px;
    border-bottom-width: 2px;
}

.windowDragElement
{
    top: 0;
    left: 0;
}

.windowContainerResizeZone
{
    animation: fadeIn 0.5s ease;
    
    position: fixed;
    border: 1px solid gray;
    
    box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.4);
    
    padding: 7px;
    
    border-radius: 100%;
}

/* Inserted File.  "widgetStyles.css". */
.progressBarContainer
{
    padding: 0px;
    display: block;
    
    border-radius: 4px;
    box-shadow: inset 2px -2px 3px rgba(0, 0, 0, 0.9);
    
    background-color: rgba(100, 100, 100, 0.4);
    background-image: radial-gradient(rgba(100, 100, 100, 0.3), rgba(150, 10, 150, 0.4), rgba(150, 10, 150, 0.6));
    background-size: 3px 3px;
    
    overflow-y: hidden;
    
    height: 25px;
}

.progressBarTrack
{
    margin: 0px;
    padding: 0px;
    
    height: 25px;
    width: 0px;
    
    background-color: rgba(255, 255, 0, 0.8);
    background-image: linear-gradient(10deg, rgba(100, 255, 255, 0.8), rgba(0, 255, 200, 0.5), rgba(100, 255, 255, 0.8));
    
    transition: 0.5s ease width;
}

.passwordConcocter
{
    border: 1px solid gray;
    border-top-left-radius: 5px;
    
    padding: 6px;
    margin: 3px;
}

.smallInput
{
    width: 50px;
}

/* A different type of tab. */
.hiddenTab
{
    animation: 0.5s ease fadeOut;
    display: none;
}

@keyframes transitTabLabelUnselect
{
    0% { background-color: rgba(100, 20, 200, 0.8); }
    100% { background-color: rgba(0, 0, 0, 0.6); }
}

@keyframes transitTabLabelSelect
{
    0% { background-color: rgba(0, 0, 0, 0.6); }
    100% { background-color: rgba(100, 20, 200, 0.8); }
}

.tabLabel
{
    border-top: 1px solid white;
    border-left: 1px solid white;
    border-right: 1px solid white;
    
    box-shadow: 1px 2px 2px rgba(0, 255, 0, 0.7);
    
    padding: 4px;
    
    margin-right: 5px;
    
    border-top-left-radius: 4px;
    
    color: white;
    
    background-color: rgba(0, 0, 0, 0.6);
    
    font: 12pt Calibri, Monospace, Sans;
    
    flex-grow: 1;
    
    transition: 0.5s ease all;
    
    cursor: pointer;
    
    transform: rotate(0deg);
    
    transition: 0.5s ease all;
}

.tabLabelShown
{
    animation: 0.5s ease fadeIn;
}

.tabLabelHidden
{
    animation: 0.5s ease fadeOut;
    display: none;
}

.tabContentShown
{
    animation: 0.5s ease fadeIn;
    
    flex-grow: 1;
}

/* TODO This is UGLY. Fix it. */
span.tabContentShown
{   
    display: flex;
}

span.tabContentShown > input, span.tabContentShown > button
{
    flex-grow: 1;
}

.tabContentHidden
{
    animation: 0.5s ease fadeOut;
    display: none;
}

.tabLabelUnselected
{
    animation: 0.5s ease transitTabLabelUnselect;
    background-color: rgba(0, 0, 0, 0.6);
    
    font-size: 9pt;
}

.tabLabelSelected
{
    animation: 0.5s ease transitTabLabelSelect;
    background-color: rgba(100, 20, 200, 0.8);
    
    box-shadow: 1px 2px 3px rgba(255, 255, 255, 0.9);
    
    font-size: 12pt;
    
    cursor: cross;
}

.tabLabelUnselected:hover, .tabLabelUnselected:focus
{
    transform: rotate(2deg) scale(1, 1.1);
    margin-right: 0px;
}

.tabDisplay
{
    display: flex;
    flex-direction: row;
}

.tabGroupContainer
{
    width: 100%;
}

input::placeholder
{
    color: #333333;
    opacity: 0.6;
}

.codeEditor
{
    background-color: rgba(0, 0, 0, 0.9);
    overflow-y: hidden;
    flex-direction: column;
}

.codeEditor canvas
{
    flex-shrink: 1;
    flex-grow: 1;
    min-height: 0;
    min-width: 0;
}

code
{
    background-color: #dddddd;
    color: black;
    border-radius: 8px;
    padding: 1px 5px 1px 5px;
    font-family: 'Courier New', Courier, monospace;

    background-image: radial-gradient(rgba(255, 255, 255, 0.5), rgba(0, 0, 0, 0.0));
    background-size: 3px 3px;
}


input, button
{
    background-color: rgba(155, 100, 255, 0.6);
    background-image: linear-gradient(16deg, rgba(100, 100, 255, 0.7), rgba(100, 0, 100, 0.4), rgba(100, 100, 255, 0.7));
    
    border: 1px solid #667766;
    border-radius: 6px;
    
    box-shadow: 1px 2px 3px rgba(0, 0, 0, 0.4);
    
    min-width: 1px;
    
    font: 12pt Serif;
    color: black;
    text-shadow: 0px 0px 2px rgba(0, 0, 0, 0.7);
    
    transform: matrix(1, 0, 0, 1, 0, 0);
    
    transition: 0.5s ease all;
}

input:hover, button:hover, input:active, button:active
{
    transform: matrix(1.0, 0, 0.05, 0.9, 0, 0);
    
    background-color: rgba(155, 100, 200, 0.7);
}

button:focus
{
    background-color: rgba(100, 100, 100, 0.8);
    transform: matrix(1.0, 0, 0, 1.1, 0, 0);
}

canvas
{
    user-select: none;
}`;

const styleSheetElement = document.createElement("style");

// Allow the browser to defer this code.
requestAnimationFrame(function()
{
    document.body.appendChild(styleSheetElement);
    styleSheetElement.outerHTML = "<style>" + styleSheets + "</style>";
});

const ABOUT_PROGRAM = 
`
    This program is licensed to tou under version two
    of the Mozilla Public License. A copy of this license
    should have been distributed with this program.
`;

const DISCLAIMER =
`
    ~~~THIS PROGRAM HAS SLOPPY CODE~~~
        While viewing this page's 
    JavaScript, please note that much
    of it was written using an older
    version of the keyboard included in
    Keyboard.js and a standard
    mobile-device keyboard. As a result,
    much of this page's code is sloppy.
    Please do not use it as an example
    of how to write code. Regardless,
    welcome to the console/debugger
    and may your interest in the
    source of websites/web-apps take
    you far.
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    
    ~~~~~THIS PROGRAM IS STILL~~~~~~
    ~~~~~UNDER DEVELOPMENT    ~~~~~~
        There will be bugs! Work may
    be lost! Segments could hang or
    even crash. Please avoid usage
    of this program for ANYTHING
    important until it has reached
    a stable state.
    
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`;


WebAssembly.Module; // Might fix a bug in Safari.

// Inserted file Editor.js encoding='utf-8'
"use strict";

const EDITOR_SOURCE = "<!DOCTYPE " + "html>\n"
                     +
                     `
                     <!--
                        Note: This source listing includes only
                        INLINE script blocks. If this is the 
                        chunked version of the editor, these
                        will not be visible in this
                        listing.
                     \-->
                     `
                     + 
                     document.documentElement.outerHTML;

var DEFAULT_SPELLCHECK_WORDS = // Define some default words for the spellchecker.
self.DEFAULT_SPELLCHECK_WORDS || // If the DefaultSpellcheckWords.js file wasn't included, use the following:
`hardly
any
default
words
in
this
dictionary
you
should
probably
consider
including
the
spell
help
script
file`;

const VERSION_CODE = "1.11 (Main)";
let noteError = self.noteError || console.error; // Error logging...

function EditControl(ctx)
{
    this.x = 0;
    this.y = 0;
    this.ctx = ctx;
    this.font = "10pt courier, monospace, sans-serif";

    this.syntaxSelector = new SyntaxSelector();

    this.selecting = false;
    this.ctx.font = this.font;

    this.codeEditing = true;
    this.editable = true;

    this.lineH = this.ctx.measureText("M").width * 1.3;

    this.viewOffset = 0;
    this.maxUndo = 200;

    this.lines = [];

    this.removed = [];
    this.stateSaves = [];
    
    this.undoStack = [];
    this.redoStack = [];

    this.trackRemoved = false;

    const me = this;

    this.setDefaultHighlightScheme = function(key)
    {
        me.syntaxSelector.setDefaultHighlightScheme(key);
    };
    
    // Returns an object that can be used to
    //modify the editor's lines.
    this.getLineHelper = function()
    {
        var result = 
        {
            insert: (index, text, mockCreationTime) =>
            {
                var newLine = me.addLine(index, text);
                
                newLine.creationTime = mockCreationTime;
                
                if (mockCreationTime !== undefined)
                {
                    newLine.setModifiedTime(mockCreationTime);
                }
                
                return newLine;
            },
            
            insertLineObject: (index, lineObject) =>
            {
                me.addRawLine(index, lineObject);
            },
            
            update: (index, text, mockUpdateTime) =>
            {
                var selectedLine = me.lines[index];
                
                if (selectedLine === undefined)
                {
                    throw "The requested line does not exist (LineHelper.update)!";
                }
                
                selectedLine.text = text + "";
                
                // If requested, update the given line.
                if (mockUpdateTime !== undefined)
                {
                    if (selectedLine.creationTime > mockUpdateTime)
                    {
                        selectedLine.creationTime = mockUpdateTime;
                    }
                    
                    selectedLine.setModifiedTime(mockUpdateTime);
                }
            },
            
            remove: (index) =>
            {
                if (me.lines[index])
                {
                    me.lines[index].flaggedForRemoval = true;
                }
            }
        };
        
        return result;
    };
    
    // So a sandboxed control can be passed to
    //other objects.
    const lineHelper = me.getLineHelper();

    // Change should be a function, undoing said change
    //and returning a redo function.
    this.noteChange = function(change)
    {
        if (change)
        {
            if (me.undoStack.length >= me.maxUndo)
            {
                me.undoStack.shift(-me.undoStack.length / 4); // TODO This is O(n).
            }
            
            me.undoStack.push(change);
            
            // Clear the redo stack.
            me.redoStack = [];
        }
    };
    
    // Performs a single undo (e.g. one character insert).
    this.performUndo = function()
    {
        let change = me.undoStack.pop();
        
        if (change)
        {
            let redoChange = change(lineHelper);
            
            // If the change provides a redo option...
            if (redoChange)
            {
                me.redoStack.push(redoChange);
            }
            
            // This could have removed some lines.
            me.removeLinesFlaggedForRemoval();
        }
    };
    
    // A single redo!
    this.performRedo = function()
    {
        let change = me.redoStack.pop();
        
        if (change)
        {
            let undoChange = change(lineHelper);
            
            // If the redo provides an undo...
            if (undoChange)
            {
                me.undoStack.push(undoChange);
            }
            
            // Check: Did this remove lines?
            me.removeLinesFlaggedForRemoval();
        }
    };

    this.getUndoStackCopy = function()
    {
        return ArrayHelper.softCopy(me.undoStack);
    };

    this.getRedoStackCopy = function()
    {
        return ArrayHelper.softCopy(me.redoStack);
    };

    this.saveState = function(doNotAddToStack, excludeText)
    {
        var saveState = {};
        
        if (!excludeText)
        {
            saveState.content = me.getText(); // TODO: Make this faster.
        }
        
        saveState.viewOffset = me.viewOffset * 1;
        saveState.editable = me.editable;
        saveState.highlighter = me.syntaxSelector.getDefaultHighlighter();
        saveState.undoStack = me.getUndoStackCopy();
        saveState.redoStack = me.getRedoStackCopy();

        if (!doNotAddToStack)
        {
            me.stateSaves.push(saveState);
        }
        
        return saveState;
    };
    
    // Clears and saves state. Permits caching of lines,
    //rather than the entire content of the document.
    this.saveStateAndClear = function()
    {
        let saveState = me.saveState(false, true);
        saveState.lines = me.lines; // Cache the editor's lines.
        me.clear();
    };

    this.restoreState = function(lastState)
    {
        lastState = lastState || me.stateSaves.pop();

        if (lastState !== undefined)
        {
            me.clear();
            
            if (lastState.content)
            {
                me.displayContent(lastState.content);
            }
            else if (lastState.lines) // If a different set of lines was cached...
            {
                me.lines = lastState.lines;
            }
            
            me.viewOffset = lastState.viewOffset;
            me.editable = lastState.editable;
            me.syntaxSelector.setDefaultHighlighter(lastState.highlighter);
            me.undoStack = ArrayHelper.softCopy(lastState.undoStack);
            me.redoStack = ArrayHelper.softCopy(lastState.redoStack);

            me.refreshPassedLines(0);
        }
    };

    this.setViewOffset = function(newOffset)
    {
        var oldOffset = me.viewOffset;

        me.viewOffset = newOffset;

        me.refreshPassedLines(oldOffset);
    };

    this.setEditable = function(newEditable)
    {
        me.editable = newEditable;
    };

    this.handleKey = function(key, ignoreSpecial)
    {
        var previous = undefined,
            next = undefined;

        var undoFn, allUndoFns = [];

        var i;

        for (i = 0; i < me.lines.length; i++)
        {
            me.lines[i].prepareToHandleKey();
        }

        for (i = 0; i < me.lines.length; i++)
        {
            next = i + 1 < me.lines.length ? me.lines[i + 1] : undefined;

            undoFn = me.lines[i].handleKey(key, previous, next, i, ignoreSpecial);
            
            if (undoFn != undefined)
            {
                allUndoFns.push(undoFn);
            }
            
            previous = me.lines[i];
        };

        me.removeLinesFlaggedForRemoval();

        for (i = 0; i < me.lines.length; i++)
        {
            me.lines[i].afterHandleKey(i);
        }
        
        if (allUndoFns.length > 0)
        {
            me.noteChange(function undoFn(...args)
            {
                let redoFns = [];
            
                // Note changes.
                for (i = 0; i < allUndoFns.length; i++)// - 1; i >= 0; i--)
                {
                    redoFns.push(allUndoFns[i].apply(this, args));
                }
                
                return (function redoFn(...redoArgs)
                {
                    for (i = redoFns.length - 1; i >= 0; i--)
                    {
                        redoFns[i].apply(this, redoArgs);
                    }
                
                    return undoFn;
                });
            });
        }
    };

    this.removeLinesFlaggedForRemoval = function()
    {
        var newLines = [];
        for (let i = 0; i < me.lines.length; i++)
        {
            if (!me.lines[i].flaggedForRemoval)
            {
                newLines.push(me.lines[i]);
            }
            else if (me.trackRemoved)
            {
                me.removed.push([(new Date()).getTime(), i]);
            }
        }

        me.lines = newLines;

        // Maintain that we always have at least one line,
        // even if empty.
        if (me.lines.length === 0)
        {
            me.appendLine(""); // 
            me.focusFirstLine(); // Focus the only line.
        }
    };

    this.handleClick = function(point)
    {
        var viewOffset = me.viewOffset, x = me.x;
        for (var i = 0; i < me.lines.length; i++)
        {
            me.lines[i].x = x;
            me.lines[i].handleClick(i, point, i + viewOffset);
        }
    };
    
    this.addRawLine = function(index, lineObject)
    {
        if (index < me.lines.length)
        {
            me.lines.splice(index, 0, lineObject);
        }
        else
        {
            me.lines.push(lineObject);
        }
    };

    this.addLine = function(index, content)
    {
        me.ctx.font = me.font;
        
        var newLine = new Line(me.ctx, me, me.x, me.y + index * me.lineH, me.lineH, index);
        newLine.text = content;
        
        me.addRawLine(index, newLine);
        
        newLine.updateModifiedTime();

        return newLine;
    };

    this.appendLine = function(content)
    {
        return me.addLine(me.lines.length, content);
    };

    this.shiftViewIfNecessary = function(viewIndex)
    {
        var tIndex = viewIndex + me.viewOffset;

        var oldViewOffset = (me.viewOffset || 0) * 1;

        if (tIndex < 0)
        {
            me.viewOffset = -viewIndex;
            me.y = 0;
        }
        else if (me.lineH != 0 && tIndex > me.ctx.canvas.height / me.lineH - 1)
        {
            var maxLines = Math.floor(me.ctx.canvas.height / me.lineH) - 1;

            me.viewOffset = maxLines - viewIndex;

            me.y = 0;
        }

        var line = me.lines[viewIndex];
        var lenPreCursor = me.ctx.measureText(line.text.substring(0, line.cursorPosition)).width;

        if (lenPreCursor + me.x > me.ctx.canvas.width * 0.9)
        {
            me.x = me.ctx.canvas.width * 0.9 - lenPreCursor;
        }
        else if (me.x + lenPreCursor <= me.ctx.canvas.width * 0.05)
        {
            me.x = -lenPreCursor + me.ctx.canvas.width * 0.05;
        }

        me.refreshPassedLines(oldViewOffset);
    };

    this.render = function()
    {
        // TODO Find a better solution.
        if (me.ctx.canvas.clientHeight !== me.ctx.canvas.height || me.ctx.canvas.clientWidth !== me.ctx.canvas.width)
        {
            me.ctx.canvas.height = me.ctx.canvas.clientHeight || 150;
            me.ctx.canvas.width = me.ctx.canvas.clientWidth || 150;
        }

        me.ctx.clearRect(0, 0, me.ctx.canvas.width, me.ctx.canvas.height);

        me.ctx.font = me.font;
        me.ctx.textBaseline = "top";
        me.lineH = me.ctx.measureText("M").width * 1.5;

        var i;

        for (i = Math.max(-me.viewOffset - 1, 0); i < me.lines.length; i++)
        {
            me.lines[i].x = me.x;
            me.lines[i].h = me.lineH;
            me.lines[i].render(i + me.viewOffset, i);

            if (me.lines[i].y > me.ctx.canvas.height)
            {
                break;
            }
        }
    };

    this.getCursorPosition = function()
    {
        for (var i = 0; i < me.lines.length; i++)
        {
            if (me.lines[i].hasFocus)
            {
                return new Point(me.lines[i].cursorPosition, i);
            }
        }

        return new Point(-1, -1);
    };

    var oldSelStart, oldSelEnd;

    this.deselect = function()
    {
        if (oldSelStart == undefined && oldSelEnd == undefined)
        {
            return false;
        }

        var startIndex = 0;
        var endIndex = me.lines.length;

        if (oldSelStart)
        {
            startIndex = oldSelStart.y;
        }

        if (oldSelEnd)
        {
            endIndex = oldSelEnd.y + 1;
        }

        for (var i = startIndex; i < endIndex; i++)
        {
            if (me.lines[i])
            {
                me.lines[i].deselect();
            }
        }

        oldSelStart = undefined;
        oldSelEnd = undefined;
    };

    this.select = function(point1, point2)
    {
        var i;

        if (point1 === undefined && point2 === undefined)
        {
            for (i = 0; i < me.lines.length; i++)
            {
                me.lines[i].select();
            }

            if (me.lines.length > 0)
            {
                oldSelStart = { line: me.lines[0], y: 0 };
                oldSelEnd = { line: me.lines[me.lines.length - 1], y: me.lines.length - 1 };
            }

            return;
        }

        if (point1.y > point2.y)
        {
            var temp = point1;
            point1 = point2;
            point2 = temp;
        }

        var x1 = point1.x,
            y1 = point1.y,
            x2 = point2.x,
            y2 = point2.y;

        if (x1 < 0 || x2 < 0 || y1 >= me.lines.length
             || y1 < 0 || y2 < 0 || y2 >= me.lines.length)
        {
            return;
        }

        if (y1 === y2)
        {
            var line = me.lines[y1];

            if (x2 < x1)
            {
                var temp = x1;
                x1 = x2;
                x2 = temp;
            }

            line.select(x1, x2);

            oldSelStart = { line: line, y: y1 };
            oldSelEnd = { line: line, y: y2 };

            return;
        }

        var firstLine = me.lines[y1];
        var secondLine = me.lines[y2];
        firstLine.select(x1, firstLine.text.length);
        secondLine.select(0, x2);

        oldSelStart = { line: firstLine, y: y1 };
        oldSelEnd = { line: secondLine, y: y2 };

        for (var i = y1 + 1; i < y2; i++)
        {
            me.lines[i].select();
        }
    };

    this.getSelExtreme = function(direction, oldSelectionObj)
    {
        var result = undefined;

        if (oldSelectionObj && oldSelectionObj.line && oldSelectionObj.line.hasSelection())
        {
            result = {x: oldSelectionObj.line.selRange[direction === 1 ? 0 : 1] || 0, y: oldSelectionObj.y};
        }
        else
        {
            let startY = direction === 1 ? 0 : (me.lines.length - 1);
            let selRangeIndex = direction === 1 ? 0 : 1;

            for (var i = startY; (i < me.lines.length && direction === 1) || (i >= 0 && direction === -1); i += direction)
            {
                if (me.lines[i].hasSelection())
                {
                    result = {x: me.lines[i].selRange[selRangeIndex], y: i};

                    break;
                }
            }
        }

        return result || me.getCursorPosition();
    };

    this.getSelStart = function()
    {
        return me.getSelExtreme(1, oldSelStart);
    };

    this.getSelEnd = function()
    {
        return me.getSelExtreme(-1, oldSelEnd);
    };

    this.getSelectedText = function()
    {
        var result = "";
        var isFirst = true;

        for (var i = 0; i < me.lines.length; i++)
        {
            if (me.lines[i].hasSelection())
            {
                result += isFirst ? "" : '\n';

                result += me.lines[i].getSelectedText();

                isFirst = false;
            }
        }

        return result;
    };

    this.applyToSelection = function(functionToApply)
    {
        let firstLine = me.getSelStart();
        let lastLine = me.getSelEnd();

        for (var i = firstLine.y; i <= lastLine.y && i < me.lines.length; i++)
        {
            if (me.lines[i].hasSelection())
            {
                functionToApply(me.lines[i], i);
            }
        }
    };

    this.indentSelection = function(spaces)
    {
        let numberIndented = 0;

        me.applyToSelection(function(line, index)
        {
            line.indent(spaces || 4);

            numberIndented++;
        });

        return numberIndented;
    };

    this.deindentSelection = function(maxSpaces)
    {
        me.applyToSelection(function(line, index)
        {
            line.deindent(maxSpaces || 4);
        });
    };

    this.isCodeEditing = function()
    {
        return me.codeEditing;
    };

    this.clearSelectedText = function()
    {
        me.handleKey("");
    };

    this.clear = function(doNotResetView)
    {
        me.lines = [];

        if (!doNotResetView)
        {
            me.resetView();
        }
    };

    this.resetView = function()
    {
        me.viewOffset = 0;
        me.x = 0;
    };

    this.displayContent = function(content, processLine)
    {
        var textLines = (content || "undefined").split("\n");
        var newLine;

        for (var i = 0; i < textLines.length; i++)
        {
            newLine = me.addLine(me.lines.length, textLines[i]);
            
            if (processLine)
            {
                processLine(newLine);
            }
        }
    };

    this.getText = function()
    {
        var result = "";

        for (var i = 0; i < me.lines.length; i++)
        {
            result += me.lines[i].text;

            if (i < me.lines.length - 1)
            {
                result += '\n';
            }
        }

        return result;
    };
    
    this.getDelta = function(savedState)
    {
        // TODO: Finish this.
        // savedState should contain a delta object.
        //This delta object contains the changes made,
        //a map from line IDs to changes to these lines.
        var lastDelta = savedState.delta || new Delta();
        var newDelta = new Delta(lastDelta);
        
        // When a delta is added to a line, it is merged with
        //previous deltas.
        for (var i = 0; i < me.lines.length; i++)
        {
            if (!lastDelta.hasLine(me.lines[i]))
            {
                newDelta.insertLine(i, me.lines[i]);
            }
            else if (me.lines[i].getLastTimeModified() > lastDelta.getCreationTime())
            {
                newDelta.updateLine(me.lines[i]);
            }
        }
        
        // Check for removals.
        // Binary search for the starting index.
        var startIndex = ListHelper.binarySearch(me.removed, (listItem) =>
        {
            return listItem[0] - lastDelta.getCreationTime();
        }, true);
        
        for (var i = startIndex; i < me.removed.length; i++)
        {
            newDelta.removeLine(me.removed[i][1], me.removed[i]);
        }
        
        return newDelta;
    };

    this.insert = function(textToInsert)
    {
        if (textToInsert.length < 50)
        {
            for (var i = 0; i < textToInsert.length; i++)
            {
                me.handleKey(textToInsert.charAt(i), true);
            }
        }
        else
        {
            var newText = "";
            var endingText = "";

            // Note that selStart and selEnd
            //default to the cursor's position if no text
            //is selected.
            var selStart = me.getSelStart();
            var selEnd = me.getSelEnd();
            var lastSelectedLine = me.lines[selEnd.y]; // The last line with selection, or the line with focus.

            // Add anything after the selection point to the endingText
            //accumulator (it should go after the inserted text).
            if (lastSelectedLine && lastSelectedLine.hasSelection())
            {
                endingText += lastSelectedLine.text.substring(lastSelectedLine.selRange[1]);
            }
            else if (lastSelectedLine && lastSelectedLine.hasFocus)
            {
                endingText += lastSelectedLine.text.substring(selEnd.x);
            }

            // Add the text to be inserted...
            newText += textToInsert;

            // Add any text remaining on the last, selected line.
            newText += endingText;

            // If inserting before the end, add a line-break.
            if (selEnd.y + 1 < me.lines.length)
            {
                newText += "\n";
            }

            // Find all unselected text...
            for (var i = selEnd.y + 1; i < me.lines.length; i++)
            {
                newText += me.lines[i].text;

                if (i + 1 < me.lines.length)
                {
                    newText += "\n";
                }
            }

            // Remove all lines from the end to the beginning of the selection.
            for (var i = me.lines.length - 1; i > selStart.y; i --)
            {
                me.lines.pop();
            }

            var firstSelectedLine = me.lines[selEnd.y];

            // Remove selected text on the first line.
            if (firstSelectedLine)
            {
                if (firstSelectedLine.hasSelection())
                {
                    firstSelectedLine.text = firstSelectedLine.text.substring(0, firstSelectedLine.selRange[0]);
                }
                else if (firstSelectedLine.hasFocus)
                {
                    firstSelectedLine.text = firstSelectedLine.text.substring(0, selStart.x);
                }
            }

            var firstLineBreak = newText.indexOf("\n");

            if (firstLineBreak === -1)
            {
                firstLineBreak = newText.length;
            }

            var firstLine = newText.substring(0, firstLineBreak);

            if (firstSelectedLine)
            {
                firstSelectedLine.text += firstLine;
            }
            else
            {
                me.appendLine(firstLine);
            }

            newText = newText.substring(firstLineBreak + 1);

            if (newText.length > 0)
            {
                me.displayContent(newText);
            }
        }
    };

    this.unfocus = function()
    {
        for (var i = 0; i < me.lines.length; i++)
        {
            me.lines[i].unfocus();
        }
    };

    this.focusFirstLine = function()
    {
        if (me.lines.length === 0)
        {
            me.appendLine("NO CONTENT");
        }

        me.lines[0].focus();
    }

    var currentRefreshLine = -1, currentEndLine;
    this.refreshPassedLines = function(oldViewOffset, forceEach)
    {
        forceEach = forceEach || false;

        if (me.viewOffset < oldViewOffset)
        {
            let refreshRate = 20;
            
            var refreshLineLoop = function()
            {
                for (var i = 0; i < refreshRate; i++)
                {
                    if (currentRefreshLine > currentEndLine + 1 || currentRefreshLine > me.lines.length)
                    {
                        currentRefreshLine = -1;
                        
                        return;
                    }
                    
                    if (me.lines[currentRefreshLine])
                    {
                        me.lines[currentRefreshLine].refreshHighlitingIfNeeded(currentRefreshLine, forceEach, true); // Ignore timeouts.
                    }

                    currentRefreshLine++;
                }
                
                requestAnimationFrame(refreshLineLoop);
            };
            
            let newEndLine = Math.min(me.lines.length, -me.viewOffset);
            
            let newStartPosition = Math.max(0, -oldViewOffset);
            
            if (newStartPosition > newEndLine)
            {
                return;
            }
            
            if (currentRefreshLine === -1)
            {
                currentRefreshLine = newStartPosition;
                currentEndLine = newEndLine;
                
                refreshLineLoop();
            }
            else
            {
                currentRefreshLine = Math.min(currentRefreshLine, newStartPosition);
                currentEndLine = Math.max(newEndLine, currentEndLine);
            }
        }
    };

    this.noteAllLinesNeedRefresh = () =>
    {
        for (var i = me.lines.length - 1; i >= 0; i--)
        {
            me.lines[i].requestRefresh();
        }
    };

    this.moveView = function(dx, dy)
    {
        var oldViewOffset = me.viewOffset;

        me.x += dx;

        var sign = dy > 0 ? 1 : -1;

        if (dy === 0 || me.lineH === 0)
        {
            return true;
        }

        dy = Math.abs(dy);

        var total = Math.abs(dy + me.y * sign) / me.lineH;
        var dlines = Math.floor(total);
        me.y = (total - dlines) * sign * me.lineH;
        me.viewOffset += dlines * sign;

        var viewOffsetOld = me.viewOffset*1;

        me.viewOffset = -Math.min(me.lines.length - 1, -me.viewOffset);
        me.viewOffset = Math.min(0, me.viewOffset);

        if (viewOffsetOld !== me.viewOffset || me.viewOffset > -1)
        {
            me.y = 0;
        }

        me.x = Math.min(me.x, me.ctx.canvas.width/2);

        me.refreshPassedLines(oldViewOffset);
        
        return me.viewOffset === oldViewOffset;
    };

    var firstLine = this.addLine(0, "[[ JSEdit v. " + VERSION_CODE + " ]]");
    firstLine.hasFocus = true;
    firstLine.cursorPosition = firstLine.text.length;

    firstLine.select();
}

// Note: textExportParentElement can also be a textarea. If so, 
//       then it is used as the import/export zone.
function Editor(textViewerParentElement, keyboardParentElement, 
    textExportParentElement, runFrameParentElement, onRun)
{
    const CLICK_MAX_DISTANCE_MOVE = 10;
    const me = this;

    onRun = onRun || function() {};

    // Assign parent elements based on arguments.
    if (textViewerParentElement && !keyboardParentElement && !textExportParentElement
        && !runFrameParentElement)
    {
        keyboardParentElement = textViewerParentElement;
        textExportParentElement = textViewerParentElement;
        runFrameParentElement = textViewerParentElement;
    }

    me.hiddenControls = [];

    if (!keyboardParentElement)
    {
        keyboardParentElement = document.createElement("div");

        me.hiddenControls.push(keyboardParentElement);
    }

    if (!textExportParentElement)
    {
        textExportParentElement = document.createElement("div");

        me.hiddenControls.push(textExportParentElement);
    }

    if (!runFrameParentElement)
    {
        runFrameParentElement = document.createElement("div");

        me.hiddenControls.push(runFrameParentElement);
    }

    this.timeToRepeatKey = 600;
    this.dtRepeatKey = 150;

    this.saveDir = undefined;

    this.runFrame = document.createElement("iframe");
    this.runFrame.style.display = "none";
    var canUseLocalStorage = true;

    if (textExportParentElement.tagName.toLowerCase() !== "textarea")
    {
        this.copyPasteControl = document.createElement("textarea");
        textExportParentElement.appendChild(me.copyPasteControl);

        try
        {
            if (window.localStorage)
            {
                this.copyPasteControl.value = window.localStorage.getItem("save") || "N/A";
            }
            else
            {
                canUseLocalStorage = false;
            }
        }
        catch(e)
        {
            canUseLocalStorage = false;
        }
    }
    else
    {
        this.copyPasteControl = textExportParentElement;
        canUseLocalStorage = window.localStorage ? true : false;
    }

    this.editCanvas = document.createElement("canvas");
    this.editCanvas.style.touchAction = "none";
    this.editCanvas.style.border = "0px solid black";
    this.editCanvas.style.outline = "none";

    this.editCtx = this.editCanvas.getContext("2d");
    this.editControl = new EditControl(this.editCtx);

    this.keyCanvas = document.createElement("canvas");
    this.keyCtx = this.keyCanvas.getContext("2d");

    var displayingInfo = false;
    var findReplaceEnabled = false;

    this.clipboard = "";

    this.setFont = (newFont) =>
    {
        me.editControl.font = newFont;
    };

    this.getPreUnloadSaveString = function()
    {
        var result =
        JSON.stringify(
        {
            text: me.editControl.getText(),
            viewOffset: me.editControl.viewOffset,
            path: me.saveDir
        });

        return result;
    };

    const updateRestoreString = function()
    {
        if (window.app)
        {
            var changes = me.getPreUnloadSaveString();

            window.app.setRestoreString(changes);
        }
    };

    this.loadFromSaveString = function(saveString)
    {
        // Check for prefixing...
        if (saveString.length > 1 && saveString.charAt(0) != "L" && saveString.charAt(1) != "L")
        {
            var data = JSON.parse(saveString);

            if (typeof data == "string")
            {
                data = JSON.parse(data);
            }

            me.clear();

            me.displayContent(data["text"] || ("GOT: " + saveString + "\nParsed: " + JSON.stringify(data)));

            // If the data has a save directory, note this.
            if (data["path"] && data["path"] !== "undefined")
            {
                me.saveDir = data["path"];

                // Infer the highlight scheme.
                if (me.saveDir.lastIndexOf(".") !== -1)
                {
                    me.editControl.setDefaultHighlightScheme(me.saveDir.substring(me.saveDir.lastIndexOf(".") + 1));
                }
            }

            if (data["viewOffset"])
            {
                me.editControl.setViewOffset(parseFloat(data["viewOffset"]));
            }

            me.editControl.render();
        }
        else
        {
            me.clear();
            
            me.displayContent(saveString.substring(1)); // Non-JSON saves are prefixed. Remove this prefix.
            
            me.editControl.render();
        }
    };

    this.load = function()
    {
        if ((window.app && (me.copyPasteControl.style.display === "none" || me.copyPasteControl.value === "")) || me.saveDir)
        {
            var onComplete = function()
            {
                me.clear();
                me.displayContent(app.getFileContent(me.saveDir) || "NO CONTENT FOUND FOR `" + me.saveDir + "`.");

                if (me.saveDir.lastIndexOf(".") !== -1)
                {
                    me.editControl.setDefaultHighlightScheme(me.saveDir.substring(me.saveDir.lastIndexOf(".") + 1));
                }

                me.editControl.focusFirstLine();

                me.editControl.render();
            };

            if (!me.saveDir)
            {
                me.selectFile(me.saveDir, function()
                {
                    onComplete();
                });
            }
            else
            {
                onComplete();
            }
        }
        else
        {
            me.copyPasteControl.select();
            document.execCommand("paste");

            requestAnimationFrame(function()
            {
                me.clear();
                me.displayContent(me.copyPasteControl.value);

                me.editControl.focusFirstLine();

                me.editControl.render();
            });
        }
    };

    this.save = function()
    {
        var text = me.editControl.getText();

        if (!me.saveDir)
        {

            if (canUseLocalStorage && window.localStorage)
            {
                window.localStorage.setItem("save", text);
            }

            me.copyPasteControl.select();
            me.copyPasteControl.style.display = "block";

            me.copyPasteControl.value = text;

            requestAnimationFrame(function()
            {
                document.execCommand("copy");
            });
        }
        else
        {
            me.copyPasteControl.style.display = "none";

            var resultNotes = app.writeToFile(me.saveDir, text);

            if (resultNotes !== "SUCCESS")
            {
                me.editControl.saveStateAndClear();
                me.editControl.setEditable(false);
                me.editControl.displayContent("Error: `" + resultNotes + "`.");

                setTimeout(() =>
                {
                    me.editControl.restoreState();
                }, 2000);
            }
        }
    };


    var lastSelPoint = undefined;
    this.keyboard = new Keyboard(this.keyCtx, function(key)
    {
        if (key == "📂")
        {
            me.load();
        }
        else if (key == "💾")
        {
            me.save();
        }
        else if (key == "🗂️")
        {
            me.selectFile(me.saveDir);
        }
        else if (key == "⚙️")
        {
            me.advancedOptions();
        }
        else if (key == "📌")
        {
            var currentPoint = me.editControl.getCursorPosition();

            if (lastSelPoint)
            {

 me.editControl.select(lastSelPoint, currentPoint);
                lastSelPoint = undefined;
            }
            else
            {
                lastSelPoint = currentPoint;
            }
        }
        else if (key === "📜" || key === "✂️")
        {
            me.clipboard = me.editControl.getSelectedText();

            if (key === "✂️")
            {
                me.editControl.clearSelectedText();
            }
        }
        else if (key === "📋")
        {
            me.editControl.insert(me.clipboard);
        }
        else if (key === "⚜")
        {
            me.editControl.codeEditing = !me.editControl.codeEditing;
        }
        else if (key === "➕")
        {
            me.editControl.indentSelection();
        }
        else if (key === "➖")
        {
            me.editControl.deindentSelection();
        }
        else if (key === "ℹ")
        {
            if (!displayingInfo)
            {
                var textContent = me.editControl.getText();
                var linesCount = me.editControl.lines.length;
                me.editControl.saveStateAndClear();

                me.editControl.setEditable(false);

                me.editControl.displayContent(`
Information:
Length: ` + textContent.length + ` characters.
Lines: ` + linesCount + `.
File Access: ` + (window.app !== undefined) + `.
Path: ${ me.saveDir }
`);
            }
            else
            {
                me.editControl.restoreState();
            }

            displayingInfo = !displayingInfo;
        }
        else if (key === "🔎")
        {
            me.toggleFindReplace();
        }
        else if (key === "🚘")
        {
            me.toggleRun();
        }
        else if (key === "⚗️")
        {
            me.toggleRun(true);
        }
        else
        {
            me.editControl.handleKey(key);
        }

        me.editControl.render();

        updateRestoreString();
    });

    this.clickKeyCanvas = function(e, noReRender)
    {
      if (e.preventDefault)
      {
        e.preventDefault();
      }
      
      try
      {
        var bbox = me.keyCanvas.getBoundingClientRect();

        var x = e.clientX - bbox.left;
        var y = e.clientY - bbox.top;

        me.keyboard.handleClick(new Point(x, y));

        if (!noReRender)
        {
            me.keyboard.render();
        }
      }
      catch(e)
      {
        noteError(e);
      }
    };

    var pointerDownTime, pointerDown = false;
    JSHelper.Events.registerPointerEvent("down", me.keyCanvas, function(e)
    {
        pointerDownTime = (new Date()).getTime();
        pointerDown = true;

        me.clickKeyCanvas(e);

        var dt = me.dtRepeatKey;

        var lastTime = (new Date()).getTime();
        var clickLoop = function()
        {
            if (!pointerDown)
            {
                return;
            };

            var nowTime = (new Date()).getTime();

            if (nowTime - pointerDownTime > me.timeToRepeatKey && nowTime - lastTime > dt)
            {
                for (var i = 0; i < (nowTime - lastTime) / dt && i < 10; i++)
                {
                    me.clickKeyCanvas(e, true);
                }

                me.keyboard.render();

                dt *= 0.95;

                lastTime = nowTime;
            }

            requestAnimationFrame(clickLoop);
        };

        clickLoop();
    });

    JSHelper.Events.registerPointerEvent("move", me.keyCanvas, function(e)
    {
        if (pointerDown)
        {
            e.preventDefault();
        }
    });

    JSHelper.Events.registerPointerEvent("stop", me.keyCanvas, function(e)
    {
        pointerDown = false;
        
        e.preventDefault();

        me.editCanvas.focus();
    });

    me.editCanvas.onclick = function(e)
    {
      try
      {
        var bbox = me.editCanvas.getBoundingClientRect();

        var x = e.clientX - bbox.left;
        var y = e.clientY - bbox.top;

        me.editControl.handleClick(new Point(x, y));

        me.editControl.render();
      }
      catch(e)
      {
        noteError(e);
      }
    };

    var editPointerDown = false;
    var lastEditPointerLocation, distancePointerTraveled;
    JSHelper.Events.registerPointerEvent("down", this.editCanvas, function(e)
    {
        var bbox = me.editCanvas.getBoundingClientRect();
        lastEditPointerLocation = new Point(e.clientX - bbox.left, e.clientY - bbox.top);

        editPointerDown = true;

        e.preventDefault();

        me.editCanvas.focus();
        
        distancePointerTraveled = 0;

        return false;
    });

    JSHelper.Events.registerPointerEvent("move", this.editCanvas, function(e)
    {
        if (!editPointerDown)
        {
            return;
        }

        e.preventDefault();

        var bbox = me.editCanvas.getBoundingClientRect();
        var point = new Point(e.clientX - bbox.left, e.clientY - bbox.top);

        var dx = point.x - lastEditPointerLocation.x;
        var dy = point.y - lastEditPointerLocation.y;

        var xSign = dx > 0 ? 1 : -1;
        var ySign = dy > 0 ? 1 : -1;

        me.editControl.moveView(dx * 2, dy * dy * ySign / 2);
        me.editControl.render();
        
        distancePointerTraveled += Math.sqrt(dx * dx + dy * dy);

        lastEditPointerLocation = point;

        return true;
    });

    JSHelper.Events.registerPointerEvent("up", this.editCanvas, function(e)
    {
        editPointerDown = false;
        
        if (distancePointerTraveled < CLICK_MAX_DISTANCE_MOVE)
        {
            var bbox = me.editCanvas.getBoundingClientRect();

            var x = e.clientX - bbox.left;
            var y = e.clientY - bbox.top;

            me.editControl.handleClick(new Point(x, y));
            
            me.editControl.render();
        }

        me.editCanvas.focus();
        e.preventDefault();
    });

    JSHelper.Events.registerPointerEvent("leave", this.editCanvas, function(e)
    {
        editPointerDown = false;
        e.preventDefault();
    });

    this.editCanvas.onpointercancel = me.editCanvas.onpointerup;

    this.editCanvas.onpointerleave = me.editCanvas.onpointerup;

    this.editCanvas.addEventListener("keypress", function(event)
    {
        if (!event.ctrlKey && event.key !== "Enter")
        {
            me.editControl.handleKey(event.key);
        }

        me.editControl.render();

        event.preventDefault();

        updateRestoreString();

        return true;
    }, true);

    const WHEEL_PIXEL_MODE = 0;
    const WHEEL_LINE_MODE = 1;
    const WHEEL_PAGE_MODE = 2;

    this.editCanvas.addEventListener("wheel", function(event)
    {
        var dy = event.deltaY;
        var lineHeight = me.editControl.lineH; 

        if (dy !== 0)
        {
            if (event.deltaMode === WHEEL_LINE_MODE)
            {
                dy *= lineHeight;
            }
            else if (event.deltaMode === WHEEL_PAGE_MODE)
            {
                dy *= lineHeight * 25;
            }

            // Scroll the view, not the page.
            dy *= -1;

            var didNotMove = me.editControl.moveView(0, dy);
            
            if (!didNotMove)
            {
            	event.preventDefault();
            }
        }

        me.editControl.render();
    });

    this.editCanvas.addEventListener("keydown", function(event)
    {
        if (!event.shiftKey)
        {
            
            if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "ArrowLeft"
                    || event.key === "ArrowRight" || event.key === "Backspace" || event.key === "Tab"
                    || event.key === "Escape")
            {
                requestAnimationFrame(() =>
                {
                    let indentCount = 0;

                    if (event.key === "Tab")
                    {
                        indentCount = me.editControl.indentSelection();
                    }

                    if (event.key !== "Backspace")
                    {
                        me.editControl.deselect();
                    }
                    
                    if (indentCount === 0 && event.key !== "Escape")
                    {
                        me.editControl.handleKey(event.key);
                    }

                    me.editControl.render();
                });

                event.preventDefault();
                event.stopPropagation();

                return true;
            }
        }
        else if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "ArrowLeft" || event.key === "ArrowRight")
        {
            var selStart = me.editControl.getSelStart();
            var selEnd = me.editControl.getSelEnd();

            me.editControl.handleKey(event.key);

            var cursorPosition = me.editControl.getCursorPosition();

            if (cursorPosition.x === selStart.x && cursorPosition.y === selStart.y && selStart.x > 0)
            {
                selStart.x -= 1;
            }
            else if (cursorPosition.y < selStart.y || (cursorPosition.y === selStart.y && cursorPosition.x < selStart.x))
            {
                selStart = cursorPosition;
            }
            else if (cursorPosition.y > me.selEnd || (cursorPosition.y === selEnd.y && cursorPosition.x > selEnd.x))
            {
                selEnd = cursorPosition;
            }
            else
            {
                var dyToStart = Math.abs(cursorPosition.y - selStart.y),
                    dyToEnd = Math.abs(cursorPosition.y - selEnd.y),
                    dxToStart = Math.abs(cursorPosition.x - selStart.x),
                    dxToEnd = Math.abs(cursorPosition.x - selEnd.x);

                // If closer to the starting selection...
                if (dyToStart < dyToEnd || (dyToStart == dyToEnd && dxToStart < dxToEnd))
                {
                    selStart = cursorPosition;
                }
                else
                {
                    selEnd = cursorPosition;
                }
            }

            me.editControl.deselect();
            me.editControl.select(selStart, selEnd);

            me.editControl.render();
            event.preventDefault();
        }

        
        if (event.key === "Enter")
        {
            me.editControl.handleKey(event.key);

            me.editControl.render();
            event.preventDefault();
        } 
        else if (event.key === "Delete")
        {
            me.editControl.handleKey("ArrowRight")
            me.editControl.handleKey("Backspace");

            me.editControl.render();

            event.preventDefault();
        }// Mobile Safari sends " ", rather than "Space"
        else if (event.key === " " || event.key === "Space")
        {
            me.editControl.handleKey(" ");
            me.editControl.render();

            event.preventDefault();
        } // Handle control-key commands.
        else if (event.ctrlKey)
        {
            if (event.key === "c" || event.key === "x")
            {
                me.clipboard = me.editControl.getSelectedText();

                if (event.key === "x")
                {
                    me.editControl.clearSelectedText();
                }

                me.editControl.deselect();
            }
            else if (event.key === "v")
            {
                me.editControl.insert(me.clipboard);

                me.editControl.deselect();
            }
            else if (event.key === "f")
            {
                me.toggleFindReplace();
            }
            else if (event.key === "s")
            {
                me.save();
            }
            else if (event.key === "r") // Reads the file.
            {
                me.load();
            }
            else if (event.key === "o" && window.app) // Reads the file.
            {
                me.selectFile(me.saveDir);
            }
            else if (event.key === "g")
            {
                me.advancedOptions();
            }
            else if (event.key === "u")
            {
                me.editControl.deselect();
            }
            else if (event.key === "z")
            {
                me.editControl.performUndo();
            }
            else if (event.key === "y")
            {
                me.editControl.performRedo();
            }
            else if (event.key === "d")
            {
                me.editControl.deindentSelection();
            }
            else if (event.key === "a")
            {
                me.editControl.select();
            }
            else if (event.key === "e") // Execute the program.
            {
                me.toggleRun();
            }
            else if (event.key === "i") // Run as JavaScript
            {
                me.toggleRun(true);
            }
            else if (event.key === "p")
            {
                me.editControl.codeEditing = !me.editControl.codeEditing;
            }

            me.editControl.render();
            event.preventDefault();
        }

        updateRestoreString();

        // Take ownership. We may handle it in onkeypress.
        event.stopPropagation();

        return true;
    }, true);

    this.editCanvas.setAttribute('tabindex', 1);

    this.toggleRun = function(inCurrentPage)
    {
        if (inCurrentPage) // If we could access device internals, we still allow running in
        {                  // the current context. Give a warning.
            var contentToRun = me.editControl.getText();
            
            me.editControl.saveStateAndClear();
            
            me.editControl.appendLine("Danger!").editable = false;
            me.editControl.appendLine(" * Make sure you trust this script! Running untrusted scripts").editable = false;
            me.editControl.appendLine("   ON THE SAME PAGE AS THIS EDITOR can comprimise the security").editable = false;
            me.editControl.appendLine("   of this editor and perhaps your device.").editable = false;
            me.editControl.appendLine(" * Your program will be interpreted as JavaScript through an").editable = false;
            me.editControl.appendLine("   \"eval\". If your program is not JavaScript or you don't").editable = false;
            me.editControl.appendLine("   know what this means, DO NOT RUN YOUR PROGRAM.").editable = false;
            me.editControl.appendLine("Do you really want to run this program as a SCRIPT in the current page?").editable = false;
            
            const yesLine = me.editControl.appendLine("YES");
            const noLine = me.editControl.appendLine("NO");
            
            yesLine.editable = false;
            noLine.editable = false;
            
            requestAnimationFrame(() =>
            {
                if (!window.app) 
                {
                    yesLine.focus();
                }
                else            // If we have access to additional privlidges,
                {                // make it harder to click "yes."
                    noLine.focus();
                }
                
                me.editControl.render();
            });
            
            yesLine.onentercommand = async () =>
            {
                const PROMPT_TEXT = "> ";

                me.editControl.restoreState();
                me.editControl.saveStateAndClear();

                // View as JS.
                me.editControl.setDefaultHighlightScheme("js");

                const printResult = (result) =>
                {
                    const lines = result.split('\n');

                    for (const line of lines)
                    {
                        let newLine = me.editControl.appendLine(line);
                        newLine.editable = false;

                        newLine.setColorFunction = (index) =>
                        {
                            return "#ffaf70";
                        };
                    }
                };
                
                // Show output...
                const result = await EditorHelper.__runOutOfContext(contentToRun);
                printResult(result);
                    
                const doneLine = me.editControl.appendLine("DONE");
                me.editControl.appendLine("");

                let scriptLine;
                
                const createScriptLine = () =>
                {
                    if (scriptLine)
                    {
                        scriptLine.editable = false;
                        scriptLine.onentercommand = () => {};
                    }

                    scriptLine = me.editControl.appendLine(PROMPT_TEXT);

                    scriptLine.onentercommand = async () =>
                    {
                        let newCommand = scriptLine.text.substring(PROMPT_TEXT.length);
                        scriptLine.text = PROMPT_TEXT + newCommand;

                        const result = await EditorHelper.__runOutOfContext(newCommand);
                        printResult(result);

                        createScriptLine().focus();
                        scriptLine.cursorPosition = scriptLine.text.length;

                        me.scrollToFocus();
                        requestAnimationFrame(() => me.editControl.render());
                    };

                    return scriptLine;
                };

                createScriptLine();
                
                requestAnimationFrame(() =>
                {
                    doneLine.focus();
                    me.editControl.render();
                });
                
                doneLine.editable = false;
                
                doneLine.onentercommand = () =>
                {
                    me.editControl.restoreState();
                };
            };
            
            noLine.onentercommand = () =>
            {
                me.editControl.restoreState();
                // ... and do nothing more ...
            };
            
            return; // Don't also run in the iframe...
        }
    
        if (me.runFrame.style.display === "block")
        {
            me.runFrame.style.display = "none";
            me.runFrame.src = "data:text/html;charset=UTF-8,Loading...";
        }
        else
        {
            me.updateRunFrame();
        }
    };

    this.updateRunFrame = function()
    {
        var contentToRun = me.editControl.getText();

        runFrameParentElement.removeChild(me.runFrame);

        me.runFrame = document.createElement("iframe");
        me.runFrame.style.backgroundColor = "white";
        me.runFrame.style.display = "block";
        me.runFrame.src = "about:blank";

        runFrameParentElement.appendChild(me.runFrame);

        if (runFrameParentElement === textViewerParentElement)
        {
            me.runFrame.width = me.editCanvas.width;
            me.runFrame.height = me.editCanvas.height;
        }
        else
        {
            me.runFrame.style.width = "calc(100% - 10px)";
            me.runFrame.style.height = "auto";
        }

        if (!onRun(contentToRun, me.runFrame))
        {
            try
            {
                me.runFrame.contentWindow.document.open();
                me.runFrame.contentWindow.document.write(contentToRun);
                me.runFrame.contentWindow.document.close();
            }
            catch(e)
            {
                console.error(e);

                // Failure: Try opening as a data url.
                me.runFrame.src = "data:text/html;base64," + btoa(contentToRun);
            }
        }
    };

    var viewingAdvancedOptions = false;
    this.advancedOptions = function()
    {
        if (viewingAdvancedOptions)
        {
            viewingAdvancedOptions = false;
            
            me.editControl.restoreState();
            
            return;
        }
        
        me.editControl.saveStateAndClear();
        
        viewingAdvancedOptions = true;

        var titleLine = me.editControl.appendLine("Advanced Options:");
        titleLine.editable = false;

        var loadEditorSource = me.editControl.appendLine("Load Editor's Source");
        loadEditorSource.editable = false;

        var setFont = me.editControl.appendLine("Font: " + me.editControl.font);

        var selectHighlightScheme = me.editControl.appendLine("Select Coloring Scheme");
        selectHighlightScheme.editable = false;

        var shareAsTextLine = window.app ? me.editControl.appendLine("Share as Text") : null;
        var shareAsHTMLTextLine = window.app ? me.editControl.appendLine("Share as HTML Text") : null;

        var setPathToSpellingDictionary = window.app ? me.editControl.appendLine("Set Path to Spellcheck Dictionary") : null;
        var runSpellCheck = me.editControl.appendLine("Check Spelling");
        
        var checkSyntax = me.editControl.appendLine("Check Syntax");
        checkSyntax.editable = false;
        
        var wrapLongLines    = me.editControl.appendLine("Wrap Long Lines (Method A)");
        wrapLongLines.editable = false;

        var wrapTextInput = me.editControl.appendLine("Wrap Long Lines (Method B)");
        wrapTextInput.editable = false;

        var exitLine = me.editControl.appendLine("Hide Advanced Options");
        exitLine.editable = false;

        exitLine.focus();

        const exitAdvancedOptions = () =>
        {
            me.editControl.restoreState();
            viewingAdvancedOptions = false;
        };

        exitLine.onentercommand = function()
        {
            exitAdvancedOptions();
        };

        loadEditorSource.onentercommand = function()
        {
            exitAdvancedOptions();

            me.saveDir = undefined;

            me.editControl.clear();

            me.editControl.displayContent(EDITOR_SOURCE);
            me.editControl.focusFirstLine();

            me.editControl.setDefaultHighlightScheme("html");
        };

        selectHighlightScheme.onentercommand = function()
        {
            me.editControl.clear();

            var handleLine = function(schemeLabel)
            {
                var newLine = me.editControl.appendLine("Apply: " + schemeLabel);

                newLine.onentercommand = function()
                {
                    exitAdvancedOptions();

                    me.editControl.setDefaultHighlightScheme(SyntaxHelper.highlighters[schemeLabel]);
                    me.editControl.noteAllLinesNeedRefresh();

                    me.editControl.render();
                };
            };

            for (var label in SyntaxHelper.highlighters)
            {
                handleLine(label);
            }

            var cancelLine = me.editControl.appendLine("Cancel");

            cancelLine.editable = false;

            cancelLine.onentercommand = function()
            {
                exitAdvancedOptions();
            };

            requestAnimationFrame(function()
            {
                cancelLine.focus();
                me.editControl.render();
            });
        };

        setFont.onentercommand = function()
        {
            let lineText = setFont.text;

            if (lineText && lineText.indexOf(": ") !== -1)
            {
                me.editControl.font = lineText.substring(lineText.indexOf(": ") + 2);
            }
        };
        
        checkSyntax.onentercommand = function()
        {
            exitAdvancedOptions();
            
            me.toggleSyntaxCheck();
        };
        
        wrapLongLines.onentercommand = function()
        {
            exitAdvancedOptions();
            
            me.wrapLongLines();
        };
        
        wrapTextInput.onentercommand = function()
        {
            exitAdvancedOptions();
            
            me.wrapTextWithLineBreaks();
        };

        if (setPathToSpellingDictionary != undefined)
        {
            setPathToSpellingDictionary.onentercommand = function()
            {
                exitAdvancedOptions();

                me.saveDir = app.getInternalStorageDirectory() + "/spellcheck.txt";
            };
        }

        if (runSpellCheck != undefined)
        {
            runSpellCheck.onentercommand = function()
            {
                exitAdvancedOptions();

                me.spellCheck();
            };
        }

        if (shareAsTextLine != undefined && shareAsHTMLTextLine != undefined)
        {
            // TODO Reduce code duplication.
            shareAsTextLine.onentercommand = function()
            {
                exitAdvancedOptions();

                // Send the text.
                window.app.shareAsText(me.editControl.getText());
            };

            shareAsHTMLTextLine.onentercommand = function()
            {
                exitAdvancedOptions();

                // Send the HTML-based text.
                window.app.shareAsHTMLText(me.editControl.getText());
            };
        }
    };
    
    var checkingSyntax = false;
    this.toggleSyntaxCheck = function()
    {
        if (checkingSyntax)
        {
            me.editControl.restoreState();
        }
        else
        {
            var text = me.editControl.getText().split("\n");
            var syntaxChecker = new SyntaxChecker();
        
            me.editControl.saveStateAndClear();
            
            var exitLine = me.editControl.appendLine("Exit");
            exitLine.focus();
            
            exitLine.onentercommand = function()
            {
                me.toggleSyntaxCheck();
            };
            
            syntaxChecker.reset();
            
            //console.log(text);
            
            for (var lineNumber = 0; lineNumber < text.length - 1; lineNumber++)
            {
                syntaxChecker.checkLine(text[lineNumber], lineNumber, false, {});
            }
            
            if (text.length - 1 >= 0)
            {
                syntaxChecker.checkFinalLine(text[text.length - 1], text.length - 1, {});
            }
            
            var problems = syntaxChecker.getProblems();
            
            var handleProblem = (problem) =>
            {
                var newLine = me.editControl.appendLine(problem.lineNumber + ": " + (problem.message || problem.check + " failed. No message."));
                
                newLine.onentercommand = function()
                {
                    me.toggleSyntaxCheck();
                    me.editControl.lines[problem.lineNumber].focus();
                };
            };
            
            for (var i = 0; i < problems.length; i++)
            {
                handleProblem(problems[i]);
            }
        }
        
        checkingSyntax = !checkingSyntax;
    };
    
    me.wrappingLongLines = false;
    this.wrapLongLines = function() // A method added, lost, and re-added.
    {
        if (me.wrappingLongLines)
        {
            me.editControl.restoreState();
            me.wrappingLongLines = false;
            
            return;
        }
        
        me.wrappingLongLines = true;
        
        let toWrap = me.editControl.getText();
        
        me.editControl.saveStateAndClear();

        let quoteOptionText = "Quote ('\") Option: ";
        let maximumLengthText = "Maximum length: ";
        let maximumLength = 78;
        let quoteOptions = ["BREAK", "BREAK_AND_CONCAT", "DO_NOT_BREAK"];
        let autoIndent  = true;
        let quoteOptionIndex = 0;
        
        let quoteActions =
        {
            "BREAK": (line, index) =>
            {
                return "\n";
            },
            "BREAK_AND_CONCAT": (line, index, quoteChar, indentLevel) =>
            {
                return quoteChar + " + \n" + indentLevel + quoteChar;
            },
            "DO_NOT_BREAK": (line, index) =>
            {
                return "";
            }
        };
        
        const wrapText = (initialText) =>
        {
            let result = "";
            let currentWord = "";
            let inQuoteType = undefined; // The type of quote currently in.
            let lineLength = 0;
            let currentChar;
            let indentCount = 0;
            let indent = "";
            
            for (let i = 0; i < initialText.length; i++)
            {
                currentChar = initialText.charAt(i);
                lineLength++;
                
                if (currentChar == " " && lineLength === indentCount + 1
                        && autoIndent)
                {
                    indentCount ++;
                    indent += " ";
                }
                
                if (inQuoteType === currentChar)
                {
                    inQuoteType = undefined;
                    result += currentWord + currentChar;
                    currentWord = "";
                    
                    continue;
                }
                else if ((currentChar == "'" || currentChar == '"') && inQuoteType === undefined)
                {
                    inQuoteType = currentChar;
                }
                else if (currentChar == "\n")
                {
                    lineLength = 0;
                    inQuoteType = undefined; // Out of any quotes we were in.
                }
                else if (currentChar == " " || currentChar == '\t')
                {
                    result += currentWord;
                    currentWord = "";
                }
                
                currentWord += currentChar;
                
                if (lineLength + currentWord.length > maximumLength)
                {
                    let newLineLength = 0, newPart;
                    
                    if (inQuoteType === undefined)
                    {
                        newPart = indent + currentWord;
                        result += "\n" + newPart;
                        newLineLength += newPart.length;
                    }
                    else
                    {
                        newPart = quoteActions[quoteOptions[quoteOptionIndex]](result, i, 
                                        inQuoteType, indent) + currentWord;
                        result += newPart;
                        
                        let breakIndex = newPart.indexOf("\n");
                        
                        if (breakIndex >= 0)
                        {
                            newLineLength = newPart.length - breakIndex;
                        }
                        else
                        {
                            newLineLength = lineLength + newPart.length;
                        }
                    }
                    
                    currentWord = "";
                    lineLength  = newLineLength;
                }
            }
            
            return result + currentWord;
        };

        let maximumLengthLine = me.editControl.appendLine(maximumLengthText + maximumLength);
        let quoteOption       = me.editControl.appendLine(quoteOptionText + "BREAK");
        let indentOption      = me.editControl.appendLine("Auto-indent: ON");
        let cancelLine        = me.editControl.appendLine("   CANCEL   ");
        let submitLine        = me.editControl.appendLine("   SUBMIT   ");
        
        submitLine.editable = false;
        cancelLine.editable = false;
        indentOption.editable = false;
        quoteOption.editable = false;
        
        maximumLengthLine.onentercommand = function()
        {
            const newLengthPart = maximumLengthLine.text.substring(maximumLengthText.length);
            maximumLength = MathHelper.forceParseInt(newLengthPart);
        };
        
        quoteOption.onentercommand = function()
        {
            quoteOptionIndex++;
            quoteOptionIndex %= quoteOptions.length;
            
            quoteOption.text = quoteOptionText + quoteOptions[quoteOptionIndex];
        };
        
        indentOption.onentercommand = function()
        {
            autoIndent = !autoIndent;
            indentOption.text = "Auto-indent: " + (autoIndent ? "ON" : "OFF");
        };
        
        submitLine.onentercommand = function()
        {
            me.wrappingLongLines = false;
            
            me.editControl.restoreState();
            me.editControl.clear(true);
            
            let wrapped = wrapText(toWrap);
            
            me.editControl.displayContent(wrapped);
        };

        cancelLine.onentercommand = function()
        {
            me.wrappingLongLines = false;
            
            me.editControl.restoreState();
        };

        requestAnimationFrame(function()
        {
            maximumLengthLine.focus();
        });
    };


    var showingWrapDialog = false;
    this.wrapTextWithLineBreaks = function()
    {
        if (showingWrapDialog)
        {
            me.editControl.restoreState();
            showingWrapDialog = false;
        }
        else
        { /* Otherwise, show the dialog! */
            showingWrapDialog = true;
            
            var allText = me.editControl.getText();
            me.editControl.saveStateAndClear();
            
            // Constants
            const maxLineLengthText = "Maximum Line Length:";
            const breakWordText = "Break Word:";
            
            const MIN_WORD_INDEX_FRACTION = 1/8;
            const MIN_WORD_INDEX_VALUE_ALTERNATE = 6; // If minimum length is disabled...
            const WORD_SEP_CHARACTERS = {};
            
            // Generate WORD_SEP_CHARACTERS...
            const wordSepCharsList = " .?;[]{}<>\\%^\t=,-+!*".split("");
            
            for (const character of wordSepCharsList)
            {
                WORD_SEP_CHARACTERS[character] = character; // Map each character to itself so we can
                                                            // use "in"...
            }
            
            // Flags
            let maximumLengthEnabled = true;
            let breakWords = true;
            
            // Notes.
            var selectionNote = me.editControl.appendLine("** This will be applied to all lines in the document. **");
            selectionNote.editable = false;
            
            // Inputs.
            var maximumLengthEnabledInput = me.editControl.appendLine(maxLineLengthText + " (ENABLED)");
            maximumLengthEnabledInput.editable = false;
            
            var maximumLineLengthInput = me.editControl.appendLine("100");
            
            me.editControl.appendLine("").focus();
            
            var breakWordInput = me.editControl.appendLine(breakWordText + " (ENABLED)");
            
            var wrapBeforeRegexInput = me.editControl.appendLine("Add Break Before Regex: []");  
            var wrapAfterRegexInput = me.editControl.appendLine("Add Break After Regex: []");
            
            var submitLine = me.editControl.appendLine("Wrap");
            submitLine.editable = false;
            
            var cancelLine = me.editControl.appendLine("Cancel");
            
            requestAnimationFrame(() => 
            { 
                cancelLine.focus(); 
                me.editControl.render();
            }); // Focus after propagation of enter.
            
            cancelLine.editable = false;
            
            // Logic
            cancelLine.onentercommand = function()
            {
                me.editControl.restoreState();
                showingWrapDialog = false;
            };
            
            maximumLengthEnabledInput.onentercommand = function()
            {
                maximumLengthEnabled = !maximumLengthEnabled;
                
                let enabledDisabledText = "(ENABLED)";
                
                if (!maximumLengthEnabled)
                {
                    enabledDisabledText = "(DISABLED)";
                }
                
                maximumLengthEnabledInput.text = maxLineLengthText + enabledDisabledText;
            };
            
            breakWordInput.onentercommand = function()
            {
                breakWords = !breakWords;
                
                let enabledDisabledText = "(ENABLED)";
                
                if (!breakWords)
                {
                    enabledDisabledText = "(DISABLED)";
                }
                
                breakWordInput.text = breakWordText + enabledDisabledText;
            };
            
            submitLine.onentercommand = function()
            {
                var parseNumber = (MathHelper ? MathHelper.forceParseInt : parseInt);
                
                var getRegexInputText = (inputLine) =>
                {
                    let lineText = inputLine.text;
                    let colonIndex = lineText.indexOf(":");
                    
                    if (colonIndex < 0)
                    {
                        throw "Error! getRegexInputText called on invalid line!";
                    }
                    
                    let regexText = lineText.substring(colonIndex + 1);
                    return regexText;
                };
                
                var maxLength = parseNumber(maximumLineLengthInput.text);
                var wrapBefore = new RegExp(getRegexInputText(wrapBeforeRegexInput));
                var wrapAfter = new RegExp(getRegexInputText(wrapAfterRegexInput));
                
                // Loop setup.
                var lines = allText.split("\n");
                var processingStack = [];
                var filteredLines = [];
                var wrapBeforeTestPoint, wrapAfterTestPoint;
                var wrapPoint, preWrapPoint, postWrapPoint, wrapCurrentLine;
                var currentLine;
                var i = 0;
                
                // While still lines to process...
                while (i < lines.length || processingStack.length > 0)
                {
                    if (processingStack.length === 0)
                    {
                        processingStack.push(lines[i]);
                        i ++;
                    }
                    
                    currentLine = processingStack.pop();
                    
                    wrapPoint = currentLine.length;
                    wrapCurrentLine = false;
                    
                    if (maximumLengthEnabled && wrapPoint > maxLength)
                    {
                        wrapPoint = maxLength;
                        wrapCurrentLine = true;
                    }
                    
                    wrapBeforeTestPoint = currentLine.search(wrapBefore);
                    wrapAfterTestPoint = currentLine.search(wrapAfter);
                    
                    if (wrapBeforeTestPoint >= 0 && wrapBeforeTestPoint < wrapPoint) // Found?
                    {
                        wrapPoint = wrapBeforeTestPoint;
                        wrapCurrentLine = true;
                    }
                    
                    if (wrapAfterTestPoint >= 0 && wrapAfterTestPoint + 1 < wrapPoint)
                    {
                        wrapPoint = wrapAfterTestPoint + 1; // Add one so as to wrap after.
                        wrapCurrentLine = true;
                    }
                    
                    if (!breakWords && wrapCurrentLine)
                    {
                        let j = wrapPoint;
                        let minIndex = // Give up on finding the start of a word at this index.
                            Math.max(MIN_WORD_INDEX_VALUE_ALTERNATE, // Make sure we don't start at zero...
                                maximumLengthEnabled ? maxLength * MIN_WORD_INDEX_FRACTION 
                                    : MIN_WORD_INDEX_VALUE_ALTERNATE); // If we can't use maximum length... 
                                                                       // just use the minimum break index.
                        
                        // Backtrack to last suitable character.
                        for (; j >= minIndex; j --)
                        {
                            if (currentLine.charAt(j) in WORD_SEP_CHARACTERS)
                            {
                                break; // Stop & use this j.
                            }
                        }
                        
                        wrapPoint = j; // Break at this j instead.
                    }
                    
                    preWrapPoint = currentLine.substring(0, wrapPoint);
                    postWrapPoint = currentLine.substring(wrapPoint);
                    
                    filteredLines.push(preWrapPoint);
                    
                    if (postWrapPoint.length > 0 && wrapCurrentLine)
                    {
                        if (wrapPoint > 0)
                        {
                            processingStack.push(postWrapPoint);
                        }
                        else
                        {
                            filteredLines.push(postWrapPoint);
                        }
                    }
                } // End while.
                
                var newText = filteredLines.join("\n");
                
                // Reset & display.
                me.editControl.restoreState();
                me.editControl.clear();
                me.editControl.displayContent(newText);
                showingWrapDialog = false;
            }; // End onentercommand.
        }
    };

    this.spellCheck = function()
    {
        var textToCheck = me.editControl.getText();
        var wordsToCheck = me.editControl.getText().split(/[ \t\n.;!?=0-9]/g);

        me.editControl.saveStateAndClear();

        var spellingDictionaryKey = self.app ? self.app.getInternalStorageDirectory() + "/spellcheck.txt" : "SPELLCHECK_DICTIONARY";
        var haveStorageHelper = true;

        try
        {
            StorageHelper.get;
        }
        catch(e)
        {
            haveStorageHelper = false;
        }

        var writeOutDictionary = (newContent) =>
        {
            if (self.app)
            {
                return app.writeToFile(spellingDictionaryKey, newContent);
            }
            else
            {
                if (haveStorageHelper)
                {
                    StorageHelper.put(spellingDictionaryKey, newContent);

                    return "SUCCESS";
                }

                return "StorageHelper is not present! Cannot access words!";
            }
        };

        var readInDictionary = () =>
        {
            if (self.app)
            {
                return app.getFileContent(spellingDictionaryPath) || DEFAULT_SPELLCHECK_WORDS;
            }

            if (haveStorageHelper && StorageHelper.has(spellingDictionaryKey))
            {
                return StorageHelper.get(spellingDictionaryKey) + "";
            }

            return DEFAULT_SPELLCHECK_WORDS;
        }

        var wordsJoined = readInDictionary();
        var checkAgainstWords = wordsJoined.split(/[ \t\n.?!;?=0-9\<\>\-_\=\+\'\"\`\[\]\(\)\\\/\{\}\:\|]/g);

        var filteredWords = [];

        for (var i = 0; i < checkAgainstWords.length; i++)
        {
            if (checkAgainstWords[i] !== "")
            {
                filteredWords.push(checkAgainstWords[i].toUpperCase());
            }
        }

        filteredWords.sort();

        var findWord = function (word, precision, startIndex, endIndex, depth, returnClosest)
        {
            endIndex = endIndex !== undefined ? endIndex : filteredWords.length;
            startIndex = startIndex !== undefined ? startIndex : 0;
            let checkIndex = Math.floor((startIndex + endIndex) / 2);
            depth = depth || 0;

            let compareTo = filteredWords[checkIndex];

            var currentPrecision = precision || Math.max(word.length, compareTo.length);

            if (depth > 22)
            {
                return returnClosest ? checkIndex : false;
            }

            if (word.substring(0, currentPrecision).toUpperCase() === compareTo.substring(0, currentPrecision).toUpperCase())
            {
                return compareTo;
            }
            else if (startIndex !== checkIndex && word.toUpperCase() > compareTo.toUpperCase())
            {
                startIndex = checkIndex;

                return findWord(word, precision, startIndex, endIndex, depth + 1, returnClosest);
            }
            else if (startIndex !== checkIndex)
            {
                endIndex = checkIndex;

                return findWord(word, precision, startIndex, endIndex, depth + 1, returnClosest);
            }

            return returnClosest ? checkIndex : false;
        };

        var getSuggestions = function(word, checkedWords)
        {
            let iterations = 1, foundWord, suggestions = [];
            let centerIndex = findWord(word, undefined, undefined, undefined, undefined, true);
            let currentIndex = centerIndex;
            
            checkedWords = checkedWords || {};

            while (suggestions.length < 4 && currentIndex >= 0 && currentIndex < filteredWords.length)
            {
                foundWord = filteredWords[currentIndex];
                
                if (foundWord && !checkedWords[foundWord])
                {
                    suggestions.push(foundWord);
                    checkedWords[foundWord] = true;
                }

                iterations++;
                
                if (iterations % 2 === 0)
                {
                    currentIndex = centerIndex + iterations / 2;
                }
                else
                {
                    currentIndex = centerIndex - Math.floor(iterations / 2);
                }
            }

            if (word.length > 3 && suggestions.length < 16)
            {
                let newWord = word.substring(1);
                
                suggestions = suggestions.concat(getSuggestions(newWord, checkedWords));
            }

            return suggestions;
        };

        var buffer = "";
        var currentChar;
        var errors = {};
        var errorsCount = 0;

        for (var i = 0; i < textToCheck.length; i++)
        {
            currentChar = textToCheck.charAt(i);

            if (currentChar.toUpperCase() >= 'A' && currentChar.toUpperCase() <= 'Z')
            {
                buffer += currentChar;
            }
            else if (currentChar === " " || currentChar === "\n" || currentChar === "-" || currentChar === "\t")
            {
                if (!findWord(buffer) && buffer.length > 0)
                {
                    errors[i] = buffer;

                    errorsCount++;
                }

                buffer = "";
            }
            else
            {
                buffer = "";
            }
        }

        var handleNewLine = function(errorIndex, word)
        {
            var newLine = me.editControl.appendLine("[-] " + word + " at " + errorIndex + ". ");
            newLine.editable = false;

            newLine.onentercommand = function()
            {
                me.editControl.clear();

                me.editControl.appendLine("Suggestions for " + word + ".");
                var addToDictionaryLine = me.editControl.appendLine("Add " + word + " to dictionary.");
                addToDictionaryLine.editable = false;
                var cancelLine = me.editControl.appendLine("~~CANCEL~~");
                cancelLine.editable = false;

                cancelLine.focus();

                cancelLine.onentercommand = function()
                {
                    me.editControl.clear();

                    addLines();
                };

                addToDictionaryLine.onentercommand = function()
                {
                    var writeText = wordsJoined + "\n" + word;

                    wordsJoined = writeText;
                    delete errors[errorIndex];

                    var result = writeOutDictionary(writeText);

                    if (result !== "SUCCESS")
                    {
                        noteError(result);
                    }
                    else
                    {
                        cancelLine.onentercommand();
                    }
                };

                var handleSuggestion = function(suggestionText)
                {

                    if (word.toLowerCase() === word)
                    {
                        suggestionText = suggestionText.toLowerCase();
                    }
                    else if (suggestionText.length > 0
                            && word.length > 1 && word.charAt(0) === word.charAt(0).toUpperCase() && word.substring(1).toLowerCase() === word.substring(1))
                    {
                        suggestionText = suggestionText.charAt(0).toUpperCase() + suggestionText.substring(1).toLowerCase();
                    }
                    else if (word.toUpperCase() !== word)
                    {
                        suggestionText = suggestionText.toLowerCase();
                        let suggestionTextNew = "";

                        for (let i = 0; i < word.length && i < suggestionText.length; i++)
                        {
                            suggestionTextNew += (word.charAt(i).toUpperCase() === word.charAt(i)) ? suggestionText.charAt(i).toUpperCase() : suggestionText.charAt(i);
                        }

                        suggestionText = suggestionTextNew + suggestionText.substring(suggestionTextNew.length);
                    }

                    var suggestionLine = me.editControl.appendLine(" " + suggestionText);

                    suggestionLine.onentercommand = function()
                    {
                        textToCheck = textToCheck.substring(0, errorIndex) + suggestionText + textToCheck.substring(errorIndex + word.length);

                        delete errors[errorIndex];

                        cancelLine.onentercommand();
                    };
                };

                var suggestions = getSuggestions(word);

                for (var j = 0; j < suggestions.length; j++)
                {
                    handleSuggestion(suggestions[j]);
                }
            };
        };

        var addLines = function()
        {
            var exitLine = me.editControl.appendLine("Exit (" + filteredWords.length + " to be checked)...");
            exitLine.editable = false;

            var errorsCountDisplay = me.editControl.appendLine("Found " + errorsCount + " errors.");
            errorsCountDisplay.editable = false;

            if (errorsCount > 0)
            {
                var addAllToDictionary = me.editControl.appendLine("Add All Errors to Dictionary");
                var addedWords = {};

                addAllToDictionary.editable = false;

                addAllToDictionary.onentercommand = function()
                {

                    var appendText = "";

                    for (var i in errors)
                    {
                        if (!addedWords[errors[i]])
                        {
                            addedWords[errors[i]] = true;

                            appendText += "\n" + errors[i].toUpperCase();
                        }
                    }

                    var writeText = wordsJoined + appendText;

                    var result = writeOutDictionary(writeText);

                    if (result !== "SUCCESS")
                    {
                        noteError(result);
                    }
                    else
                    {
                        exitLine.onentercommand();
                    }
                };
            }

            for (var errorIndex in errors)
            {
                handleNewLine(errorIndex, errors[errorIndex]);
            }

            exitLine.onentercommand = function()
            {
                me.editControl.restoreState();

                me.editControl.clear(true); // No view reset.
                me.displayContent(textToCheck);
            };
        };

        addLines();
    };

    var selectingFile = false;
    this.selectFile = function(basePath, onComplete)
    {
        basePath = basePath || "/";

        if (!selectingFile && window.app)
        {
            selectingFile = true;

            var getDirectory = (path) =>
            {
                return path.substring(0, path.lastIndexOf("/"));
            };

            var currentPath = basePath;

            me.editControl.saveStateAndClear();

            me.editControl.setEditable(true);

            var directoryLine = me.editControl.appendLine(currentPath);
            var submitLine = me.editControl.appendLine("Select");
            var runCommandLine = me.editControl.appendLine("%: ");
            var subPathLines = [];

            var clearSubPathLines = () =>
            {
                // Hide lines from the previous display of contents.
                for (var i = 0; i < subPathLines.length; i++)
                {
                    subPathLines[i].flaggedForRemoval = true;
                }

                me.editControl.removeLinesFlaggedForRemoval();

                subPathLines = [];
            };

            submitLine.editable = false;

            var listSubDirsAndFiles = (path) =>
            {
                clearSubPathLines();


                var directory = getDirectory(path);

                var filesList = (app.listFiles(directory) || "").split("\n");

                var handleLine = function(fileName)
                {
                    if (fileName === "")
                    {
                        return;
                    }
                    else if (fileName.endsWith("@"))
                    {
                        fileName = fileName.substring(0, fileName.length - 1) + "/";
                    }

                    var newLine = me.editControl.appendLine("> " + fileName);

                    newLine.onentercommand = function()
                    {
                        if (!fileName.startsWith(".."))
                        {
                            directoryLine.text = directory + "/" + fileName;
                        }
                        else
                        {
                            directoryLine.text = directory.substring(0, directory.lastIndexOf("/")) + "/";
                        }

                        listSubDirsAndFiles(directoryLine.text);

                        if (!fileName.endsWith("/"))
                        {
                            submitLine.focus();
                        }
                    };

                    subPathLines.push(newLine);
                };

                for (var i = 0; i < filesList.length; i++)
                {
                    handleLine(filesList[i]);
                }

                directoryLine.focus();
            };

            directoryLine.onentercommand = function()
            {
                listSubDirsAndFiles(directoryLine.text);
            };

            runCommandLine.onentercommand = function()
            {
                clearSubPathLines();

                var command = runCommandLine.text.substring(runCommandLine.text.indexOf(": ") + 2);
                var directory = getDirectory(directoryLine.text);

                runCommandLine.text = "%: ";

                var fullCommand = "";

                if (directory !== "")
                {
                    fullCommand = "cd " + directory + " && ";
                }

                fullCommand += command;

                var result = app.getCommandResult(fullCommand);
                result = "% " + fullCommand + "\n" + result;

                var handleLine = function(lineContent)
                {
                    var newLine = me.editControl.appendLine("| " + lineContent);
                    newLine.editable = false;

                    subPathLines.push(newLine);
                };

                var newLines = result.split("\n");

                for (var i = 0; i < newLines.length; i++)
                {
                    handleLine(newLines[i]);
                }

                runCommandLine.focus();
            };

            listSubDirsAndFiles(currentPath);

            submitLine.onentercommand = function()
            {
                me.saveDir = directoryLine.text + "";

                me.editControl.restoreState();

                selectingFile = false;

                if (onComplete)
                {
                    onComplete();
                }
            };
        }
        else if (window.app)
        {
            me.editControl.restoreState();

            selectingFile = false;
        }
    };

    this.toggleFindReplace = function(toFindInitial, replaceWithInitial, initialReplaceMode, displayResults)
    {
        if (!findReplaceEnabled)
        {
            var lines = me.editControl.getText().split("\n");

            me.editControl.saveStateAndClear();

            me.editControl.setEditable(true);

            var editedLines = [];

            var replaceMode = initialReplaceMode || false;
            var toFind = toFindInitial || "", replaceWith = replaceWithInitial || "";

            var inputLine;

            var setUpInputs = function()
            {
                var firstLine = me.editControl.appendLine(replaceMode ? "Replace With: " : "Find: ");
                firstLine.editable = false;

                inputLine = me.editControl.appendLine(replaceMode ? (replaceWith || "Replace Text Here") : (toFind || "RegExp Here"));

                inputLine.select();
                inputLine.focus();

                firstLine.onentercommand = function()
                {
                    if (!replaceMode)
                    {
                        firstLine.text = "Replace With:";

                        toFind = inputLine.text + "";

                        inputLine.text = replaceWith || "Replace Text Here";

                        requestAnimationFrame(() =>
                        {
                            inputLine.select();
                            inputLine.focus();

                            me.editControl.render();
                        });
                    }
                    else
                    {
                        replaceWith = inputLine.text + "";

                        firstLine.text = "Find: ";
                        inputLine.text = toFind || "RexExp Here";
                    }

                    replaceMode = !replaceMode;
                };
            };

            setUpInputs();

            inputLine.onentercommand = function(line)
            {
                // Clear all edited lines.
                for (var i = 0; i < editedLines.length; i++)
                {
                    editedLines[i].flaggedForRemoval = true;
                }

                me.editControl.removeLinesFlaggedForRemoval();
                editedLines = [];

                // Cache replacable text.
                if (!replaceMode)
                {
                    toFind = line.text;
                }
                else
                {
                    replaceWith = line.text;
                }

                var searchExp;
                var newLine, results, indicies, info, lastIndex, currentIndex;

                searchExp = new RegExp(toFind, "g");

                for (var i = 0; i < lines.length; i++)
                {
                    searchExp.lastIndex = 0;

                    indicies = [];
                    info = [];

                    lastIndex = -1;
                    currentIndex = 0;

                    while ((results = searchExp.exec(lines[i])) !== null && currentIndex !== lastIndex)
                    {
                        lastIndex = currentIndex;

                        indicies.push(searchExp.lastIndex);
                        info.push(results[0]);

                        currentIndex = searchExp.lastIndex;
                    }

                    if (indicies.length > 0)
                    {

                        newLine = me.editControl.appendLine(i + ": " + lines[i] + " (" + info.join(", ") + ")");

                        let index = i*1;
                        let firstOccurranceIndex = indicies[0];

                        newLine.editable = false;
                        newLine.onentercommand = function()
                        {
                          if (!replaceMode)
                          {
                              requestAnimationFrame(function()
                            {
                                me.toggleFindReplace();

                                var line = me.editControl.lines[index];
                                line.focus();
                                line.cursorPosition = firstOccurranceIndex;
                                me.editControl.shiftViewIfNecessary(index);
                                me.editControl.render();
                            });
                          }
                          else
                          {
                            requestAnimationFrame(function()
                            {
                              searchExp.lastIndex = 0;

                              me.toggleFindReplace();

                              var line = me.editControl.lines[index];
                              line.text = line.text.replace(searchExp, replaceWith);

                              me.toggleFindReplace(searchExp, replaceWith, true, true);

                              me.editControl.render();
                            });
                          }
                        };

                        editedLines.push(newLine);
                    }
                } // End for loop.

                // Allow every match to be replaced if in replace mode.
                if (replaceMode)
                {
                    newLine = me.editControl.appendLine("Replace All");

                    newLine.editable = false;

                    newLine.onentercommand = function()
                    {
                        requestAnimationFrame(() =>
                        {
                            me.toggleFindReplace();

                            var currentLine;

                            for (var i = 0; i < me.editControl.lines.length; i++)
                            {
                                currentLine = me.editControl.lines[i];

                                searchExp.lastIndex = 0;

                                currentLine.text = currentLine.text.replace(searchExp, replaceWith);
                            }

                            me.editControl.render();
                        });
                    };

                    editedLines.push(newLine);
                }
            };

            if (displayResults)
            {
                requestAnimationFrame(() =>
                {
                    inputLine.onentercommand(inputLine);

                    me.editControl.render();
                });
            }
        }
        else
        {
            me.editControl.restoreState();
        }

        findReplaceEnabled = !findReplaceEnabled;
    };

    me.clear = me.editControl.clear;
    me.displayContent = me.editControl.displayContent;
    me.render = me.editControl.render;
    me.getText = me.editControl.getText;
    me.scrollToFocus = () =>
    {
        me.editControl.shiftViewIfNecessary(me.editControl.getSelEnd().y);
    };

    me.keyCanvas.width = me.keyboard.maxX;
    me.keyCanvas.height = me.keyboard.maxY;

    me.editCanvas.width = window.innerWidth;//me.keyCanvas.width;
    me.editCanvas.height = (window.innerHeight * 0.9 - me.keyCanvas.height);

    // If sharing a parent, make room for the keyboard.
    if (textViewerParentElement === keyboardParentElement)
    {
        me.editCanvas.style.height = "calc(90vh - " + me.keyCanvas.height + "px)";
    }
    else
    {
        me.editCanvas.style.height = "auto"; // And assume the user applied
                                             //some style to resize the canvas.
    }

    me.editCanvas.style.width = "calc(100% - 2px)";

    me.keyboard.render();

    me.editControl.render();

    textViewerParentElement.appendChild(me.editCanvas);
    keyboardParentElement.appendChild(me.keyCanvas);
    runFrameParentElement.appendChild(me.runFrame);
}

var EditorHelper = {};

// Evaluate text as JavaScript in a dedicated environment...
EditorHelper.__runOutOfContext = async (text) =>
{
    return await JSHelper.Environs.request("editorRunJSEnviron").push(text);
};

EditorHelper.openWindowedEditor = (initialText, onComplete, options) =>
{
    options = options || {};

    let runWindow = SubWindowHelper.create({ title: "Run", minWidth: 100, minHeight: 100 });
    let importExportWindow = SubWindowHelper.create({ title: "Import or Export", noResize: true });
    let keyboardWindow = SubWindowHelper.create({ title: "Keyboard", alwaysOnTop: true, noResize: true });
    let viewerWindow = SubWindowHelper.create({ title: options.title || "View and Edit", minWidth: 350, minHeight: 350 });

    viewerWindow.content.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    viewerWindow.enableFlex();

    runWindow.enableFlex();

    let editor = new Editor(viewerWindow.content, keyboardWindow.content, 
        importExportWindow.content, runWindow.content, options.onRun || function(source)
    {
        runWindow.toTheFore();
    });
    
    viewerWindow.setOnCloseListener(() =>
    {
        runWindow.close();
        importExportWindow.close();
        keyboardWindow.close();
        
        if (onComplete)
        {
            onComplete(editor.editControl.getText());
        }
    });
    
    if (initialText)
    {
        editor.clear();
        
        editor.displayContent(initialText);
        
        editor.editControl.render();
    }
    
    if (options.configureWindows)
    {
        options.configureWindows(runWindow, importExportWindow, keyboardWindow, viewerWindow);
    }
    
    return editor;
}

// Replace a textarea with a tabbed editor.
EditorHelper.replaceWithEditor = (elem, options) =>
{
    options = options || 
    {
        height: 400,
        font: undefined, // use the default...
        highlightScheme: undefined
    };

    const KEYBOARD_BUTTON_MARGIN = 4;

    // Textbox and its parent...
    const container = document.createElement("div");
    const editorParent = document.createElement("div");
    const editorElem = document.createElement("div");
    const textboxParent = document.createElement("div");
    const textboxGrowzone = document.createElement("div");
    const previewElem = document.createElement("div");

    elem.replaceWith(container);
    textboxParent.appendChild(elem);
    textboxGrowzone.appendChild(textboxParent);
    editorParent.appendChild(editorElem);

    elem.style.height = options.height + "px";
    editorElem.style.height = options.height + "px";

    textboxParent.style.display = "flex";
    elem.style.flexGrow = 1;
    editorElem.classList.add("codeEditor");
    editorElem.style.display = "flex";
    editorParent.style.paddingTop = "2px";

    // Keyboard...
    const keyboardParent = document.createElement("div");
    let oldKeyboardWindow = undefined;
    
    let currentTabName = undefined;

    const tabView = HTMLHelper.addTabGroup(
    {
        "Textbox": textboxGrowzone,
        "Editor": editorParent,
        "Preview": previewElem
    }, container, "Editor");
    
    const editor = new Editor(editorElem, keyboardParent, elem, previewElem, () =>
    {
        if (currentTabName !== "Preview")
        {
            tabView.selectTab("Preview");
        }

        editor.runFrame.style.display = "block";
        editor.runFrame.height = options.height;
        editor.runFrame.style.height = options.height + "px";

        return false;
    });

    if (options.font)
    {
        editor.setFont(options.font);
    }

    if (options.highlightScheme)
    {
        editor.setDefaultHighlightScheme(options.highlightScheme)
    }

    editor.clear();
    editor.displayContent(elem.value);
    editor.render();

    // Show & hide keyboard
    let showKeyboardButton = HTMLHelper.addButton("⌨", editorElem, () =>
    {
        if (oldKeyboardWindow)
        {
            oldKeyboardWindow.destroy();
        }

        let keyboardWindow = SubWindowHelper.create(
        { 
            title: "Keyboard", 
            alwaysOnTop: true, 
            noResize: true,
            withPage: true
        });

        keyboardWindow.appendChild(keyboardParent);

        oldKeyboardWindow = keyboardWindow;
    });

    showKeyboardButton.style.flexShrink = 1;
    showKeyboardButton.style.flexGrow = 0;
    showKeyboardButton.style.color = "white";
    showKeyboardButton.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    showKeyboardButton.style.width = "min-content";

    let priorElemValue = elem.value;

    const updateEditorText = () =>
    {
        if (elem.value !== priorElemValue)
        {
            editor.clear();
            editor.displayContent(elem.value);

            priorElemValue = elem.value;
        }
    };

    const updateElemText = () =>
    {
        elem.value = editor.getText();
        priorElemValue = elem.value;
    };

    // Handle tab switching.
    const handleTabSwitching = async () =>
    {
        while (true)
        {
            const newTabName = await tabView.tabChanged.waitFor(HTMLHelper.TAB_CHANGED);

            if (newTabName === "Textbox" && currentTabName === "Editor")
            {
                updateElemText();
            }
            else if ((newTabName === "Editor" || newTabName === "Preview") 
                    && currentTabName === "Textbox")
            {
                updateEditorText();
            }

            // Adjust the editor to the canvas' size and render
            // any updates.
            if (newTabName === "Editor")
            {
                editor.render();
            }

            // Handle preview-related management.
            if (newTabName === "Preview")
            {
                if (currentTabName === "Editor")
                {
                    updateElemText();
                }
                else if (currentTabName === "Textbox")
                {
                    updateEditorText();
                }
                
                editor.updateRunFrame();
            }

            currentTabName = newTabName;
        }
    };

    handleTabSwitching();

    editor.editCanvas.addEventListener("blur", () =>
    {
        updateElemText();
    });

    editor.editCanvas.addEventListener("focus", () =>
    {
        updateEditorText();
    });

    return editor;
};

// Inserted file ProgressEstimator.js encoding='utf-8'
"use strict";

function ProgressEstimator(runFunction)
{
    this.startTime = undefined;
    this.estimatedConstant = 0;
    this.runFunction = runFunction;
    this.addedConstant = 0;
    this.progressLoopRunning = false;
    this.inRecord = false;
    
    // RunningTime is a function, like n => n*n or n => lg(n).
    //This is like theta/omicron notation, except can be more exact
    //if a +n, or +c term is included.
    this.setRunFunction = function(runningTime)
    {
        this.runFunction = runningTime;
    };
    
    this.startRecord = function()
    {
        this.startTime = (new Date()).getTime();
        this.inRecord = true;
    };
    
    this.stopProgressLoopIfRunning = function()
    {
        if (this.progressLoopRunning)
        {
            this.shouldStopProgressLoop = true;
        }
    };
    
    // ArgumentLength should fullfill the parameter
    //given in the run function.
    this.stopRecord = function(argumentLength)
    {
        let endTime = (new Date()).getTime();
        let deltaTime = endTime - this.startTime;
        
        this.inRecord = false;
        
        this.stopProgressLoopIfRunning();
        
        // If no arguments were given,
        //use this as an opportunity
        //to determine the added constant.
        if (argumentLength === 0)
        {
            this.addedConstant = deltaTime;
            
            return;
        }
        
        let singleSampleEstimate = deltaTime / this.runFunction(argumentLength);
        
        // If the estimated constant is zero, and this
        //constant is nonzero, set it. It assumes
        //the more recent estimate is more accurate than the previous
        //(the user could have opened a new program, etc); however
        //the estimatedConstant is weighted in favor of the previous estimatedConstant.
        //Look into whether this should be changed.
        if (this.estimatedConstant != 0)
        {
            this.estimatedConstant = this.estimatedConstant * 0.7 + singleSampleEstimate * 0.3;
        }
        else
        {
            this.estimatedConstant = singleSampleEstimate;
        }
    };
    
    // The prediction must have been started with startRecord.
    this.predictProgress = function(argumentsLength)
    {
        let endTime = (new Date()).getTime();
        let deltaTime = endTime - this.startTime;
        
        let totalTime = (this.estimatedConstant * this.runFunction(argumentsLength) + this.addedConstant);
        let currentTime = deltaTime;
        
        let result = 1;
        
        if (totalTime !== 0)
        {
            result = currentTime / totalTime;
        }
        
        return result;
    };
    
    // Keep predicting progress in a loop, until
    //the record is stopped.
    this.predictProgressLoop = function(argumentCount, onUpdate)
    {
        this.progressLoopRunning = true;
        this.shouldStopProgressLoop = false;
        
        // Start a new record if one has
        //not already been started.
        if (!this.inRecord)
        {
            this.startRecord();
        }
        
        let me = this;
        
        let loop = function()
        {
            if (!me.progressLoopRunning)
            {
                return;
            }
            
            onUpdate(me.predictProgress(argumentCount));
            
            requestAnimationFrame(loop);
        };
        
        loop();
    };
}

// Inserted file Transition.js encoding='utf-8'
"use strict";

function Transition(updateFunction, duration, doneFunction, beforeStart)
{
    var me = this;
    var startTime = (new Date()).getTime();
    var progress = 0;
    var currentTime, deltaT;
    var halt = false;
    var endProgressMultiplier = 1;
    var endProgress = 1;
    var running = false;
    var temporaryOnComplete = () => {};
    
    var progressCalculator = function(duration, deltaT)
    {
        if (duration === 0)
        {
            return 1;
        }
        else
        {
            return Math.max(0, Math.min(1, deltaT / duration));
        }
    };
    
    var animate = function()
    {
        if (halt)
        {
            halt = false;
            running = false;
            return;
        }
    
        currentTime = (new Date()).getTime();
        deltaT = currentTime - startTime;
        
        progress = progressCalculator(duration, deltaT);
        
        updateFunction.call(me, progress);
        
        if (progress * endProgressMultiplier < endProgress * endProgressMultiplier)
        {
            running = true;
            requestAnimationFrame(animate);
        }
        else
        {
            running = false;
            
            doneFunction.call(me);
            temporaryOnComplete.call(me);
        }
    };
    
    this.start = function()
    {
        halt = false;
        startTime = (new Date()).getTime();
        
        if (beforeStart)
        {
            beforeStart.apply(me, arguments);
        }
        
        // If not already running, start!
        if (!running)
        {
            animate();
        }
        
        // Return a promise!
        let result = new Promise((resolve, reject) =>
        {
            // Link the oncomplete action
            //to the resolve function.
            temporaryOnComplete = resolve;
        });
        
        return result;
    };
    
    this.cancel = function()
    {
        halt = true;
        
        // Clear the temporary oncomplete.
        temporaryOnComplete = undefined;
    };
    
    // Make the animation run in reverse by reversing
    //the progress!
    this.reverse = function()
    {
        var oldProgressCalculator = progressCalculator;
        progressCalculator = function(duration, deltaT)
        {
            return 1 - oldProgressCalculator(duration, deltaT);
        };
        
        endProgressMultiplier *= -1;
        endProgress = 1 - endProgress;
    };
}

// Inserted file SerializationHelper.js encoding='utf-8'
"use strict";

var SerializationHelper = {};

// Note: This returns a JavaScript dictionary
//that should be safe to call JSON.stringify on.
SerializationHelper.serializeObject = function(obj)
{
    let objectType = typeof (obj);
    let result = {};
    
    // No serialization necessary.
    if (obj == undefined || objectType === "string" || objectType === "number" || objectType === "boolean")
    {
        result = { object: obj, type: objectType };
    }
    
    // Serialize using a declared method.
    else if (obj.serialize && (obj.deserialize || obj.unserialize) && obj.constructor)
    {
        result = { object: obj.serialize(), type: "OWN_SERIALIZED", constructorName: obj.constructor.name };
    }
    // Otherwise,
    //check for toString/fromString methods.
    else if (obj.toString && obj.fromString && obj.constructor)
    {
        result = { object: obj.toString(), constructorName: obj.constructor.name, type: "TO_STRING_SERIALIZED" };
    } // Otherwise, try to recover properties of the object for serialization.
    else // A last-resort, not-guaranteed-to-work method.
    {
        // Extracts properties from the result, excluding functions.
        var extractProperties = function(object)
        {
            var result = {};
            var excludeType = "function";
            
            var current;
            for (var key in object)
            {
                current = object[key];
                
                // Don't include these keys (which shouldn't 
                //be included in a for/in loop anyway).
                if (key === "__proto__" || key === "prototype"
                    || key === "constructor")
                {
                    continue;
                }
            
                if (typeof (current) === "object")
                {
                    result[key] = extractProperties(current);
                }
                else if (typeof (current) !== excludeType)
                {
                    result[key] = current;
                }
            }
            
            return result;
        };
        
        var serializedVersion = extractProperties(obj);
        
        let constructorName = (obj.constructor ? obj.constructor.name : null);
        
        result = 
        { 
            object: serializedVersion, 
            constructorName: constructorName, 
            type: "EXTRACTED_PROPERTIES" 
        };
    }
    
    return result;
};

// Deserialize an object from a given serialized state.
//This must have been serialized using serializeObject.
//This can be dangerous if the serialized data specifies
//a constructorName it may construct a type of ANY OBJECT
//in the global domain.
SerializationHelper.inflateObject = function(serializationData)
{
    const serializationType = serializationData.type;
        
    let result = {};
    let object = serializationData.object;
    
    const constructorName = serializationData.constructorName;
        
    // If the constructor is present...
    if (constructorName && (self || window)[constructorName] && typeof ((self || window)[constructorName]) === "function")
    {
        try
        {
            result = new (self || window)[constructorName](); 
        }
        catch(e)
        {
            console.warn("Nonfatal. Unable to construct object from constructor " + constructorName + ". Error: " + e);
        }
    }
    
    // If the properties were extracted,
    if (serializationType === "EXTRACTED_PROPERTIES")
    {
        let properties = object;
        
        // Copy the set properties.
        for (var key in properties)
        {
            result[key] = properties[key];
        }
    }
    else if (serializationType === "TO_STRING_SERIALIZED")
    {
        console.assert(result.fromString != null); // Ensure the result can be
                                                   //created from a string.
        
        result = result.fromString();
    }
    else if (serializationType === "OWN_SERIALIZED")
    {
        let deserialize = (obj.deserialize || obj.unserialize || obj.inflate);
        
        console.assert(deserialize != null);
        
        result = deserialize(result);
    }
    else
    {
        result = object; // TODO Different handling for different serialized types here.
    }
    
    return result;
};

// Chrome doesn't support toSource on strings,
//so we need another function. This function
//escapes text such that all (old) backslashes and
//single/double are preceeded with a (new) backslash.
//The returned text is surrounded with double-quotes.
SerializationHelper.stringToSource = function(text)
{
    let currentChar, result = "\"";
    
    for (let i = 0; i < text.length; i++)
    {
        currentChar = text.charAt(i);
        
        // Does it need escaping.
        if (currentChar == '"' || currentChar == "\'" || currentChar == "\\")
        {
            result += "\\";
        }
        
        // Other characters that need escaping.
        if (currentChar == "\t")
        {
            result += "\\t";
        }
        else if (currentChar == "\n")
        {
            result += "\\n";
        }
        else if (currentChar == "\r")
        {
            result += "\\r";
        }
        else
        {
            result += currentChar;
        }
    }
    
    return result + "\"";
};

// Like JSON.stringify, but also converts functions to source.
SerializationHelper.stringifyFull = function(part, maxDepth, currentDepth)
{
    var result = "{ ";
    var currentPart = "";
    
    maxDepth = maxDepth || 25;
    
    let depth = currentDepth || 0;
    
    // Don't recurse more than 20 levels deep.
    if (depth > 20)
    {
        return result + "}";
    }
    
    var resultParts = [];
    
    for (var key in part)
    {
        currentPart = key + ": ";
    
        if (typeof (part[key]) == "string")
        {
            currentPart += SerializationHelper.stringToSource(part[key]);
        }
        else if (typeof (part[key]) != "object" && part[key] && part[key].toString)
        {
            currentPart += part[key].toString();
        }
        else if (typeof (part[key]) == "object")
        {
            currentPart += SerializationHelper.stringifyFull(part[key], maxDepth, depth + 1);
        }
        else
        {
            currentPart += part[key] + "";
        }
        
        resultParts.push(currentPart);
    }
    
    result = result + resultParts.join(", ") + " }";
    
    return result;
};

SerializationHelper.evalParseFromString = (data) =>
{
    return SerializationHelper.inflateObject(eval("(" + data + ")"));
};

// Serialize data such that reading it with parseFromString
//returns a close copy of the original. Danger! This method
//is imperfect.
SerializationHelper.stringSerialize = (data) =>
{
    return SerializationHelper.stringifyFull(SerializationHelper.serializeObject(data));
};

// Inserted file HighlightSchemes.js encoding='utf-8'
"use strict";

function BashHighlightScheme(originalHighlighter)
{
    this.id = "BashHighlight";

    this.labelMap =
    {
        "if": "#cc33cc",
        "else": "#cc33cc",
        "test": "#cc33cc",
        "fi": "#cc33cc"
    };

    this.labelMap[SyntaxHelper.COMMENT] = "green";
    this.labelMap[SyntaxHelper.STRING] = "yellow";
    this.labelMap[SyntaxHelper.NUMBER_START] = "pink";
    this.labelMap[SyntaxHelper.NUMBER_STOP] = "pink";
    this.labelMap[SyntaxHelper.END_SCRIPT] = "#44ffff"; // End script.


    this.labelSearchSeparators =
    {
    };

    this.labelSearchSeparators[SyntaxHelper.NUMBER_START] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.NUMBER_STOP] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.STRING] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.COMMENT] = SyntaxHelper.SEARCH_ALL;

    this.labelSearchRegexes =
    {
        start:
        {
        },
        end:
        {
        }
    };

    this.labelExtensions =
    {
        start: {},
        end: {}
    };

    this.labelSearchRegexes.start[SyntaxHelper.COMMENT] = new RegExp("\\\#", "g");
    this.labelSearchRegexes.start[SyntaxHelper.STRING] = new RegExp("[\\\"\\\']", "g");
    // this.labelSearchRegexes.start[SyntaxHelper.END_SCRIPT] = new RegExp("\\<\\w*/\\w*script\\w*\\>");

    this.labelSearchRegexes.end[SyntaxHelper.NUMBER_START] = SyntaxHelper.regexps.NUMBER_START;
    this.labelSearchRegexes.end[SyntaxHelper.NUMBER_STOP] = SyntaxHelper.regexps.NUMBER_STOP;
    this.labelSearchRegexes.end[SyntaxHelper.STRING] = new RegExp("[\\\"\\\']", "g");


    this.labelSearchFunctions =
    {
        start: {},
        end: {}
    };

    this.multiLineLabels =
    {

    };

    this.highlightSchemeSpecificLabels =
    {

    };

    // this.transitionHighlighterLabels[SyntaxHelper.TRANSIT_HIGHLIGHT_BLOCK] = originalHighlighter;

    var addedLabels = {};
    this.labelPrecedence =
    [["COMMENT"]];

    // Add any un-recorded labels to the precedence list.
    for (var i = 0; i < this.labelPrecedence.length; i++)
    {
        if (typeof this.labelPrecedence[i] !== "object")
        {
            addedLabels[this.labelPrecedence[i]] = true;
        }
        else
        {
            for (var j = 0; j < this.labelPrecedence[i].length; j++)
            {
                addedLabels[this.labelPrecedence[i][j]] = true;
            }
        }
    }

    for (var label in this.labelMap)
    {
        if (!addedLabels[label])
        {
            this.labelPrecedence.push(label);

            addedLabels[label] = true;
        }
    }
}

function JavaHighlightScheme(originalHighlighter)
{
    this.id = "JavaHighlight";

    this.labelMap =
    {
        "if": "#ca33ca",
        "else": "#ca33ca",
        "void": "#ca40cc",
        "int": "#ca40cc",
        "double": "#ca40cc",
        "float": "#ca40cc",
        "long": "#ca40cc",
        "short": "#ca40cc",
        "char": "#ca40cc",
        "boolean": "#ca40cc",
        "{": "#00ffff",
        "}": "#00ffff",
        "(": "#00ffff",
        ")": "#00ffff",
        "[": "#00ffff",
        "]": "#00ffff",
        "==": "#33aabb",
        "!": "#33aabb",
        "=": "#33aabb",
        ">": "#33aabb",
        "<": "#33aabb",
        ">=": "#33aabb",
        "<=": "#33aabb",
        "%": "#33aabb",
        "+": "#33aabb",
        "-": "#33aabb",
        "*": "#33aabb",
        "/": "#33aabb",
        "%=": "#33aabb",
        "+=": "#33aabb",
        "-=": "#33aabb",
        "*=": "#33aabb",
        "/=": "#33aabb",
        ";": "#33aabb",
        ",": "#c0aabb",
        ":": "#f0aabb",
        "&": "#33aabb",
        "|": "#33aabb",
        "do": "#cb60cd",
        "while": "#cb60cd",
        "for": "#cb60cd",
        "in": "#ab70cd",
        "false": "#abab00",
        "true": "#abab00",
        "null": "#00ff66",
        "this": "#00ffff",
        "super": "#00ffff",
        "const": "#ffee00",
        "return": "#ff6677",
        "switch": "#00ccff",
        "case": "#00ccff",
        "default": "#00ccff",
        "break": "#bb00ee",
        "new": "#bb00ee",
        "throw": "#ff6677",
        "try": "#aaffff",
        "instanceof": "#77ff77",
        "catch": "#aaffff",
        "finally": "#aaffff",
        "class": "#77ffaa",
        "public": "#aaffaa",
        "private": "#aaffaa",
        "protected": "#aaffaa",
        "interface": "#77ffaa",
        "extends": "#77ee99",
        "implements": "#77ee99",
        "static": "#77ee99",
        "volatile": "#77ee99",
        "search": "#eeddff",
        "indexOf": "#eeddff",
        "startsWith": "#eeddff",
        "endsWith": "#eeddff",
        "replace": "#eeddff",
        "Math": "#ffaaff",
        "String": "#aaaaff",
        "Double": "#aaaaff",
        "Boolean": "#aaaaff",
        "Character": "#aaaaff",
        "Integer": "#aaaaff",
        "Thread": "#aaaaff",
        "InetAddress": "#ccccff",
        "Collections": "#ccccff",
        "Comparator": "#ccccff",
        "Exception": "#ffaaaa",
        "log": "#eeaaee",
        "add": "#eeaaee",
        "put": "#eeaaee",
        "println": "#eeaaee",
        "System": "#eeddcc",
        "out": "#aaaaff",
        "err": "#aaaaff",
        "in": "#aaaaff",
        "ArrayList": "#ccaaff",
        "HashMap": "#ccaaff",
        "TreeMap": "#ccaaff",
        "HashSet": "#ccaaff",
        "TreeSet": "#ccaaff",
        "Set": "#ccaaff",
        "List": "#ccaaff",
        "Stack": "#eeaaff",
        "Queue": "#eeaaff",
        "LinkedList": "#aaaaff",
        "StringBuilder": "#ddaaff",
        "Scanner": "#ddaaff",
        "toString": "#aaaaff",
        "final": "#ffcccc",
        "Map": "#ccaaff",
        "push": "#eeddff",
        "get": "#eeddff",
        "pop": "#eeddff",
        "substring": "#eeddff",
        "substr": "#eeddff",
        "size": "#77eecc",
        "length": "#77eecc",
        "Iterator": "#ffddcc",
        "hasNext": "#ccddff",
        "next": "#ddffcc",
        "remove": "#ffddcc",
        "@": "#ffaaaa",
        "import": "#cccc77",
        "package": "#cccc77",
        "toUpperCase": "#eeddff",
        "toLowerCase": "#eeddff",
        "throws": "#ff88ff"
    };


    this.labelMap[SyntaxHelper.COMMENT] = "green";
    this.labelMap[SyntaxHelper.COMMENT_MULTI_LINE] = "green";
    this.labelMap[SyntaxHelper.STRING] = "yellow";
    this.labelMap["CHAR"] = "orange";
    this.labelMap[SyntaxHelper.NUMBER_START] = "pink";
    this.labelMap[SyntaxHelper.NUMBER_STOP] = "pink";
    this.labelMap[SyntaxHelper.END_SCRIPT] = "#44ffff"; // End script.


    this.labelSearchSeparators =
    {
    };

    this.labelSearchSeparators[SyntaxHelper.NUMBER_START] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.NUMBER_STOP] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.STRING] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["CHAR"] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["@"] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.COMMENT] = SyntaxHelper.SEARCH_ALL;
    // this.labelSearchSeparators[SyntaxHelper.END_SCRIPT] = SyntaxHelper.SEARCH_ALL,
    this.labelSearchSeparators[SyntaxHelper.COMMENT_MULTI_LINE] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["{"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["}"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["("] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators[")"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["["] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["]"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["!"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators[";"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["&"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["|"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators[","] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators[":"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["="] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["=="] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators["=>"] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators[">="] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators["<="] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators[">"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["<"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["%"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["*"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["+"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["-"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["/"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;

    this.labelSearchRegexes =
    {
        start:
        {
        },
        end:
        {
        }
    };

    this.labelExtensions =
    {
        start: {},
        end: {}
    };

    
    this.labelSearchRegexes.start[SyntaxHelper.COMMENT_MULTI_LINE] = new RegExp("\\\/\\\*", "g");
    this.labelSearchRegexes.start[SyntaxHelper.COMMENT] = new RegExp("\\\/\\\/", "g");
    this.labelSearchRegexes.start[SyntaxHelper.STRING] = new RegExp("[\\\"]", "g");
    this.labelSearchRegexes.start["CHAR"] = new RegExp("[\\\']", "g");
    // this.labelSearchRegexes.start[SyntaxHelper.END_SCRIPT] = new RegExp("\\<\\w*/\\w*script\\w*\\>");

    this.labelSearchRegexes.end[SyntaxHelper.COMMENT_MULTI_LINE] = new RegExp("\\\*\\\/", "g");
    this.labelSearchRegexes.end[SyntaxHelper.STRING] = new RegExp("[\\\"]", "g");
    this.labelSearchRegexes.end["CHAR"] = new RegExp("[\\\']", "g");
    this.labelSearchRegexes.end["@"] = new RegExp("\\@\\w+", "g");
    this.labelSearchRegexes.end[SyntaxHelper.NUMBER_START] = SyntaxHelper.regexps.NUMBER_START;
    this.labelSearchRegexes.end[SyntaxHelper.NUMBER_STOP] = SyntaxHelper.regexps.NUMBER_STOP;



    this.labelSearchFunctions =
    {
        start: {},
        end: {}
    };

    this.multiLineLabels =
    {
        "LONG_QUOTE": true
    };

    this.multiLineLabels[SyntaxHelper.COMMENT_MULTI_LINE] = true;

    this.highlightSchemeSpecificLabels =
    {

    };

    // this.transitionHighlighterLabels[SyntaxHelper.TRANSIT_HIGHLIGHT_BLOCK] = originalHighlighter;

    var addedLabels = {};
    this.labelPrecedence =
    [["COMMENT", "QUOTE", "CHAR", SyntaxHelper.COMMENT_MULTI_LINE], [">", "=", "<"]];

    // Add any un-recorded labels to the precedence list.
    for (var i = 0; i < this.labelPrecedence.length; i++)
    {
        if (typeof this.labelPrecedence[i] !== "object")
        {
            addedLabels[this.labelPrecedence[i]] = true;
        }
        else
        {
            for (var j = 0; j < this.labelPrecedence[i].length; j++)
            {
                addedLabels[this.labelPrecedence[i][j]] = true;
            }
        }
    }

    for (var label in this.labelMap)
    {
        if (!addedLabels[label])
        {
            this.labelPrecedence.push(label);

            addedLabels[label] = true;
        }
    }
}


function JavaScriptHighlightScheme(originalHighlighter)
{
    this.id = "JavaScriptHighlight";

    this.labelMap =
    {
        "LONG_QUOTE": "#ff8877",
        "if": "#ca53ca",
        "else": "#ca53ca",
        "function": "#ca60cc",
        "{": "#30ffff",
        "}": "#30ffff",
        "==": "#70aabb",
        "===": "#70aabb",
        "!": "#70aabb",
        "=": "#70aabb",
        ">": "#70aabb",
        "<": "#70aabb",
        "%": "#70aabb",
        "+": "#70aabb",
        "-": "#70aabb",
        "*": "#70aabb",
        "/": "#70aabb",
        "do": "#cb60cd",
        "while": "#cb60cd",
        "for": "#cb60cd",
        "in": "#ab70cd",
        "of": "#ab70cd",
        "false": "#abab00",
        "true": "#abab00",
        "null": "#00ff66",
        "undefined": "#bbbbdd",
        "=>": "#ea00ea",
        "this": "#00ffff",
        "let": "#ffaacc",
        "var": "#ffaadd",
        "const": "#ffee00",
        "return": "#ff6677",
        "switch": "#00ccff",
        "case": "#00ccff",
        "default": "#00ccff",
        "break": "#bb00ee",
        "new": "#bb00ee",
        "throw": "#ff6677",
        "try": "#aaffff",
        "typeof": "#77ff77",
        "createElement": "#eeffee",
        "catch": "#aaffff",
        "class": "#77ffaa",
        "get": "#77ee99",
        "extends": "#77ee99",
        "__constructor": "#77ee99",
        "async": "#aa66aa",
        "await": "#aa66aa",
        "document": "#bbffbb",
        "window": "#bbffbb",
        "alert": "#ffaabb",
        "confirm": "#ffaabb",
        "prompt": "#ffaabb",
        "innerHTML": "#ff7aaa",
        "outerHTML": "#ff7aaa",
        "search": "#eeddff",
        "indexOf": "#eeddff",
        "lastIndexOf": "#eeddff",
        "replace": "#eeddff",
        "Math": "#ffaaff",
        "innerText": "#ff7eaa",
        "me": "#aaffaa",
        "getContext": "#aaeeff",
        "style": "#ffeeff",
        ";": "#ffaaff",
        "save": "#a000ff",
        "restore": "#a000ff",
        "ctx": "#a060ff",
        "gl": "#a060ff",
        "continue": "#88bbcc",
        "delete": "#ff7799",
        "concat": "#aaffaa",
        "sort": "#aaffaa",
        "textContent": "#7affaa",
        "createElement": "#7affaa",
        "appendChild": "#7affaa",
        "script": "#ffccff",
        "removeChild": "#7affaa",
        "addEventListener": "#7affaa",
        "then": "#7aff99",
        "Promise": "#7aff99",
        "push": "#eeddff",
        "pop": "#eeddff",
        "substring": "#eeddff",
        "substr": "#eeddff",
        "splice": "#eeddff",
        "length": "#77eecc",
        "eval": "#ff7777",
        "JSON": "#aaffaa",
        "__proto__": "#ffaaaa",
        "prototype": "#aaaaff",
        "RegExp": "#aaaaff",
        "clientWidth": "#eeeeff",
        "clientHeight": "#eeeeff",
        "[": "#80aaff",
        "]": "#80aaff",
        "|": "#80aaff",
        "&": "#80aaff",
        "^": "#80aaff",
        "(": "#ffcece",
        ")": "#ffcece"
    };


    this.labelMap[SyntaxHelper.COMMENT] = "green";
    this.labelMap[SyntaxHelper.COMMENT_MULTI_LINE] = "green";
    this.labelMap[SyntaxHelper.STRING + "1"] = "yellow";
    this.labelMap[SyntaxHelper.STRING + "2"] = "yellow";
    this.labelMap[SyntaxHelper.NUMBER_START] = "pink";
    this.labelMap[SyntaxHelper.NUMBER_STOP] = "pink";
    this.labelMap[SyntaxHelper.END_SCRIPT] = "#44ffff"; // End script.


    this.labelSearchSeparators =
    {
    };

    this.labelSearchSeparators[SyntaxHelper.NUMBER_START] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.NUMBER_STOP] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.STRING + "1"] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.STRING + "2"] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.COMMENT] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["__constructor"] = SyntaxHelper.SEARCH_ALL;
    // this.labelSearchSeparators[SyntaxHelper.END_SCRIPT] = SyntaxHelper.SEARCH_ALL,
    this.labelSearchSeparators[SyntaxHelper.COMMENT_MULTI_LINE] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["LONG_QUOTE"] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["{"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["}"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["("] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators[")"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["["] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["]"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["^"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["&"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["|"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["!"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators[";"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["="] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators["=="] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators["==="] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators["=>"] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators[">"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["<"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["%"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["*"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["+"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["-"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["/"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;

    this.labelSearchRegexes =
    {
        start:
        {
        },
        end:
        {
        }
    };

    this.labelExtensions =
    {
        start: {},
        end: {}
    };

    this.labelSearchRegexes.start[SyntaxHelper.COMMENT_MULTI_LINE] = new RegExp("\\\/\\\*", "g");
    this.labelSearchRegexes.start[SyntaxHelper.COMMENT] = new RegExp("\\\/\\\/", "g");
    this.labelSearchRegexes.start[SyntaxHelper.STRING + "1"] = new RegExp("[\\\"]", "g");
    this.labelSearchRegexes.start[SyntaxHelper.STRING + "2"] = new RegExp("[\\\']", "g");
    this.labelSearchRegexes.start["LONG_QUOTE"] = new RegExp("\\\`", "g");
    // this.labelSearchRegexes.start[SyntaxHelper.END_SCRIPT] = new RegExp("\\<\\w*/\\w*script\\w*\\>");

    this.labelSearchRegexes.end[SyntaxHelper.COMMENT_MULTI_LINE] = new RegExp("\\\*\\\/", "g");
    this.labelSearchRegexes.end[SyntaxHelper.STRING + "1"] = new RegExp("[\\\"]", "g");
    this.labelSearchRegexes.end[SyntaxHelper.STRING + "2"] = new RegExp("[\\\']", "g");
    this.labelSearchRegexes.end["LONG_QUOTE"] = this.labelSearchRegexes.start["LONG_QUOTE"];
    this.labelSearchRegexes.end["__constructor"] = new RegExp("constructor", "g");
    this.labelSearchRegexes.end[SyntaxHelper.NUMBER_START] = SyntaxHelper.regexps.NUMBER_START;
    this.labelSearchRegexes.end[SyntaxHelper.NUMBER_STOP] = SyntaxHelper.regexps.NUMBER_STOP;


    this.labelSearchFunctions =
    {
        start: {},
        end: {}
    };

    this.multiLineLabels =
    {
        "LONG_QUOTE": true
    };

    this.multiLineLabels[SyntaxHelper.COMMENT_MULTI_LINE] = true;

    this.highlightSchemeSpecificLabels =
    {

    };

    // this.transitionHighlighterLabels[SyntaxHelper.TRANSIT_HIGHLIGHT_BLOCK] = originalHighlighter;

    var addedLabels = {};
    this.labelPrecedence =
    [["COMMENT", "QUOTE2", "QUOTE1", "LONG_QUOTE", SyntaxHelper.COMMENT_MULTI_LINE], "=>", [">", "=", "<"]];

    // Add any un-recorded labels to the precedence list.
    for (var i = 0; i < this.labelPrecedence.length; i++)
    {
        if (typeof this.labelPrecedence[i] !== "object")
        {
            addedLabels[this.labelPrecedence[i]] = true;
        }
        else
        {
            for (var j = 0; j < this.labelPrecedence[i].length; j++)
            {
                addedLabels[this.labelPrecedence[i][j]] = true;
            }
        }
    }

    for (var label in this.labelMap)
    {
        if (!addedLabels[label])
        {
            this.labelPrecedence.push(label);

            addedLabels[label] = true;
        }
    }
}

function CSSSyntaxHighlightScheme()
{
    this.id = "CSSHighlight";

    this.labelMap =
    {
        "#": "#00ff77",
        ".": "#00ff77",
        "@": "#00ff77",
        "body": "#00bbbb",
        "html": "#00bbbb",
        "p": "#00bbbb",
        "br": "#00bbbb",
        "button": "#9077eb",
        "hr": "#9077eb",
        "input": "#9077eb",
        "h1": "#9077eb",
        "textarea": "#9077eb",
        "center": "#9077eb",
        "a": "#9077eb",
        "div": "#9077eb",
        "ol": "#9077eb",
        "li": "#9077eb",
        "tr": "#9077eb",
        "td": "#9077eb",
        "thead": "#9077eb",
        "tbody": "#9077eb",
        "table": "#9077eb",
        "background": "#bb00bb",
        "rgba": "#aa4488",
        "color": "#bb00bb",
        "gradient": "#aa4488",
        "linear": "#aa4488",
        "radial": "#aa4488",
        "url": "#ccccdd",
        "border": "#bb00bb",
        "radius": "#bb00bb",
        "outline": "#bb00bb",
        "position": "#ffff00",
        "display": "#ffff00",
        "top": "#bb00bb",
        "left": "#bb00bb",
        "bottom": "#bb00bb",
        "right": "#bb00bb",
        "padding": "#bb00bb",
        "margin": "#bb00bb",
        "none": "#00ffaa",
        "auto": "#00ffaa",
        "block": "#00ffaa",
        "absolute": "#00ffaa",
        "flex": "#00ffaa",
        "grow": "#00ffaa",
        "style": "#00ffaa",
        "width": "#bb00bb",
        "height": "#bb00bb",
        "min": "#bb00bb",
        "max": "#bb00bb",
        "transform": "#cc04cc",
        "rotate": "#00cccc",
        "scale": "#00cccc",
        "font": "#bb00bb",
        "box-shadow": "#00cccc",
        "text-shadow": "#00cccc",
        "cursor": "#00cccc",
        "filter": "#00cccc",
        "size": "#bb00bb",
        "image": "#bb00bb",
        "matrix": "#00cccc",
        "overflow-x": "#bb00bb",
        "overflow-y": "#bb00bb",
        "animation": "#bb00bb",
        "transition": "#bb00bb",
        "NUMBER": "#00ff77",
        "text": "#bb00bb",
        "line": "#bb00bb",
        "align": "#bb00bb",
        "indent": "#bb00bb",
        "red": "#ffaaaa",
        "green": "#aaffaa",
        "blue": "#aaaaff",
        "orange": "#ffaa44",
        "purple": "#ffaaff",
        "gray": "#cccccc",
        "brown": "#aaaa77",
        "black": "#bbbbcc",
        "yellow": "#ffffaa",
        "pink": "#ffaaff",
        "violet": "#ff00ff"
    };

    this.labelMap[SyntaxHelper.COMMENT] = "#ff50ff";

    this.labelSearchSeparators =
    {
    };

    this.labelSearchSeparators["#"] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["."] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["@"] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["NUMBER"] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.COMMENT] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["h1"] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["box-shadow"] = SyntaxHelper.CSS_LABEL_SEPARATORS;
    this.labelSearchSeparators["text-shadow"] = SyntaxHelper.CSS_LABEL_SEPARATORS;
    this.labelSearchSeparators["overflow-x"] = SyntaxHelper.CSS_LABEL_SEPARATORS;
    this.labelSearchSeparators["overflow-y"] = SyntaxHelper.CSS_LABEL_SEPARATORS;

    this.labelSearchRegexes =
    {
        start:
        {
        },
        end:
        {
        }
    };

    //this.labelSearchRegexes.start["#"] = new RegExp("\\#\\w+", "g");
    this.labelSearchRegexes.start[SyntaxHelper.COMMENT] = new RegExp("\\/\\*", "g");

    this.labelSearchRegexes.end["#"] = new RegExp("\\#\\w+", "g");
    this.labelSearchRegexes.end["."] = new RegExp("\\.\\w+", "g");
    this.labelSearchRegexes.end["@"] = new RegExp("\\@\\w+", "g");
    this.labelSearchRegexes.end["h1"] = new RegExp("h[0-6]", "g");
    this.labelSearchRegexes.end["NUMBER"] = new RegExp("[0-9]", "g");

    this.labelSearchRegexes.end[SyntaxHelper.COMMENT] = new RegExp("\\*\\/", "g");

    this.labelExtensions =
    {
        start: {},
        end: {}
    };

    this.multiLineLabels =
    {

    };

    this.multiLineLabels[SyntaxHelper.COMMENT] = true;

    this.highlightSchemeSpecificLabels =
    {

    };

    var addedLabels = {};
    this.labelPrecedence =
    [SyntaxHelper.COMMENT];

    // Add any un-recorded labels to the precedence list.
    for (var i = 0; i < this.labelPrecedence.length; i++)
    {
        if (typeof this.labelPrecedence[i] !== "object")
        {
            addedLabels[this.labelPrecedence[i]] = true;
        }
        else
        {
            for (var j = 0; j < this.labelPrecedence[i].length; j++)
            {
                addedLabels[this.labelPrecedence[i][j]] = true;
            }
        }
    }

    for (var label in this.labelMap)
    {
        if (!addedLabels[label])
        {
            this.labelPrecedence.push(label);

            addedLabels[label] = true;
        }
    }
}

function HTMLSyntaxHighlightScheme()
{
    this.id = "htmlHighlight";

    this.labelMap =
    {
        "!": "#00aabb",
        "=": "#00aabb",
        "DOCTYPE": "#ff7700",
        "html": "#ff7700"
    };

    this.labelMap[SyntaxHelper.COMMENT_HTML] = "gray";
    //this.labelMap[SyntaxHelper.STRING] = "white";
    this.labelMap[SyntaxHelper.SCRIPT_BLOCK] = "#44ffff";
    this.labelMap[SyntaxHelper.STYLE_BLOCK] = "#44ffff";
    this.labelMap["ELEMENT"] = "#ffcc00";

    this.labelSearchSeparators =
    {
    };

    //this.labelSearchSeparators[SyntaxHelper.STRING] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.SCRIPT_BLOCK] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.STYLE_BLOCK] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.COMMENT_HTML] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["!"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["="] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators["ELEMENT"] = SyntaxHelper.SEARCH_ALL;

    this.labelSearchRegexes =
    {
        start:
        {
        },
        end:
        {
        }
    };

    this.labelSearchRegexes.start[SyntaxHelper.COMMENT_HTML] = new RegExp("\\<\\!\\-\\-", "g");
    //this.labelSearchRegexes.start[SyntaxHelper.STRING] = new RegExp("[\\\"\\\']", "g");
    this.labelSearchRegexes.start[SyntaxHelper.SCRIPT_BLOCK] = new RegExp("\\<\\s*script\\s*(?:[type\\=text\\\ \\\/JavaScript\\\"\\']+)?\\s*\\>", "ig");
    this.labelSearchRegexes.start[SyntaxHelper.STYLE_BLOCK] = new RegExp("\\<\\s*style\\s*(?:[type\\=text\\\ \\\/css\\\"\\']+)?\\s*\\>", "ig");
    this.labelSearchRegexes.start["ELEMENT"] = new RegExp("[<]", "g");

    this.labelSearchRegexes.end[SyntaxHelper.SCRIPT_BLOCK] = new RegExp("\\<\\s*\\/\\s*script\\s*\\>", "ig");
    this.labelSearchRegexes.end[SyntaxHelper.STYLE_BLOCK] = new RegExp("\\<\\s*\\/\\s*style\\s*\\>", "ig");
    //this.labelSearchRegexes.end[SyntaxHelper.STRING] = new RegExp("[\\\"\\\']", "g");
    this.labelSearchRegexes.end[SyntaxHelper.COMMENT_HTML] = new RegExp("\\-\\-\\>", "g");
    this.labelSearchRegexes.end["ELEMENT"] = new RegExp("[>]", "g");

    this.labelExtensions =
    {
        start: {},
        end: {}
    };

    this.labelExtensions.end["ELEMENT"] = 0;

    this.multiLineLabels =
    {

    };

    this.multiLineLabels[SyntaxHelper.COMMENT_HTML] = true;
    this.multiLineLabels[SyntaxHelper.SCRIPT_BLOCK] = true;
    this.multiLineLabels[SyntaxHelper.STYLE_BLOCK] = true;

    this.highlightSchemeSpecificLabels =
    {

    };

    this.highlightSchemeSpecificLabels[SyntaxHelper.SCRIPT_BLOCK] = new JavaScriptHighlightScheme(this);
    this.highlightSchemeSpecificLabels[SyntaxHelper.STYLE_BLOCK] = new CSSSyntaxHighlightScheme(this);

    var addedLabels = {};
    this.labelPrecedence =
    [[SyntaxHelper.SCRIPT_BLOCK, SyntaxHelper.STYLE_BLOCK, SyntaxHelper.COMMENT_HTML], "ELEMENT"];

    // Add any un-recorded labels to the precedence list.
    for (var i = 0; i < this.labelPrecedence.length; i++)
    {
        if (typeof this.labelPrecedence[i] !== "object")
        {
            addedLabels[this.labelPrecedence[i]] = true;
        }
        else
        {
            for (var j = 0; j < this.labelPrecedence[i].length; j++)
            {
                addedLabels[this.labelPrecedence[i][j]] = true;
            }
        }
    }

    for (var label in this.labelMap)
    {
        if (!addedLabels[label])
        {
            this.labelPrecedence.push(label);

            addedLabels[label] = true;
        }
    }
}

function PythonHighlightScheme(originalHighlighter)
{
    this.id = "PythonHighlight";

    this.labelMap =
    {
        "LONG_QUOTE": "red",
        "if": "#ca53ca",
        "else": "#ca53ca",
        "elif": "#ca53ca",
        "def": "#ca60cc",
        "class": "#ca60cc",
        "__init__": "#ca60cc",
        "{": "#30ffff",
        "}": "#30ffff",
        "==": "#70aabb",
        "is": "#70aabb",
        "not": "#70aabb",
        "=": "#70aabb",
        ">": "#70aabb",
        "<": "#70aabb",
        "%": "#70aabb",
        "+": "#70aabb",
        "-": "#70aabb",
        "*": "#70aabb",
        "/": "#70aabb",
        "do": "#cb60cd",
        "while": "#cb60cd",
        "for": "#cb60cd",
        "in": "#ab70cd",
        "range": "#fb70fd",
        "str": "#fb70fd",
        "global": "#fbfd00",
        "False": "#abab00",
        "True": "#abab00",
        "null": "#00ff66",
        "None": "#bbbbdd",
        "lambda": "#ea00ea",
        "self": "#00ffff",
        "const": "#ffee00",
        "return": "#ff6677",
        "switch": "#00ccff",
        "case": "#00ccff",
        "default": "#00ccff",
        "break": "#bb00ee",
        "import": "#ffaa00",
        "from": "#ffaa00",
        "as": "#ffaa00",
        "len": "#77eecc",
        "exec": "#ff7777",
        "print": "#ff00ff",
        "help": "#ff00ff",
        "input": "#ff0000",
        "[": "#80aaff",
        "]": "#80aaff",
        "or": "#80aaff",
        "and": "#80aaff",
        "^": "#80aaff",
        "(": "#ffaece",
        ")": "#ffaece",
        ":": "#ffbece",
        "async": "#ff7777",
        "await": "#ff7777",
        "isinstance": "#ffcc88",
        "dir": "#ffcc88",
        "list": "#ff88ff"
    };


    this.labelMap[SyntaxHelper.COMMENT] = "green";
    //this.labelMap[SyntaxHelper.COMMENT_MULTI_LINE] = "green";
    this.labelMap[SyntaxHelper.STRING + "1"] = "yellow";
    this.labelMap[SyntaxHelper.STRING + "2"] = "yellow";
    this.labelMap[SyntaxHelper.NUMBER_START] = "pink";
    this.labelMap[SyntaxHelper.NUMBER_STOP] = "pink";
    this.labelMap[SyntaxHelper.END_SCRIPT] = "#44ffff"; // End script.


    this.labelSearchSeparators =
    {
    };

    this.labelSearchSeparators[SyntaxHelper.NUMBER_START] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.NUMBER_STOP] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.STRING + "1"] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.STRING + "2"] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators[SyntaxHelper.COMMENT] = SyntaxHelper.SEARCH_ALL;
    //this.labelSearchSeparators["__constructor"] = SyntaxHelper.SEARCH_ALL;
    // this.labelSearchSeparators[SyntaxHelper.END_SCRIPT] = SyntaxHelper.SEARCH_ALL,
    //this.labelSearchSeparators[SyntaxHelper.COMMENT_MULTI_LINE] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["LONG_QUOTE"] = SyntaxHelper.SEARCH_ALL;
    this.labelSearchSeparators["{"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["}"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["("] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators[")"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators[":"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["["] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["]"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["^"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["!"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators[";"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["="] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators["=="] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators["==="] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators["=>"] = SyntaxHelper.COMPARISON_SEARCH_SEPARATOR;
    this.labelSearchSeparators[">"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["<"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["%"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["*"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["+"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["-"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;
    this.labelSearchSeparators["/"] = SyntaxHelper.SINGLE_CHAR_SEPARATOR;

    this.labelSearchRegexes =
    {
        start:
        {
        },
        end:
        {
        }
    };

    this.labelExtensions =
    {
        start: {},
        end: {}
    };

    //this.labelSearchRegexes.start[SyntaxHelper.COMMENT_MULTI_LINE] = new RegExp("\\\/\\\*", "g");
    this.labelSearchRegexes.start[SyntaxHelper.COMMENT] = new RegExp("\\\/\\\/", "g");
    this.labelSearchRegexes.start[SyntaxHelper.STRING + "1"] = new RegExp("[\\\"]", "g");
    this.labelSearchRegexes.start[SyntaxHelper.STRING + "2"] = new RegExp("[\\\']", "g");
    this.labelSearchRegexes.start["LONG_QUOTE"] = new RegExp("[\"\']{3}", "g");
    // this.labelSearchRegexes.start[SyntaxHelper.END_SCRIPT] = new RegExp("\\<\\w*/\\w*script\\w*\\>");

    //this.labelSearchRegexes.end[SyntaxHelper.COMMENT_MULTI_LINE] = new RegExp("\\\*\\\/", "g");
    this.labelSearchRegexes.end[SyntaxHelper.STRING + "1"] = new RegExp("[\\\"]", "g");
    this.labelSearchRegexes.end[SyntaxHelper.STRING + "2"] = new RegExp("[\\\']", "g");
    this.labelSearchRegexes.end["LONG_QUOTE"] = this.labelSearchRegexes.start["LONG_QUOTE"];
    this.labelSearchRegexes.end["__constructor"] = new RegExp("constructor", "g");
    this.labelSearchRegexes.end[SyntaxHelper.NUMBER_START] = SyntaxHelper.regexps.NUMBER_START;
    this.labelSearchRegexes.end[SyntaxHelper.NUMBER_STOP] = SyntaxHelper.regexps.NUMBER_STOP;


    this.labelSearchFunctions =
    {
        start: {},
        end: {}
    };

    this.multiLineLabels =
    {
        "LONG_QUOTE": true
    };

    this.multiLineLabels[SyntaxHelper.COMMENT_MULTI_LINE] = true;

    this.highlightSchemeSpecificLabels =
    {

    };

    // this.transitionHighlighterLabels[SyntaxHelper.TRANSIT_HIGHLIGHT_BLOCK] = originalHighlighter;

    var addedLabels = {};
    this.labelPrecedence =
    [["COMMENT", "LONG_QUOTE", "QUOTE2", "QUOTE1", SyntaxHelper.COMMENT_MULTI_LINE], "=>", [">", "=", "<"]];

    // Add any un-recorded labels to the precedence list.
    for (var i = 0; i < this.labelPrecedence.length; i++)
    {
        if (typeof this.labelPrecedence[i] !== "object")
        {
            addedLabels[this.labelPrecedence[i]] = true;
        }
        else
        {
            for (var j = 0; j < this.labelPrecedence[i].length; j++)
            {
                addedLabels[this.labelPrecedence[i][j]] = true;
            }
        }
    }

    for (var label in this.labelMap)
    {
        if (!addedLabels[label])
        {
            this.labelPrecedence.push(label);

            addedLabels[label] = true;
        }
    }
}

// Inserted file StorageHelper.js encoding='utf-8'
"use strict";

/**
 *  A simple storage manager, permitting storage and automatic deletion of
 * data. It is intended to use window.localStorage.
 */
var StorageHelper = {};

StorageHelper.DEFAULT_STORE_DURATION = 12; // Default to this number of days until expiration.
StorageHelper.STORAGE_PREFIX         = "_S"; // A string with which to prefix all items belonging to
                                            //storageHelper.

/**
 *  Store data with a given expiration time in milliseconds since 1970. This time
 * defaults to DEFAULT_STORE_DURATION days. The
 * given data should be serializable.
 */
StorageHelper.put = (key, data, expiration) =>
{
    expiration = expiration || ((new Date()).getTime() + 1000 * 60 * 60 * 24
                                           * StorageHelper.DEFAULT_STORE_DURATION); // Default
                                                                                    // storage 
                                                                                    //duration.
    let nowTime = (new Date()).getTime();

    // Only proceed if the data won't immediately expire.
    if (expiration < nowTime)
    {
        console.warn("Data for " + key + " will expire immediately!");
        return;
    }
    
    let saveData = StorageHelper.STORAGE_PREFIX + nowTime + "/" + expiration + "?" + SerializationHelper.stringSerialize(data);
    
    console.warn(saveData);
    
    if (window.localStorage)
    {
        window.localStorage.setItem(key, saveData);
    }
    else
    {
        console.error("LOCAL STORAGE IS INACCESSABLE");
    }
};

/**
 *  Get data from the store. Returns undefined if no such data exists.
 */
StorageHelper.get = (key) =>
{
    if (window.localStorage)
    {
        const itemDetails = StorageHelper.getItemDetails(key);
        
        try
        {
            // Eval is evil, but we know WE set the localStorage cookies.
            return SerializationHelper.evalParseFromString(itemDetails.content);
        }
        catch(e)
        {
            // Malformed?
            console.warn(key + " has malformed data. Error: " + e);
            console.warn("Content of " + key + " has been stored in");
            console.warn("window.debugStr for debugging purposes.");
            console.warn("The invalid entry will now be deleted.");
            
            window.debugStr = itemDetails.content;
            
            // Delete it.
            StorageHelper.delete(key);
            
            return null;
        }
    }
    
    return undefined;
};

/**
 * Delete an item in the store.
 */
StorageHelper.delete = (key) =>
{
    if (window.localStorage
        && StorageHelper.has(key))
    {
        window.localStorage.removeItem(key);
        
        return true;
    }
    
    return false;
};

/**
 * Get whether an object is stored!
 */
StorageHelper.has = (key) =>
{
    if (window.localStorage)
    {
        return window.localStorage.getItem(key) !== null;
    }
    
    return false;
};

// Get the details of an item in the format:
// { created: time in ms, expires: time in ms, 
//   content: text, malformed: boolean }.
StorageHelper.getItemDetails = (itemKey) =>
{
    if (window.localStorage)
    {
        const fullData = window.localStorage.getItem(itemKey) || "";
                
        const recordTimeEndIndex = fullData.indexOf("/"),
              expireTimeEndIndex = fullData.indexOf("?");
        
        
        if (!fullData.startsWith(StorageHelper.STORAGE_PREFIX)
            || recordTimeEndIndex == -1 || expireTimeEndIndex < recordTimeEndIndex)
        {
            return { malformed: true };
        }
        
        const createTime = MathHelper.forceParseInt(
                            fullData.substring(StorageHelper.STORAGE_PREFIX.length,
                                              recordTimeEndIndex)),
              expireTime = MathHelper.forceParseInt(
                            fullData.substring(recordTimeEndIndex + 1, expireTimeEndIndex)),
              content    =  fullData.substring(expireTimeEndIndex + 1);
       
        
       
        const result = 
        {
            created: createTime,
            expires: expireTime,
            content: content,
            malformed: false
        };
        
        return result;
    }
    else
    {
        const result = {};
        
        return result;
    }
};

// Remove all expired items belonging to the storage helper.
StorageHelper.removeExpired = () =>
{
    const nowTime = (new Date()).getTime();

    if (window.localStorage)
    {
        const getExpTime = (itemKey) =>
        {
            const expTime = StorageHelper.getItemDetails(itemKey).expires;
                                
            if (expTime !== NaN && expTime !== undefined)
            {
                console.log(itemKey + " expires in " + Math.floor((expTime - (new Date()).getTime()) / 60 / 60 / 24 / 1000) 
                        + " day(s).");
            }
                    
            return expTime;                                      
        };
    
        let expTime;
    
        for (let key in window.localStorage)
        {
            expTime = getExpTime(key);
            
            if (expTime !== undefined && expTime !== NaN && expTime < nowTime)
            {
                window.localStorage.removeItem(key);
            }
        }
    }
};

// On page load, remove expired elements.
requestAnimationFrame(StorageHelper.removeExpired);

// Inserted file Point.js encoding='utf-8'
"use strict";

// A simple Point class.
function Point(x, y, z)
{
    this.x = x;
    this.y = y;
    this.z = z || 0;
    
    this.NUM_COMPONENTS = 3;
    
    this.transformBy = function(matrix)
    {
        var arrayToTransform = [this.x, this.y, this.z];
        
        if (matrix.getWidth() === matrix.getHeight() && matrix.getWidth() === 4)
        {
            arrayToTransform.push(1);
        }
        
        MatHelper.transformPoint(arrayToTransform, matrix);
        
        this.x = arrayToTransform[0];
        this.y = arrayToTransform[1];
        this.z = arrayToTransform[2];
    };
    
    // Returns a copy of this object. Subclasses
    //should override this.
    this.copy = function()
    {
        var result = new Point(this.x, this.y, this.z);
        
        return result;
    };
    
    // Returns a rounded copy of the point, rounded to 
    //the specified number of decimal places.
    this.asRounded = function(decimalPlaces)
    {
        var result = this.copy();
        
        var multiplier = Math.pow(10, decimalPlaces);
        
        result.x = Math.floor(this.x * multiplier) / multiplier;
        result.y = Math.floor(this.y * multiplier) / multiplier;
        result.z = Math.floor(this.z * multiplier) / multiplier;
        
        return result;
    };

    this.toArray = function()
    {
        return [this.x, this.y, this.z];
    };
    
    this.fromArray = function(array)
    {
        let arrayCopy = [];
        
        // Ensure the array has sufficient size...
        for (let i = 0; i < this.NUM_COMPONENTS; i++)
        {
            arrayCopy.push(array[i] || 0);
        }
        
        this.x = arrayCopy[0];
        this.y = arrayCopy[1];
        this.z = arrayCopy[2];
    };
    
    this.toString = function()
    {
        return "(" + this.x + ", " + this.y + ", " + this.z + ")";
    };
}


// Inserted file JSHelper.js encoding='utf-8'
"use strict";

var JSHelper = {};

// Get a random array that represents a color.
//Arguments after round are interpreted as the minimum
//and maximum values of each component. Round stores
//whether to round.
// TODO Add a method to get a random color string.
JSHelper.getRandomColorArray = function(round)
{
    var result = [];
    var impliedMin, impliedMax;
    
    var generateComponent = function(min, max)
    {
        var component = Math.random() * (max - min) + min;
        
        if (round)
        {
            Math.floor(component);
        }
        
        return component;
    };
    
    // For all arguments following the first,
    for (var i = 1; i < arguments.length - 1; i += 2)
    {
        result.push(generateComponent(arguments[i], arguments[i + 1]));
    }
    
    if (round)
    {
        impliedMin = 0;
        impliedMax = 256;
    }
    else
    {
        impliedMin = 0.0;
        impliedMax = 1.0;
    }
    
    while (result.length < 3)
    {
        result.push(generateComponent(impliedMin, impliedMax));
    }
    
    return result;
};

// Get an array of random colors.
JSHelper.getArrayOfRandomColors = (count, round, numComponents, ...componentRanges) =>
{
    let result = [], currentColor, colorComponentIndex;

    console.log(componentRanges);

    numComponents = numComponents || 4;

    for (let index = 0; index < count; index++)
    {
        currentColor = JSHelper.getRandomColorArray.apply(this, [round].concat(componentRanges));
        
        
        for (colorComponentIndex = 0; colorComponentIndex < currentColor.length && colorComponentIndex < numComponents; colorComponentIndex++)
        {
            result.push(currentColor[colorComponentIndex]);
        }
    }

    return result;
};

// TODO Transition to vec4s.
JSHelper.colorMap =
{
    "red": [255, 0, 0],
    "green": [0, 255, 0],
    "blue": [0, 0, 255],
    "black": [0, 0, 0],
    "white": [255, 255, 255],
    "purple": [200, 0, 255],
    "magenta": [255, 0, 255],
    "yellow": [255, 255, 0],
    "gray": [100, 100, 100],
    "pink": [255, 200, 100],
    "brown": [140, 120, 150],
    "orange": [200, 150, 100]
};

// Converts an HTML-based color into a vec4.
//Each component ranges from zero to one.
JSHelper.colorToVector = (htmlColor) =>
{
    let result = new Vector3(0, 0, 0);
    
    // Check is it in hex?
    if (htmlColor.indexOf("#") == 0 && htmlColor.length === 7)
    {
        // Parse the hex.
        result.x = MathHelper.forceParseInt(htmlColor.substring(1, 3), 16);
        result.y = MathHelper.forceParseInt(htmlColor.substring(3, 5), 16);
        result.z = MathHelper.forceParseInt(htmlColor.substr(5), 16);
    }
    else if (htmlColor.indexOf("rgba") == 0 && htmlColor.indexOf("(") > 0)
    {
        // Parse rgba.
        htmlColor = htmlColor.substring(htmlColor.indexOf("(") + 1, htmlColor.length - 1);
        
        // Remove all spaces.
        htmlColor = htmlColor.replace(/\s/g, "");
        
        let parts = htmlColor.split(",");
        
        // RGBA must have red, green, blue, and alpha.
        if (parts.length < 3)
        {
            return result;
        }
        
        // Store the parts.
        result.x = MathHelper.forceParseInt(parts[0]);
        result.y = MathHelper.forceParseInt(parts[1]);
        result.z = MathHelper.forceParseInt(parts[2]);
        result.w = MathHelper.forceParseFloat(parts[3]);
    }
    else if (htmlColor in JSHelper.colorMap)
    {
        result.fromArray(JSHelper.colorMap[htmlColor]);
    }
    
    // Return
    return result;
};

// Converts a three-component input vector
//into an HTML-formatted string. By default,
//it is assumed that this vector's three
//components range from zero to one. If not,
//set componentMax to 255 or another, similar
//value. Alpha is an optional value from
//zero to one, representing the alpha channel
//desired in the resultant color.
JSHelper.vec3ToRGBString = (inputVector, 
                            componentMax,
                            alpha) =>
{
    // Transform from [0, 1]
    //to [0, 256).
    let transformedCopy = inputVector.mulScalar
                                (1 / (componentMax || 1) * 255);
    
    // Values in rgba(...) format should be bytes,
    //not floats.
    transformedCopy.x = Math.floor(transformedCopy.x);
    transformedCopy.y = Math.floor(transformedCopy.y);
    transformedCopy.z = Math.floor(transformedCopy.z);
    
    // Why break `result = ...` into two lines?
    //Hopefully, it makes it less breakable.
    let result = "rgba(" + transformedCopy.x
                 + ", " + transformedCopy.y + ", " + 
                 transformedCopy.z + ", " + (alpha || 1.0) + ")";
                 
    return result;
};

// Wait delay seconds...
JSHelper.waitFor = (delay) =>
{
    let doResolve = false;
    let resolveFn = () => { doResolve = true; };

    setTimeout(delay / 1000, () => resolveFn());

    return new Promise((resolve, reject) =>
    {
        if (doResolve)
        {
            resolve();
        }
        else
        {
            resolveFn = resolve;
        }
    });
};

// Create a JavaScript environment where code can be pushed as desired...
JSHelper.Environs = {}; // All environments.
JSHelper.Environs.__map = {};

/**
 * Create a new JavaScript execution environment. Return it, rather than store it
 * in the JSHelper object.
 *
 * Although this is more difficult to disturb/inject code into than JSHelper.Environs.request,
 * IT CAN STILL EASILY BE DONE. This is JavaScript and JSHelper is a public dictionary. Malicious
 * clients have the ability to overwrite this, and other, functions.
 * 
 * Note that push returns a string version of the code's output, including console logs, errors, etc.
 */
JSHelper.Environs.makeNew = () =>
{
    const env_updateNotifier = new JSHelper.UniqueNotifier(); // An internal notification handler...
    const env_exitEvent = "EVENT_EXIT";
    const env_pushedEvent = "EVENT_PUSHED";
    const env_returnedEvent = "EVENT_RETURNED";
    
    let env_running = false;
    let env_result;
    
    env_result = 
    {
        "__start": async () => // Start accepting code...
        {
            env_running = true;
            
            let env_toRun;
            
            const env_myEnv = new (function() { return this; })(); // Get SOME this...
            const env_console_log = self.console.log;
            const env_console_warn = self.console.warn;
            const env_console_error = self.console.error;
            const env_console = self.console;
            let env_evalResult = "";
            let env_consoleResult = "";
            var console;
            
            while (env_running)
            {
                env_toRun = await env_updateNotifier.waitFor(env_pushedEvent, env_exitEvent); // Wait for either event...
                
                if (env_toRun)
                {
                    env_evalResult = "";
                    env_consoleResult = "";
                    
                    // Re-map console.log...
                    console = 
                    {
                        log: (...output) =>
                        {
                            for (const elem of output)
                            {
                                env_consoleResult += "" + elem;

                                if (typeof (elem) === "object") // More detailed object logging.
                                {
                                    env_consoleResult += "\n";

                                    for (const key in elem)
                                    {
                                        env_consoleResult += "  " + key + ": ";

                                        if (typeof (elem[key]) === "function")
                                        {
                                            env_consoleResult += "[FUNCTION]";
                                        }
                                        else
                                        {
                                            env_consoleResult += elem[key];
                                        }
                                        
                                        env_consoleResult += "\n";
                                    }
                                }
                            }

                            env_consoleResult += "\n";
                            
                            env_console_log.apply(self, output);
                        },
                        warn: (...output) =>
                        {
                            console.log("[!] ", output);
                        },
                        error: (...output) =>
                        {
                            console.log("[X] ", output);
                        }
                    };
                    
                    try
                    {
                        env_evalResult += eval(env_toRun);
                    }
                    catch(e)
                    {
                        env_evalResult += "\nError: " + e;
                    }
                    
                    env_updateNotifier.notify(env_returnedEvent, env_consoleResult + "" + env_evalResult);
                }
            }
            
            env_updateNotifier.notify(env_exitEvent); // Note that we exited...
        },
        "push": async (code) => // Push code to the environment...
        {
            if (!env_running)
            {
                env_result.__start(); // Do not await... Would cause something similar to deadlock.
            }
        
            env_updateNotifier.notify(env_pushedEvent, code);
            
            // Wait for the reply...
            return await env_updateNotifier.waitFor(env_returnedEvent);
        },
        "stop": async () => // Push code to the environment...
        {
            env_updateNotifier.notify(env_exitEvent);
            env_running = false;
            
            // Wait for the reply...
            await env_updateNotifier.waitFor(env_exitEvent);
        }
    };
    
    return env_result;
}

/**
 * Request or create an environment of name [environName]. If
 * no such environment exists, one is created.
 * 
 * If one desires a unique, only-returned (rather than stored in 
 * a "private" (can be accessed) location), please use JSHelper.Environs.makeNew.
 *
 * Note that anEnviron.push(someStringCode)
 * returns a string version of the code's output, including console logs, errors, etc.
 */
JSHelper.Environs.request = (environName) => // Get an environment with the given name.
{                                                     // if no such environment exists, a new environment
                                                      // is created.
    if (!JSHelper.Environs.__map[environName])
    {
        JSHelper.Environs.__map[environName] = JSHelper.Environs.makeNew();
    }
    
    return JSHelper.Environs.__map[environName];
};

// Add browser-compatable pointer events to an element.
JSHelper.Events = {};

JSHelper.Events.getSupportsPointerEvents = function()
{
    if (JSHelper.Events.supportsPointerEvents !== undefined)
    {
        return JSHelper.Events.supportsPointerEvents;
    }
    
    let testElement = document.createElement("div");
    
    // This should be null if the client's browser supports
    //pointer events.
    JSHelper.Events.supportsPointerEvents = testElement.onpointerdown === null;
    
    return JSHelper.Events.supportsPointerEvents;
};

// Mouse and touch events work much better in Safari (or seem to).
JSHelper.Events.useLegacyEvents = true;

// Whether events should be paused.
JSHelper.Events.paused = false;

// Pause/play pointer events.
JSHelper.Events.setPaused = function(paused)
{
    JSHelper.Events.paused = paused;
};

// Note: The event name should not include "pointer" or "touch" or "mouse."
//It should be up, down, move, or stop.
JSHelper.Events.registerPointerEvent = function(eventName, target, onEvent, allowBubbling)
{
    allowBubbling = allowBubbling === undefined ? true : allowBubbling; // Whether to continue event propagation.
    
    // The stop event occurrs whenever a chain
    //of events stops. Stop can override out/up/leave/etc.
    if (eventName === "stop")
    {
        JSHelper.Events.registerPointerEvent("up", target, onEvent, allowBubbling);
        JSHelper.Events.registerPointerEvent("leave", target, onEvent, allowBubbling);
        
        return;
    }
    
    let processGeneralEvent = (event, parentEvent) =>
    {
        let result =
        {
            rawEvent: event,
            clientX: event.clientX,
            clientY: event.clientY,
            button: event.button,
            target: event.target,
            preventDefault: () =>
            {
                (parentEvent || event).preventDefault();
            }
        };
            
        return result;
    };
    
    // Check: Does the client support pointer events?
    if (JSHelper.Events.getSupportsPointerEvents() 
            && !JSHelper.Events.useLegacyEvents)
    {
        target.addEventListener("pointer" + eventName, (event) =>
        {
            let result = processGeneralEvent(event);
            
            result.pointerId = event.pointerId;
            result.width = event.width;
            result.height = event.height;
            result.pressure = event.pressure;
            result.isPrimary = event.isPrimary;
            
            // Stop if we've been paused.
            if (JSHelper.Events.paused)
            {
                return;
            }
            
            onEvent.call(result, result);
            
            return true;
        }, allowBubbling); // Prevent propagation.
    }
    else // If not...
    {
        // Add mouse and touch events.
        target.addEventListener("mouse" + eventName, (event) =>
        {
            let result = processGeneralEvent(event);
            
            result.pointerId = 1;
            result.width = 1;
            result.height = 1;
            result.pressure = 0.5;
            result.isPrimary = true;
            
            // If we're paused, stop.
            if (JSHelper.Events.paused)
            {
                return;
            }
            
            onEvent.call(target, result);
            
            return true;
        }, allowBubbling);
        
        // Change the event name for touch.
        let newEventName = eventName;
        
        if (newEventName === "down")
        {
            newEventName = "start";
        }
        else if (newEventName === "up")
        {
            newEventName = "end";
        }
        
        target.addEventListener("touch" + newEventName, (event) =>
        {
            if (JSHelper.Events.paused)
            {
                return;
            }
            
            let result, touch;
            
            let handleTouch = (touch) =>
            {
                result = processGeneralEvent(touch, event);
                
                result.pointerId = touch.identifier;
                result.width = touch.radiusX * 2;
                result.height = touch.radiusY * 2;
                result.pressure = touch.force;
                result.isPrimary = (i === 0);
                
                onEvent.call(target, result);
            };
            
            for (var i = 0; i < event.changedTouches.length; i++)
            {
                handleTouch(event.changedTouches[i]);
            }
            
            return true;
        }, allowBubbling);
        
        // Allow event firing.
        target.style.touchAction = "none";
    }
};


// A set of global events to be deployed through
//the notifier. JSHelper does not fire these events.
//The main application code should handle this.
// DO NOT WAIT ON THESE EVENTS UNLESS MAIN APPLICATION
// CODE IS SET TO FIRE THEM.
JSHelper.GlobalEvents = 
{
    PAGE_SETUP_COMPLETE: "global_e_page_setup_complete"
};

// An implementation of the observer pattern.
// For global communication, use JSHelper.Notifier.
// For internal communication, construct JSHelper.UniqueNotifier
// using "new".
JSHelper.UniqueNotifier = 
(function()
{
    let listeners = {};
    let listenerIdCounter = 0; // The id for the next listener.
    let firedEvents = {}; 
    
    
    
    // Wait for eventName to be distributed by notify.
    //A message is included with the distributed event.
    //If more than one argument is given, each additional argument
    //is interpreted as a possible additional event to continue if 
    //encountered.
    this.waitFor = (...eventNames) =>
    {
        // If given an object (e.g. an array) as the first argument,
        //for compatability, return a more-detailed information object
        //with data and eventName fields.
        let returnInfoObject = (typeof eventNames[0] === "object");

        let registered = false, registeredContent, resolvedEvent;
        let listenerId = "l" + (listenerIdCounter++); // Each listener has an ID. This is ours.
        
        let resolveWait = (content, eventName) => // A default listener, should the notification be
        {                                         //received before the promise sets resolveWait.
            registered = true;
            registeredContent = content;
            resolvedEvent = eventName;
                
            // Remove our listener.
            delete listeners[eventName][listenerId];
        };

        // For compatability, if the user called waitFor(something, true),
        //note that we should treat the first argument as the list of events.
        // Additionally, if the event has ever been fired, note that we
        // should return to the user.
        if (eventNames.length > 1 && eventNames[1] === true)
        {
            eventNames = eventNames[0];

            if (typeof eventnames[0] === "string") 
            {
                eventNames = [eventNames]; // It must be an array.
            }

            // If the event has already been fired, 
            // we can resolve early.
            for (const eventName of eventNames)
            {
                if (eventName in firedEvents)
                {
                    resolveWait(firedEvents[eventName], eventName);
                }
            }
        }
        
        // For every given event...
        for (const name of eventNames)
        {
            ((eventName) =>
            {
                if (listeners[eventName] === undefined)
                {
                    listeners[eventName] = {};
                }
                
                // Put a default method in place, in case a notification comes before the next browser
                //frame.
                listeners[eventName][listenerId] = (content) =>
                {
                    resolveWait(content, eventName);
                };
            })(name);      // Create a scope. This might be paranoid -- in older JavaScript,
                           // loop variables defined with var's values were lost after the 
                           // current iteration, and so something like this was required.
                           // This may no longer be the case.
        }
        
        let result = new Promise((resolve, reject) =>
        {
            // Update the resolve function.
            resolveWait = (content, eventName) =>
            {
                // What level of detail should we return?
                if (!returnInfoObject)
                {
                    resolve.call(this, content);
                }
                else
                {
                    resolve.call(this, { data: content, event: eventName });
                }
                // Remove our listener.
                delete listeners[eventName][listenerId];
                
                // After this, only resolve by removing the listener
                // from the event.
                resolveWait = (content, eventName) => 
                {
                    delete listeners[eventName][listenerId];
                };
            };
            
            if (registered) // We already received the event!
            {    // Notify now.
                resolveWait(registeredContent, resolvedEvent);
            }
        });
        
        return result;
    };

    // Used by older code. Wait for any of eventNames to 
    //complete and get a detailed result = { data: eventData, event: eventName }.
    this.waitForAny = (...eventNames) =>
    { 
        return this.waitFor([eventNames]);
    };
    
    // Notify all listeners on eventName.
    this.notify = (eventName, content) =>
    {
        if (listeners[eventName]) // Are there listeners for eventName?
        {
            for (let listenerId in listeners[eventName])
            {
                // Notify all that are not undefined.
                if (listeners[eventName][listenerId])
                {
                    listeners[eventName][listenerId](content);
                }
            }
        }

        firedEvents[eventName] = content;
    };
});

JSHelper.Notifier = new JSHelper.UniqueNotifier(); // Publicly-accessible, singleton 
                                                       // instance of the notifier.

// A method that throws.
JSHelper.NotImplemented = (signature, message) => 
{
    signature = signature || "";
    message = message || "";

    return () => 
    {
        throw "Not implemented: " + signature + " " + message;
    };
};

// Count the number of characters in charset in the given text.
JSHelper.getCharCount = (text, charset) =>
{
    let charCount = 0;
    
    for (let i = 0; i < text.length; i++)
    {
        if (charset.indexOf(text.charAt(i)) !== -1)
        {
            charCount++;
        }
    }
    
    return charCount;
};

// Unite two maps. Key/value pairs in
// the first map take precedence.
JSHelper.mapUnite = (map1, map2) =>
{
    let result = {};

    for (let key in map2)
    {
        result[key] = map2[key];
    }

    for (let key in map1)
    {
        result[key] = map1[key];
    }

    return result;
};

// Get the next animation frame in a promise.
JSHelper.nextAnimationFrame = () =>
{
    // A promise should push to the next frame,
    //but in case the browser doesn't render between
    //promises as it does for animation frames, pass it to an
    //animation frame.
    let result = new Promise((resolve, reject) =>
    {
        requestAnimationFrame(() => { resolve(true); });
    });
    
    return result;
};

// Wait for waitTime milliseconds. Returns a promise.
JSHelper.waitFor = (waitTime) =>
{
    let result = new Promise((resolve, reject) =>
    {
        setTimeout(() => { resolve(true); }, waitTime);
    });
    
    return result;
};

// Override some default behavior! Much of this is for
//accessibility! Note: JSHelper_replacedMethods contains
//refrences to browser-based functions. SerializationHelper
//can't serialize these, so put them in a different object.
const JSHelper_replacedMethods = {};
JSHelper_replacedMethods.addEventListener = HTMLElement.prototype.addEventListener;

// Define a new event, push, that awaits both clicks and
//the press of the enter key.
HTMLElement.prototype.addEventListener = 
function (eventType, onEnact, ...allOthers)
{
    if (eventType === "click")
    {
        eventType = "keyup";
        JSHelper_replacedMethods.addEventListener.apply(this, [eventType, 
        function(event)
        {
            if (event.keyCode === 13) // Enter key.
            {
                // Make it look somewhat like a mouse event.
                event.button = 0;
                
                onEnact.apply(this, arguments);
            }
        }].concat(allOthers));
        
        // Now, on click!
        eventType = "click";
    }
    
    return JSHelper_replacedMethods.addEventListener.apply(this, arguments);
};
// Inserted file ArrayHelper.js encoding='utf-8'
"use strict";

var ArrayHelper = {};

// Whether array a and array b are equivalent.
ArrayHelper.equals = function(a, b)
{
    if (a.length !== b.length)
    {
        return false;
    }
    
    for (var i = 0; i < a.length; i++)
    {
        if (a[i] !== b[i])
        {
            return false;
        }
    }
    
    return true;
};

ArrayHelper.softCopy = function(array)
{
    var result = [];
    
    for (var i = 0; i < array.length; i++)
    {
        result.push(array[i]);
    }
    
    return result;
};



// Inserted file Keyboard.js encoding='utf-8'
"use strict";

function Key(name, x, y, w, h, command)
{
    const MIN_SIZE = 30; // No widths smaller than this.

    this.command = command || function () {};
    this.x = x;
    this.y = y;
    this.w = Math.max(w, MIN_SIZE);
    this.h = h;
    this.name = name;

    var lastClickPoint = undefined;

    var me = this;

    this.checkCollision = function(point)
    {
        return (point.x > me.x && point.x < me.x + me.w && point.y > me.y && point.y < me.y + me.h);
    };

    this.handleClick = function(point)
    {
        lastClickPoint = point;

        if (me.checkCollision(point))
        {
            me.command();
        }
    };

    this.getWidth = function()
    {
        return me.w;
    };

    this.getContentWidth = function(ctx)
    {
        var width = ctx.measureText(me.name).width;

        width = Math.max(MIN_SIZE, width);

        return width;
    };

    this.updateWidthWithPadding = function(ctx, allocatedPadding)
    {
        var width = me.getContentWidth(ctx) + allocatedPadding;
        me.w = width;

        return width;
    };

    this.setX = function(newX)
    {
        me.x = newX;
    };

    this.setY = function(newX)
    {
        me.y = newX;
    };

    this.render = function(ctx)
    {
        ctx.beginPath();
        ctx.save();
        if (lastClickPoint && me.checkCollision(lastClickPoint))
        {
            ctx.fillStyle = "#0055ee";
            ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = -2;
            ctx.shadowOffsetY = -2;
        }
        else
        {
            ctx.fillStyle = "black";
        }

        ctx.strokeStyle = "white";
        ctx.rect(me.x, me.y, me.w, me.h);

        ctx.fill();
        ctx.stroke();

        ctx.textBaseline = "middle";
        ctx.textAlign = "center";

        ctx.fillStyle = "white";
        ctx.fillText(me.name, me.x + me.w / 2, me.y + me.h / 2);
        ctx.restore();
    };
}

var LEFT_ARROW = "◀️";
var RIGHT_ARROW = "▶️";

function Keyboard(ctx, keyPressed)
{
    const DEFAULT_KEY_WIDTH = 30;

    var me = this;
    this.onkeypress = keyPressed;
    this.ctx = ctx;
    var emojiStart = "◀️".charAt(0);
    this.keyChars = ["1▪2▪3▪4▪5▪6▪7▪8▪9▪0▪-▪+", "q▪w▪e▪r▪t▪y▪u▪i▪o▪p▪,▪⏪", "🔠▪a▪s▪d▪f▪g▪h▪j▪k▪l▪⬆️", "◀️▪z▪x▪c▪v▪b▪n▪m▪.▪;▪▶️", "🔼▪<▪=▪_SPACE_▪{▪}▪>▪/▪🔽",
    "\'▪\"▪;▪:▪_▪[▪]▪&&▪||▪(▪)▪⏬",
"💾▪📂▪✂️▪📜▪📋▪📌▪ℹ▪⚜▪🚘▪⏬"];
    this.shiftKeyChars = ["!▪@▪#▪$▪%▪^▪~▪\`▪*▪_▪(▪)", "q▪w▪e▪r▪t▪y▪u▪i▪o▪p▪:▪⏪", "🔡▪a▪s▪d▪f▪g▪h▪j▪k▪l▪⬆️", "◀️▪z▪x▪c▪v▪b▪n▪m▪?▪\\▪▶️", "🔼▪\"▪'▪_SPACE_▪[▪]▪&▪|▪🔽",
    "//▪/*▪*/▪=>▪}▪[▪]▪~▪*▪(▪)▪⏬",
"🗂️▪⚙️▪✂️▪📜▪📋▪⚗️▪➖▪➕▪🔎▪⏬"];

    for (var i = 0; i < this.shiftKeyChars.length; i++)
    {
        this.shiftKeyChars[i] = this.shiftKeyChars[i].toUpperCase();
    }

    this.x = 0;
    this.y = 0;
    this.maxX = 0;
    this.maxY = 0;
    this.keys = [];
    this.shiftKeys = [];

    var font = "11pt sans-serif, serif";

    me.ctx.font = font;

    var keyH = this.ctx.measureText("W....").width;

    this.shiftPressed = false;
    this.capsLock = false;

    this.toggleCaps = function()
    {
        me.capsLock = !me.capsLock;
        me.shiftPressed = me.capsLock;
    };

    this.loadKeys = function(keyChars, keys)
    {
        var x = me.x;
        var y = me.y;

        var addKey = function(name)
        {
            var key = new Key(name, x, y, DEFAULT_KEY_WIDTH, keyH, function()
            {
                if (name == "⬆️")
                {
                    me.toggleCaps();
                }
                else if (name === "🔠")
                {
                    me.shiftPressed = true;
                }
                else if (name === "🔡")
                {
                    me.shiftPressed = false;
                }
                else
                {
                    me.onkeypress(name);

                    if (!me.capsLock)
                    {
                        me.shiftPressed = false;
                    }
                }
            });

            x += key.getContentWidth(me.ctx);

            keys.push(key);
        };

        var distributePadding = (keyCount) =>
        {
            const extraSpace = Math.max(me.maxX, ctx.canvas.width) - x;
            const padding = extraSpace / keyCount; 

            // Nothing to distribute
            if (extraSpace <= 0)
            {
                return;
            }

            x = me.x;

            for (let i = keys.length - keyCount; i < keys.length; i++)
            {
                keys[i].updateWidthWithPadding(ctx, padding);
                keys[i].setX(x);
                x += keys[i].getWidth();
            }
        };

        var row;
        var currentChar;

        for (var i = 0; i < keyChars.length; i++)
        {
            row = keyChars[i].split("▪");

            for (var j = 0; j < row.length; j++)
            {
                currentChar = row[j];

                addKey(currentChar);
            }

            distributePadding(row.length);

            if (x > me.maxX + 1)
            {
                me.maxX = x + 1;
            }

            y += keyH + 1;
            x = me.x;
        }

        if (y > me.maxY + 1)
        {
            me.maxY = y + 1;
        }
    };

    this.handleClick = function(point)
    {
        var keys = me.shiftPressed ? me.shiftKeys : me.keys;

        for (var i = 0; i < keys.length; i++)
        {
            keys[i].handleClick(point);
        }
    };

    this.render = function()
    {
        me.ctx.clearRect(me.x, me.y, me.maxX, me.maxY);
        me.ctx.font = font;

        var keys = me.shiftPressed ? me.shiftKeys : me.keys;

        for (var i = 0; i < keys.length; i++)
        {
            keys[i].render(me.ctx);
        }
    };

    this.loadKeys(me.keyChars, me.keys);
    this.loadKeys(me.shiftKeyChars, me.shiftKeys);
}


// Inserted file HTMLHelper.js encoding='utf-8'
"use strict";

// Supplies useful HTML helper-functions.
var HTMLHelper = {};

HTMLHelper.inputTypeToElementNSDictionary = 
{
    "text": "input",
    "checkbox": "input",
    "textarea": "textarea",
    "number": "input",
    "select": "select",
    "richtext": "div"
};

HTMLHelper.dataTypeToInputTypeDictionary =
{
    "string": "text",
    "number": "number",
    "boolean": "checkbox"
};

// Get the content of an input. This is necessary for inputs
//like those with type=checkbox.
HTMLHelper.getInputContent = function(inputElement, inputType)
{
    var result;

    switch (inputType)
    {
        case "checkbox":
            return inputElement.checked;
        case "richtext":
            return inputElement.innerHTML;
        case "number":
            result = inputElement.value;
            
            try
            {
                result = parseFloat(result);
            }
            catch(e)
            {
                console.warn(e);
            }
            
            return result;
        default:
            return inputElement.value;
    }
};

HTMLHelper.setInputContent = function(inputElement, inputType, setTo)
{
    switch (inputType)
    {
        case "checkbox":
            inputElement.checked = setTo;
            break;
        case "richtext":
            inputElement.innerHTML = setTo;
            break;
        case "select":
            
            if (typeof setTo === "object")
            {
                inputElement.innerHTML = "";
                
                for (var i in setTo)
                {
                    let newOption = HTMLHelper.addTextElement(setTo[i], 
                                        inputElement, "option");
                    
                    // If an array, the value is the content, otherwise, the 
                    //key.
                    newOption.value = typeof setTo.length === "number" ? setTo[i] : i;
                    
                    inputElement.appendChild(newOption);
                }
            }
            else
            {
                inputElement.value = setTo;
            }
            break;
        default:
            inputElement.value = setTo;
            break;
    }
};

HTMLHelper.getSuitableInputType = function(defaultContent)
{
    const defaultContentType = typeof (defaultContent);

    // Multi-line strings should be given a textarea.
    if (defaultContentType === "string" && defaultContent.indexOf('\n') !== -1)
    {
        return "textarea";
    }
    else if (defaultContentType in HTMLHelper.dataTypeToInputTypeDictionary)
    {
        return HTMLHelper.dataTypeToInputTypeDictionary[defaultContentType];
    }

    return "text";
};

// Adds an element containing HTML text to parent, with NS of elementName.
HTMLHelper.addTextElement = function(content, parent, elementName)
{
    var element = document.createElement(elementName || "div");
    element.innerHTML = content;
    
    parent.appendChild(element);
    
    return element;
};

// Calls HTMLHelper.addTextElement with a default elementName
//of "h1". Included to improve readability.
HTMLHelper.addHeader = function(content, parent, elementName)
{
    elementName = elementName || "h1";
    
    return HTMLHelper.addTextElement.apply(this, arguments);
};

// Like HTMLHelper.addHeader, but with "p" as the default NS.
HTMLHelper.addParagraph = function(content, parent, elementName)
{
    elementName = elementName || "p";

    return HTMLHelper.addTextElement.apply(this, arguments);
};

// Adds a line break!
HTMLHelper.addBR = function(parent)
{
    return HTMLHelper.addTextElement("", parent, "br");
};

// Adds a header-row element.
HTMLHelper.addHR = function(parent)
{
    return HTMLHelper.addTextElement("", parent, "hr");
};

// Adds a div with class spacer.
HTMLHelper.addSpacer = function(parent)
{
    const result = HTMLHelper.addTextElement("", parent, "div");
    
    result.classList.add("spacer");
    
    return result;
};

// Adds an element (by default, a span) to parent and gives
//it a class of label.
HTMLHelper.addLabel = function(labelText, parent, element)
{
    var label = HTMLHelper.addTextElement(labelText, parent, element || "span");
    
    label.setAttribute("class", "label");
    
    return label;
};

// Adds a button! OnSubmit's this variable is set
//to the button.
HTMLHelper.addButton = function(content, parent, onSubmit)
{
    var element = document.createElement("button");
    element.innerHTML = content;
    
    parent.appendChild(element);
    
    if (onSubmit)
    {
        element.addEventListener("click", function()
        {
            onSubmit.apply(element, arguments);
        });
    }
    
    return element;
};

// Convert a map of key-function pairs to buttons.
HTMLHelper.addButtons = function(nameToOnClickMap, parent)
{
    let container = document.createElement("div");
    
    for (let label in nameToOnClickMap)
    {
        HTMLHelper.addButton(label, container, nameToOnClickMap[label]);
    }
    
    parent.appendChild(container);
    
    return container;
};

// Adds an image with src to parent and gives it
//className (className is optional).
HTMLHelper.addImage = function(src, parent, className)
{
    let element = document.createElement("img");
    element.src = src;
    
    element.style.flexGrow = 1;
    
    parent.appendChild(element);
    
    if (className)
    {
        element.classList.add(className);
    }
    
    return element;
};

// Adds an input of inputType to parent. OnInput is called
//when an "input" event is fired -- when the user changes
//the content of the input. This DOES support checkboxes,
//but at the time of this writing, not radio-boxes or spinners
//(selects).
HTMLHelper.addInput = function(placeHolder, initialContent, inputType, parent, onInput, onEnterKey)
{
    var inputElementType = "input";
    
    if (inputType in HTMLHelper.inputTypeToElementNSDictionary)
    {
        inputElementType = HTMLHelper.inputTypeToElementNSDictionary[inputType];
    }
    
    onInput = onInput || function() {};
    
    var input = document.createElement(inputElementType);
    
    input.setAttribute("type", inputType);
    
    HTMLHelper.setInputContent(input, inputType, initialContent);
    
    input.setAttribute("placeholder", placeHolder);
    
    parent.appendChild(input);
    
    input.addEventListener("input", function(event)
    {
        var inputContent = HTMLHelper.getInputContent(input, inputType);
        
        onInput.call(this, inputContent, arguments);
        
        return true;
    }, true);
    
    // Handle enter key presses.
    if (onEnterKey)
    {
        input.addEventListener("keyup", function(event)
        {
            // If the user hit enter,
            if (event.keyCode === 13)
            {
                var inputContent = HTMLHelper.getInputContent(input, inputType);
                
                onEnterKey.call(this, inputContent, arguments);
                
                return true;
            }
        });
    }
    
    return input;
};

// Add an input with an attached label! The label
//argument doubles as the placeholder.
HTMLHelper.addLabeledInput = function(label, initialContent, inputType, parent, 
            onInput, onEnterKey)
{
    const inputGroup = document.createElement("div");

    // Allow the input box to grow, as needed.
    inputGroup.style.display = "flex";

    const labelElem = HTMLHelper.addLabel(label, inputGroup, "span");
    labelElem.style.paddingRight = "4px";
    
    const inputElement = HTMLHelper.addInput.call(this, label, initialContent, inputType, inputGroup, onInput, onEnterKey);
    
    // Expand with parent.
    inputElement.style.flexGrow = "1";
    
    parent.appendChild(inputGroup);
    
    return inputElement;
};

// Adds an element that helps the user create a password.
//An object is returned that includes a method, isValid, which
//returns true if the password matches that specified by the arguments.
HTMLHelper.addPasswordConcocter = (parent, options) =>
{
    let status = document.createElement("div"), initialInput, confirmInput, progressBar;
    const specialChars = options.specialChars || "@!$&^*()_+.,?";
    const NUMBER_SYMBOLS = "0123456789";

    // Default options.
    options.minLength        = options.minLength === undefined        ? 7 : options.minLength;
    options.specialCharCount = options.specialCharCount === undefined ? 2 : options.specialCharCount;
    options.numberCharCount  = options.numberCharCount === undefined  ? 2 : options.numberCharCount;

    // Helper methods.
    let onValid = () => {}, onInvalid = () => {};
    
    const passwordChecks =
    [
        (noteFail, password, confirmedPassword) =>
        {
            if (password !== confirmedPassword)
            {
                noteFail("Passwords do not match. ");
            }
        },
        (noteFail, password) =>
        {
            if (password.length < options.minLength)
            {
                noteFail("Password cannot be less than " + options.minLength + " characters. ");
            }
        },
        (noteFail, password) =>
        {
            let specialCharCount = JSHelper.getCharCount(password, specialChars);
            
            if (specialCharCount < options.specialCharCount)
            {
                noteFail("Password contains only " + specialCharCount
                    + "/" + options.specialCharCount + " special characters ("
                    + specialChars + "). ");
            }
        },
        (noteFail, password) =>
        {
            let numberCount = JSHelper.getCharCount(password, NUMBER_SYMBOLS);
            
            if (numberCount < options.numberCharCount)
            {
                noteFail("Password contains only " + numberCount
                    + "/" + options.numberCharCount + " of the required number symbols (" + NUMBER_SYMBOLS + ").");
            }
        }
    ];
    
    const setFailReason = (reason) =>
    {
        status.innerText = reason;
    };
    
    const checkPasswords = (password, confirmedPassword) =>
    {
        let failReasons = "";
        let maxProgress = passwordChecks.length;
        let progress    = maxProgress;
        
        let noteFail = (reason) =>
        {
            failReasons += reason + " ";
            progress--;
        };
        
        for (var i = 0; i < passwordChecks.length; i++)
        {
            passwordChecks[i](noteFail, password, confirmedPassword);
        }
        
        setFailReason(failReasons);
        progressBar.setProgress(progress / maxProgress);
        
        return progress === maxProgress;
    };
    
    let lastCheckValid = false;
    const checkInputs = () =>
    {
        let currentlyValid = checkPasswords(initialInput.value, confirmInput.value);
        
        if (lastCheckValid !== currentlyValid)
        {
            if (currentlyValid)
            {
                onValid();
            }
            else
            {
                onInvalid();
            }
        }
        
        lastCheckValid = currentlyValid;
        
        return currentlyValid;
    };
    
    // Create the container.
    const container = document.createElement("div");
    
    // Add elements.
    container.appendChild(status);
    initialInput = HTMLHelper.addInput("Password", "", "password", container, checkInputs);
    confirmInput = HTMLHelper.addInput("Confirm Password", "", "password", container, checkInputs);
    progressBar = HTMLHelper.addProgressBar(0, container);
    
    // Styling.
    progressBar.container.style.height = "10px";
    
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.classList.add("passwordConcocter");
    
    status.style.fontWeight = "bold";
    
    // Add it to the parent.
    parent.appendChild(container);
    
    // Create and return the result.
    let result = 
    {
        isValid: () => checkInputs(),
        container: container,
        input: initialInput,
        get: () => initialInput.value,
        onValid: (fn) => onValid = fn,
        onInvalid: (fn) => onInvalid = fn
    };
    
    return result;
};

// Adds a sequence of inputs to the container that permits the editing
//of a given vector.
HTMLHelper.addVectorEditor = function(vector, numComponents, parent)
{
    var componentKeys = ['x', 'y', 'z', 'w'];
    
    var handleInput = (key) =>
    {
        var newInput = HTMLHelper.addInput(key, vector[key], "number", parent, function(newValue)
        {
            vector[key] = newValue;
        });
        
        newInput.style.width = "50px";
    };
    
    for (var i = 0; i < numComponents; i++)
    {
        handleInput(componentKeys[i]);
    }
};

// Create a progress bar! Returns an element with
//properties container, track, and a method setProgress(number 0 to 1).
HTMLHelper.addProgressBar = function(initialProgress, parent)
{
    const container = document.createElement("div");
    container.setAttribute("class", "progressBarContainer");
    
    const track = document.createElement("div");
    track.setAttribute("class", "progressBarTrack");
    
    let setProgress = function(progressDecimal) // Progress should be from zero to one.
    {
        progressDecimal = Math.max(0, Math.min(progressDecimal, 1));
    
        track.style.width = Math.floor(progressDecimal * 100) + "%";
    };
    
    container.appendChild(track);
    
    parent.appendChild(container);
    
    // Set the initial progress.
    setProgress(initialProgress);
    
    // Although this dictionary could
    //be returned directly by wrapping it 
    //in parentheses (and eliminating the
    //need for a separate result variable),
    //this has only been tested in Chrome,
    //and seems liable to break.
    let result = 
    {
        container: container,
        track: track,
        setProgress: setProgress
    };
    
    return result;
};

HTMLHelper.TAB_CHANGED = "TAB_CHANGED";

/*
        Create a tabbed view. The argument, tabDescriptors, 
    should be formatted such that each tab label is paired with
    a function of the container or an HTML Element to display.
    
        An object containing methods addTab, removeTab, hideTab,
    showTab, tabChanged, and selectTab is returned. The argument, reRunTabActions
    is included to permit a re-run of provided tab actions on tab switching,
    rather than re-using a previously generated content.

    tabChanged is a notifier that currently can signal one event, HTMLHelper.TAB_CHANGED,
    which returns the name of the new tab.
*/
HTMLHelper.addTabGroup = function(tabDescriptors, parent, defaultTab, reRunTabActions)
{
    let tabContents = {};
    let tabActiveFunctions = {};
    let tabLabels = {}; // The selectable labels.
    let selectedTab = null;
    let onTabChange = null;
    
    // Notify clients when the tab changes to another...
    const tabChangedNotifier = new JSHelper.UniqueNotifier();
    
    // Create containers.
    let groupContainer = document.createElement("div"); // Contains everything in this display.
    let tabLabelContainer = document.createElement("div"); // Contains just the parent element of the tabs.
    let contentContainer = document.createElement("div"); // Contains the content to be displayed.
    
    // Set container styles.
    groupContainer.setAttribute("class", "tabGroupContainer"); // TODO groupContainer should have display flex, etc.
    tabLabelContainer.setAttribute("class", "tabDisplay");
    contentContainer.setAttribute("class", "tabDisplayContent");
    
    // Hierarchy.
    groupContainer.appendChild(tabLabelContainer);
    groupContainer.appendChild(contentContainer);
    parent.appendChild(groupContainer);
    
    let addTab = (tabName, tabAction) =>
    {
        let newTabElement = null;
        
        // If the tab's action is a function,
        //create an element to provide it.
        if (typeof (tabAction) === "function")
        {
            newTabElement = document.createElement("span");
            
            // Run the action on the element,
            //if not re-running the activation function
            //each time the tab is shown.
            if (!reRunTabActions)
            {
                tabAction(newTabElement);
            }
            else
            {
                tabActiveFunctions[tabName] = tabAction;
            }
        } // Otherwise, use the provided element.
        else
        {
            newTabElement = tabAction;
        }
        
        tabContents[tabName] = newTabElement;
        
        // Add the element to its container, but set its display to none.
        contentContainer.appendChild(newTabElement);
        newTabElement.classList.add("tabContentHidden");
        
        // Create the tab's label.
        let tabLabel = document.createElement("span");
        
        tabLabel.setAttribute("class", "tabLabel tabLabelUnselected"); // Styling.
        tabLabel.textContent = tabName;
        
        tabLabel.setAttribute("tabIndex", 2);
        
        // Click.
        tabLabel.addEventListener("click", (event) =>
        {
            selectTab(tabName);
        });
        
        tabLabels[tabName] = tabLabel; // Stored for deletion purposes.
        
        // Add it to the tab container.
        tabLabelContainer.appendChild(tabLabel);
    };
    
    let removeTab = (tabName) =>
    {
        // If the tab doesn't seem to exist,
        if (!tabContents[tabName])
        {
            return false; // Return failure.
        }
        
        // If the tab to remove is currently displayed,
        //hide it.
        if (selectedTab === tabName)
        {
            tabContents[tabName].style.display = "none";
            selectedTab = null; // Reset the selected tab to null.
        }
        
        // Remove contents.
        tabContents[tabName].innerHTML = "";
        contentContainer.removeChild(tabContents[tabName]);
        delete tabContents[tabName]; // Let its memory free.
        
        // Remove label.
        tabLabelContainer.removeChild(tabLabels[tabName]);
        delete tabLabels[tabName]; // Allow memory to be freed.
        
        // Remove its activation function (if applicable).
        if (tabName in tabActiveFunctions)
        {
            delete tabActiveFunctions[tabName];
        }
        
        // Return success.
        return true;
    };
    
    let showTab = (tabName) =>
    {
        tabLabels[selectedTab].setAttribute("class", "tabLabel tabLabelShown");
    };
    
    let hideTab = (tabName) =>
    {
        tabLabels[selectedTab].setAttribute("class", "tabLabel tabLabelHidden");
    };
    
    let selectTab = (tabName) =>
    {
        let previouslySelectedTab = null;
        
        // If a tab is already selected,
        //deselect it.
        if (selectedTab !== null && selectedTab in tabContents && selectedTab in tabLabels)
        {
            tabContents[selectedTab].classList.add("tabContentHidden"); // Instead of using display = none,
                                                                        //this allows the tab to smoothly
                                                                        //transition out of view.
            
            tabContents[selectedTab].classList.remove("tabContentShown");
                                                                        
            tabLabels[selectedTab].setAttribute("class", "tabLabel tabLabelUnselected");
            
            // Note the previously selected tab.
            previouslySelectedTab = selectedTab;
        }
        
        // Note the newly-selected tab.
        selectedTab = tabName;
        
        // Not using the className/classList attributes because the author
        //is less familiar with them and this should do what is wanted.
        tabLabels[selectedTab].setAttribute("class", "tabLabel tabLabelSelected");
        
        // Show the content.
        tabContents[selectedTab].classList.add("tabContentShown");
        tabContents[selectedTab].classList.remove("tabContentHidden");
        
        // If the tab has a registered activation function,
        if (selectedTab in tabActiveFunctions)
        {
            tabActiveFunctions[selectedTab].call(this, tabContents[selectedTab]);
        }
        
        // Notify.
        if (onTabChange)
        {
            onTabChange.call(this, tabContents, selectedTab, previouslySelectedTab);
        }

        tabChangedNotifier.notify(HTMLHelper.TAB_CHANGED, selectedTab);
    };
    
    for (var i in tabDescriptors)
    {
        addTab(i, tabDescriptors[i]);
    }
    
    if (defaultTab)
    {
        selectTab(defaultTab);
    }
    
    const result = 
    {
        selectTab: selectTab,
        showTab: showTab,
        hideTab: hideTab,
        addTab: addTab,
        removeTab: removeTab,
        tabChanged: tabChangedNotifier, 
        setOnTabChange: (newOnTabChange) => { onTabChange = newOnTabChange; },
        rootElement: groupContainer
    };
    
    return result;
};

/*
    Adds a simple color chooser to the parent element.
    InitialColor should be a vector3 with minimum 0 and
    maximum 1 for each component.
 */
HTMLHelper.addColorChooser = function(initialColor, parent, onChange, inputStep, customizeTabs)
{
    // If not a vector, make it one.
    if (typeof initialColor === "string")
    {
        initialColor = JSHelper.colorToVector(initialColor);
        
        initialColor.x /= 255;
        initialColor.y /= 255;
        initialColor.z /= 255;
    }

    let container = document.createElement("div");
    let currentColor = initialColor.copy();
    let alpha = initialColor.w || 1.0;
    
    inputStep = inputStep || 0.01;
    
    container.classList.add("colorChooserContainer");
    
    let onUpdate = () =>
    {
        let htmlColor = JSHelper.vec3ToRGBString(currentColor, 1.0,
                                                            alpha);
        container.style.backgroundColor = htmlColor;
        
        if (onChange)
        {
            onChange(currentColor, htmlColor);
        }
    };
    
    onUpdate();
    
    let tabGroup = HTMLHelper.addTabGroup(
    {
        "RGB": (parent) =>
        {
            parent.innerHTML = ""; // Clear the tab.
            
            let handleRGBInput = function(component, componentLabel)
            {
                // Multiply and divide by input step -- the range input
                //does not seem to work well with initial values and floats.
                let part = HTMLHelper.addInput(componentLabel, currentColor[component] / inputStep,
                                               "range", parent, (newValue) =>
                {
                    currentColor[component] = newValue * inputStep;
                    
                    onUpdate();
                });
                
                part.min = 0;
                part.max = Math.floor(1 / inputStep);
                part.value = Math.floor(currentColor[component] / inputStep);
                
                part.step = 1;
                
                part.style.flexGrow = 1;
            };
            
            handleRGBInput("x", "Red");
            handleRGBInput("y", "Green");
            handleRGBInput("z", "Blue");
        },
        "Alpha": (parent) =>
        {
            parent.innerHTML = ""; // Clears the tab.
            
            let alphaInput = HTMLHelper.addInput("Transparency", alpha / inputStep, "range", parent,
                                                (newValue) =>
            {
                alpha = newValue * inputStep;
                
                onUpdate();
            });
            
            alphaInput.min = 0;
            alphaInput.max = Math.floor(1 / inputStep);
            alphaInput.step = 1;
            alphaInput.value = Math.floor(alpha / inputStep);
            
            alphaInput.style.flexGrow = 1;
        },
        "Dropper": (parent) =>
        {
            parent.innerHTML = "";
            
            const PRE_SELECT_TEXT = "Select a Color";
            const SELECTING_COLOR_TEXT = "Click on an Untainted Canvas";
            
            let selectColorButton;
            
            selectColorButton = HTMLHelper.addButton("Select a Color", parent, function()
            {
                selectColorButton.innerHTML = SELECTING_COLOR_TEXT;
                
                requestAnimationFrame(() =>
                {
                    let listener;
                    
                    listener = (event) =>
                    {
                        event.preventDefault();
                        
                        // Clear the listener.
                        document.documentElement.removeEventListener("pointerdown", listener);
                        
                        // Note the removed listener.
                        selectColorButton.innerHTML = PRE_SELECT_TEXT;
                        
                        // Unpause events.
                        JSHelper.Events.setPaused(false);
                        
                        let target;
                        target = event.target;
                        
                        if (target.nodeName.toLowerCase() === "canvas")
                        {
                            // Get a color.
                            let canvas = document.createElement("canvas");
                            
                            canvas.width = target.clientWidth;
                            canvas.height = target.clientHeight;
                            
                            let ctx = canvas.getContext("2d");
                            
                            ctx.drawImage(target, 0, 0, ctx.canvas.width, ctx.canvas.height);
                            
                            let imageData = ctx.getImageData(event.offsetX, event.offsetY, 2, 2);
                            let data = imageData.data;
                            
                            currentColor.x = data[0] / 255.0;
                            currentColor.y = data[1] / 255.0;
                            currentColor.z = data[2] / 255.0;
                            alpha = data[3] / 255.0;
                            
                            onUpdate();
                        }
                    };
                    
                    document.documentElement.addEventListener("pointerdown", listener, false);
                    
                    // Pause all events.
                    JSHelper.Events.setPaused(true);
                });
            });
            
            selectColorButton.style.textAlign = "center";
            selectColorButton.style.flexGrow = 1;
        }
    }, container, "RGB", true); // Show the RGB tab by default and DO
                                //run generation functions on each tab switch.
    
    container.style.display = "flex";
    container.style.flexDirection = "row";
    container.style.width = "auto";
    
    // If the user wanted to customize displayed tabs...
    if (customizeTabs)
    {
        customizeTabs.call(this, tabGroup);
    }
    
    parent.appendChild(container);
    
    return container;
};


// Inserted file Modeler3D.js encoding='utf-8'
"use strict";

function Modeler3D(verticies, onSubmit)
{
    const IN_WEBGL_2 = false;
    
    var vertexShaderSource = 
    `
    attribute vec4 a_position;
    attribute vec3 a_normal;
    attribute vec4 a_color;
       
    uniform mat4 u_worldMatrix;
    uniform mat4 u_worldInverseTranspose;
    uniform mat4 u_viewMatrix;
    uniform mat4 u_cameraMatrix;
    
    uniform vec4 u_cameraPosition;
    uniform vec4 u_lightPosition;
    uniform vec4 u_color;
    
    varying vec3 v_color;
    varying vec3 v_normal;
    varying vec3 v_toCamera;
    varying vec3 v_toLight;
    
    void main()
    {
        gl_Position = u_viewMatrix * u_cameraMatrix * u_worldMatrix * a_position;// * u_worldMatrix * u_cameraMatrix * u_viewMatrix;
        
        vec4 worldPosition = u_worldMatrix * a_position;
        
        v_toLight = (u_lightPosition - worldPosition).xyz;
        v_toCamera = (u_cameraPosition - worldPosition).xyz;
        
        v_normal = mat3(u_worldInverseTranspose) * a_normal.xyz;
        
        v_color = a_color.rgb; // (v_normal + vec3(0.5, 0.5, 0.5)) / 2.0;
    }
    `;
    
    var fragmentShaderSource = 
    `
    precision highp float;
    
    uniform float u_shine;
    
    varying vec3 v_color;
    varying vec3 v_normal;
    varying vec3 v_toCamera;
    varying vec3 v_toLight;
    
    void main()
    {
        // Normalize all varying vectors.
        vec3 normal = normalize(v_normal);
        vec3 toLight = normalize(v_toLight);
        vec3 toCamera = normalize(v_toCamera);
        
        // The vector halfway between the camera and light.
        vec3 halfVector = normalize(toCamera + toLight);
        
        // The lighting is proportional to the cosine of the angle between
        //the normal and the vector to the light.
        float lighting = dot(normal, toLight);
        
        // The specular (before being brought to a power) is proportional to the cosine of the angle between
        //the half-vector and the normal (a greater cosine value signifying
        //a greater correlation).
        float specular = dot(halfVector, toCamera);
        
        if (specular > 0.0 && lighting > 0.0)
        {
            specular = pow(specular, u_shine);
        }
        else
        {
            specular = 0.0;
        }
        
        if (lighting <= 0.0)
        {
            lighting = 0.0;
        }
        
        if (lighting >= 0.9)
        {
            lighting = 0.9;
        }
        
        vec4 resultantColor = vec4(v_color.rgb, 1.0);
        
        resultantColor.rgb += specular;
        resultantColor.rgb *= lighting;
        
        gl_FragColor = resultantColor;
    }
    `;
    
    var compileShader = function(gl, shaderType, shaderSource)
    {
        var shader = gl.createShader(shaderType);
        
        gl.shaderSource(shader, shaderSource);
        
        gl.compileShader(shader);
        
        // Check whether the shader was compiled successfully.
        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        {
            return shader;
        } // If not, note that an error occurred.
        else
        {
            var errorMessage = gl.getShaderInfoLog(shader);
            
            gl.deleteShadeer(shader);
            
            // Throw the error.
            throw errorMessage;
        }
    };
    
    var linkProgram = function(gl, vertexShader, fragmentShader)
    {
        var program = gl.createProgram();
        
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        
        gl.linkProgram(program);
        
        // Check whether the program was linked successfully.
        if (gl.getProgramParameter(program, gl.LINK_STATUS))
        {
            // If it linked successfully, return the program.
            return program;
        } // Otherwise, throw the error.
        else
        {
            var errorMessage = gl.getProgramInfoLog(program);
            
            gl.deleteProgram(program);
            
            // Throw the error.
            throw errorMessage;
        }
    };
    
    var canvas = document.createElement("canvas");
    canvas.style.width = "calc(100% - 2px)";
    canvas.style.height = "calc(100% - 25px)";
    canvas.style.touchAction = "none";
    
    var silhouettePoints = [];
    var editControlSilhouettePoints = [];
    var silhouetteDivisions = 8;
    var maxDivisions = 256;
    const GENERATION_MODES = { "EXTRUDE": 0, "ROTATE": 1 };
    let generationMode = GENERATION_MODES.ROTATE;
    let extrudeDirection = new Vector3(0, 0, 60);
    let noCap = false;
    
    // Generates verticies from a silhouette and renders.
    //If showProgress, show a progress window to the user.
    var recreateVerticies = function(silhouette, showProgress)
    {
        silhouette = silhouette || silhouettePoints; // Default values.
        
        let showProgressFunction = function(progress, status) {}; // A default, do nothing
                                                                  //update function.
        
        let hideProgressDialog = function() {};
        
        // If to display progress, display
        //the progress dialog.
        if (showProgress)
        {
            let progressDialog = SubWindowHelper.makeProgressDialog();
            
            // Update the progress.
            showProgressFunction = function(progress, status)
            {
                progressDialog.update(progress, status);
            };
            
            // Hide the dialog -- make the function.
            hideProgressDialog = function()
            {
                progressDialog.close();
            };
        }
        
        showProgressFunction(0.0, "Generating verticies...");
        
        // Create the vertex generation task.
        let vertexGenerationTask = (silhouette, silhouetteDivisions, generationMode, GENERATION_MODES, extrudeDirection, excludeCap) =>
        new Promise((resolve, reject) =>
        {
            var newVerticies;
            
            if (generationMode === GENERATION_MODES.EXTRUDE)
            {
                newVerticies = ModelHelper.extrude(silhouette, extrudeDirection, excludeCap, 0);
            }
            else
            {
                newVerticies = ModelHelper.silhouetteToVerticies(silhouette, 0, Math.PI * 2, silhouetteDivisions);
            }
            
            resolve(newVerticies);
        });
        
        var vertexGenerationPromise;
        
        // Decide whether to run the task directly, or on a background thread.
        if (silhouetteDivisions * silhouette.length > 200) // If more than 200 verticies...
        {
            // Create a background thread.
            let thread = ThreadHelper.makeLibLinkedThread();
            thread.putFunction("generateVerticies", ["silhouette", "silhouetteDivisions", "generationMode", "GENERATION_MODES", "extrudeDirection", "noCap"], vertexGenerationTask);
            
            // Compile the thread.
            thread.compile();
            
            // Create the promise.
            vertexGenerationPromise = thread.callFunction("generateVerticies", [silhouette, silhouetteDivisions, generationMode, GENERATION_MODES, extrudeDirection, noCap]);
        }
        else
        {
            // Run on the main thread.
            vertexGenerationPromise = vertexGenerationTask(silhouette, silhouetteDivisions, generationMode, GENERATION_MODES, extrudeDirection, noCap);
        }
        
        // Render after reloading verticies.
        vertexGenerationPromise.then((newVerticies) =>
        {
            verticies = newVerticies;
            //console.log(verticies);
            //window.v = verticies;
            
            return reloadVerticies((progress, message) => showProgressFunction(progress * 0.75 + 0.25, message), newVerticies);
        }).then(() =>
        {
            hideProgressDialog(); // Note: Even if the progress dialog wasn't created,
                                  //this function should be defined.
            
            render(rotateX, rotateY, rotateZ, tX, tY, tZ);
        }).catch(reason =>
        {
            hideProgressDialog();
            
            SubWindowHelper.alert("Error", "Vertex generation failed with error: " + reason);
        });
    };
    
    var controlsContainer = document.createElement("div");
    var cachedUndoBuffer = [], cachedRedoBuffer = [];
    
    // Allow the user to edit the shape's silhouette.
    var editPointsButton = HTMLHelper.addButton("Edit Silhouette", controlsContainer, function()
    {
        var pointsEditor = new Modeler2D(function(silhouette, editControlPoints, undoBuffer, redoBuffer)
        {
            silhouettePoints = silhouette; // Store the silhouette's point for later modification.
            editControlSilhouettePoints = editControlPoints; // The actual objects manipulated by the editor.
            
            // Cache the undo and redo buffers for ease of use.
            cachedUndoBuffer = undoBuffer;
            cachedRedoBuffer = redoBuffer;
            
            recreateVerticies(silhouette, true); // DO show progress.
        },  editControlSilhouettePoints, cachedUndoBuffer, cachedRedoBuffer);
    });
    
    var editModelButton = HTMLHelper.addButton("Edit Model", controlsContainer, function()
    {
        // Make a new window that allows the user to select a model and modify it.
        var optionsWindow = SubWindowHelper.create({ title: "Model Options" });
        
        var revolutionContainer = document.createElement("div");
        var extrudeContainer = document.createElement("div");
        
        var tabbedDisplay = HTMLHelper.addTabGroup(
        {
            "Solid of Revolution": revolutionContainer,
            "Extrusion": extrudeContainer
        }, optionsWindow, "Solid of Revolution");
        
        // Set default value.
        if (generationMode === GENERATION_MODES.ROTATE)
        {
            tabbedDisplay.selectTab("Solid of Revolution");
        }
        else
        {
            tabbedDisplay.selectTab("Extrusion");
        }
        
        // Solid of revolution options.
        HTMLHelper.addLabel("Number of Divisions: ", revolutionContainer);
        
        // Let the user edit the number of divisions (place holder, initial content, input type, parent,
        //onInput).
        var editDivisionsInput = HTMLHelper.addInput("Edit Divisions", silhouetteDivisions, "number", revolutionContainer);
        
        HTMLHelper.addHR(revolutionContainer);
        
        HTMLHelper.addButton("Submit", revolutionContainer, function()
        {
            var divisions;
            
            try
            {
                divisions = parseFloat(editDivisionsInput.value);
            }
            catch(event)
            {
                SubWindowHelper.alert("Warning", "Check divisions for number formatting errors.");
                
                return;
            }
            
            // Ensure the selected number of divisions is reasonable.
            if (divisions > 0 && divisions <= maxDivisions)
            {
                // Note that a solid of revolution is to be used.
                generationMode = GENERATION_MODES.ROTATE;
            
                // Update the divisions.
                silhouetteDivisions = divisions;
                recreateVerticies(undefined, true); // No changes to the silhouette,
                                                    //but still show progress.
                
                optionsWindow.close();
            }
            else
            {
                if (divisions <= 0)
                {
                    SubWindowHelper.alert("Error", "Divisions must be greater than zero.");
                }
                else if (divisions > maxDivisions)
                {
                    SubWindowHelper.alert("Error", "Divisions must be less than " + maxDivisions + ".");
                }
            }
        });
        
        editDivisionsInput.setAttribute("class", "smallInput");
        
        // Extrusion options.
        HTMLHelper.addHeader("Direction", extrudeContainer, "h3");
        HTMLHelper.addHR(extrudeContainer);
        
        var extrudeVectorToEdit = extrudeDirection.copy();
        HTMLHelper.addVectorEditor(extrudeVectorToEdit, 3, extrudeContainer);
        
        HTMLHelper.addHR(extrudeContainer);
        
        var resultantNoCap = noCap;
        
        HTMLHelper.addHeader("Exclude Cap", extrudeContainer, "h3");
        HTMLHelper.addInput("Exclude Cap", noCap, "checkbox", extrudeContainer, function(checked)
        {
            resultantNoCap = checked;
        });
        
        HTMLHelper.addHR(extrudeContainer);
        
        HTMLHelper.addButton("Submit", extrudeContainer, function()
        {
            generationMode = GENERATION_MODES.EXTRUDE;
            
            extrudeDirection = extrudeVectorToEdit;
            
            noCap = resultantNoCap;
            
            recreateVerticies(undefined, true); // No changes to the silhouette, but show generation progress.
            
            optionsWindow.close();
        });
    });
    
    var manipulationMode = "ROTATE";
    
    // Change the tool.
    var toggleToolButton = HTMLHelper.addButton("Zoom", controlsContainer, function()
    {
        if (manipulationMode === "ROTATE")
        {
            this.innerHTML = "Rotate";
            manipulationMode = "ZOOM";
        }
        else
        {
            this.innerHTML = "Zoom";
            manipulationMode = "ROTATE";
        }
    });
    
    var gl = canvas.getContext(IN_WEBGL_2 ? "webgl2" : "webgl");
    
    // If the user's browser does not support WebGL 2,
    //display an error message and exit.
    if (gl == undefined) // Note the use of a double, rather than a tripple equals-sign.
                         //a webkit-based browser on Linux sets gl to null, rather than 
                         //undefined. THIS IS NOT A MISTAKE.
    {
        SubWindowHelper.alert("WebGL", "Oh, no! Your browser does not support WebGL! Please try a different browser (or if using WebKit, try to use this program again later).");
        
        return;
    }
    
    // Set up program.
    var vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    var fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    var program = linkProgram(gl, vertexShader, fragmentShader);
    
    // Bind the program.
    gl.useProgram(program);
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    // Create matricies.
    var worldMatrix = new Mat44();
    worldMatrix.toIdentity();
    
    var cameraMatrix = new Mat44();
    cameraMatrix.toIdentity();
    
    var viewMatrix;
    
    var updateView = function()
    {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        
        var aspect = gl.drawingBufferHeight / gl.drawingBufferWidth;
        var fovY = 70 / 180.0 * Math.PI;
        var zMin = 1;
        var zMax = 3000;
        
        viewMatrix = Mat44Helper.frustumViewMatrix(aspect, fovY, zMin, zMax);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        
        return viewMatrix;
    };
    
    updateView();
    
    // Uniform locations.
    var worldMatrixUniformLocation = gl.getUniformLocation(program, "u_worldMatrix");
    var worldInverseTrLocation = gl.getUniformLocation(program, "u_worldInverseTranspose");
    var cameraMatrixUniformLocation = gl.getUniformLocation(program, "u_cameraMatrix");
    var viewMatrixUniformLocation = gl.getUniformLocation(program, "u_viewMatrix");
    var lightPositionUniformLocation = gl.getUniformLocation(program, "u_lightPosition");
    var cameraPositionUniformLocation = gl.getUniformLocation(program, "u_cameraPosition");
    var shineAmountUniformLocation = gl.getUniformLocation(program, "u_shine");
    
    // Attribute locations.
    var positionLocation = gl.getAttribLocation(program, "a_position");
    var normalsLocation = gl.getAttribLocation(program, "a_normal") || 1;
    var vertexColorLocation = gl.getAttribLocation(program, "a_color") || 2;
    
    //console.log("a_position: " + positionLocation + "; a_normal: " + normalsLocation + "; a_color: " + vertexColorLocation + ";");
    
    var subWindow = SubWindowHelper.create({ title: "Modeler 3D", minWidth: 200, minHeight: 150 });
    subWindow.appendChild(canvas);
    subWindow.appendChild(controlsContainer);
    
    subWindow.content.style.display = "flex";
    subWindow.content.style.flexDirection = "column";
    canvas.style.flexGrow = "1";

    let computedNormals = [];
    
    // Tabs.
    var fileMenu = new SubWindowTab("File");
    
    if (onSubmit)
    {
        fileMenu.addCommand("Submit", function()
        {
            onSubmit(verticies, computedNormals);
        });
    }
    
    fileMenu.addCommand("Exit", function()
    {
        subWindow.close();
    });
    
    subWindow.addTab(fileMenu);
    
    // WebGL Settings.
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    var vertexAttribArray;
    
    // Copied from WebGL3.html
    verticies = verticies ||
    [
        // Face 1
        50, 50, 0,
        50, 0, 0,
        0, 0, 0,
        
        50, 50, 0,
        0, 0, 0,
        0, 50, 0,
        
        // Face 2
        50, 0, 50,
        50, 50, 50,
        0, 50, 50,
        
        50, 0, 50,
        0, 50, 50,
        0, 0, 50,
        
        // Face 3
        0, 50, 0,
        0, 0, 0,
        0, 0, 50,
                
        0, 50, 0,
        0, 0, 50,
        0, 50, 50,
        
        // Face 4
        50, 0, 0,
        50, 50, 0,
        50, 50, 50,
        
        50, 0, 0,
        50, 50, 50,
        50, 0, 50,
        
        // Face 5
        50, 50, 50,
        50, 50, 0,
        0, 50, 0,
        
        50, 50, 50,
        0, 50, 0,
        0, 50, 50,
        
        // Face 6
        50, 0, 50,
        0, 0, 50,
        0, 0, 0,
        
        50, 0, 50,
        0, 0, 0, 
        50, 0, 0
    ];
    
    let numberOfTrianglesToRender = 0; // Updated after verticies are buffered.
    
    // Create a progress-estimating function.
    let normalComputationProgressEstimator = new ProgressEstimator((n) => n);
    
    // Returns a promise. An optional updateProgress function
    //can be provided, with arguments estimated progress and message.
    //Note: Estimated progress is a real number, from zero to one.
    
    var reloadVerticies = function(updateProgressArg, newVerticies)
    {
        // If a set of new verticies were specified,
        if (newVerticies)
        {
            // Update the list of verticies.
            verticies = newVerticies;
        }
        
        // Variables for progress tracking.
        const totalSegments = 6;
        let currentSegment = 0;
        
        let lastProgressMessage = "";
        let lastProgressAmount = 0;
        
        // Allows progress to be displayed to the user.
        const updateProgress = function(message)
        {
            // If no argument was given,
            if (updateProgressArg === undefined)
            {
                return; // Stop.
            }
            
            lastProgressMessage = message;
            lastProgressAmount = currentSegment;
            
            // Make sure totalSegments is updated.
            console.assert(currentSegment < totalSegments);
            
            // Otherwise, note the progress change.
            let progress = currentSegment / totalSegments;
            updateProgressArg( progress, message );
            
            // Note that a new segment has begun.
            currentSegment++;
        };
        
        updateProgress("Preparing to generate normals and vertex colors...");
        
        // Decide whether to create a background thread.
        let usingThreads = verticies.length > 300;
        var thread;
        
        // Only if using threads,
        if (usingThreads)
        {
            // Create a thread so that tasks can be be on a different OS-level
            //thread.
            thread = ThreadHelper.makeLibLinkedThread();
        }
        
        // Create tasks for async processing.
        const normalsTolerance = 0.3; // When cos(angle between normals) is greater than normalsTolerance,
                                      // those normals are blended.
        
        const computeNormalsTask = (verticies, normalsTolerance) =>
        new Promise((resolve, reject) =>
        {
            // Compute normals from verticies.
            let normals = ModelHelper.computeNormals(verticies, normalsTolerance);
            
            resolve(normals);
        });
        
        const createColorsTask = (verticies) =>
        new Promise((resolve, reject) =>
        {
            var colors = [];
            var currentPart = [];
            var j;
            for (var i = 0; i < verticies.length; i++)
            {
                currentPart = JSHelper.getRandomColorArray(false, // No rounding.
                        0.3, 0.4, // Min and max for red.
                        0.3, 0.4, // Min and max for green.
                        0.4, 0.9); // Min and max for blue.
                        
                // Append each part of the current to the full color array.
                for (j = 0; j < currentPart.length && j < 3; j++)
                {
                    colors.push(currentPart[j]);
                }
            }
            
            resolve(colors);
        });
        
        // Push the tasks to the background thread,
        //if using threads.
        if (usingThreads)
        {
            thread.putFunction("computeNormals", ["verticies", "normalsTolerance"], computeNormalsTask);
            thread.putFunction("createColors", ["verticies"], createColorsTask);
        
            // Compile the thread.
            thread.compile();
        }
        
        // Run this after finding normals and vertex colors.
        const bufferDataTask = (normals, vertexColors) =>
        new Promise((resolve, reject) =>
        {
            updateProgress("Preparing to buffer data...");
            
            // Push to the end of the task queue, so
            //that the user can be notified of any 
            //progress changes.
            setTimeout(() =>
            {
                // Create buffers.
                const positionBuffer = gl.createBuffer();
                const normalsBuffer = gl.createBuffer();
                const colorsBuffer = gl.createBuffer();
                
                // Create the vertex attributes array.
                if (IN_WEBGL_2)
                {
                    vertexAttribArray = gl.createVertexArray();
                    gl.bindVertexArray(vertexAttribArray);
                }
                
                // Buffer verticies.
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                
                // Enable the vertex buffer.
                gl.enableVertexAttribArray(positionLocation);
                
                // Attribute data buffering...
                gl.vertexAttribPointer(positionLocation, 3, // 3 elements/calling.
                        gl.FLOAT,
                        false, // No normalization
                        0, 0); // Zero stride, zero offset.
                
                
                // Send the data to WebGL.
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verticies), gl.STATIC_DRAW);
                
                
                // Select the normals buffer.
                gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
                
                gl.enableVertexAttribArray(normalsLocation);
                
                // Set up the pointer to the buffer.
                gl.vertexAttribPointer(normalsLocation, 3, // 3 elements/calling of shader
                        gl.FLOAT,
                        false,  // Do not normalize the normals.
                        0, 0); // No stride, no offset.
                
                
                // Send WebGL the data.
                gl.bufferData(gl.ARRAY_BUFFER, ModelHelper.vectorArrayToFloat32Array(normals), gl.STATIC_DRAW);
                
                
                // Select the colors buffer.
                gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
                
                gl.enableVertexAttribArray(vertexColorLocation);
                
                // Set up the pointer to the color attribute.
                gl.vertexAttribPointer(vertexColorLocation, 3, // Each color has three components.
                        gl.FLOAT, // Color components are floats.
                        false, // Don't normalize the colors.
                        0, 0); // Stride and offset are set to zero -- there is no ADDITIONAL STRIDE.
                        
                // Send the data to WebGL.
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColors), gl.STATIC_DRAW);
                
                // Update the number of triangles to render.
                numberOfTrianglesToRender = verticies.length / 3;
                
                // Note the completion of this segment.
                updateProgress("Buffered data!");
                
                resolve(gl);
            }, 0);
        });
        
        // Create promises for both tasks.
        
        var colorsCalledResult, normalsCalledResult, startTime;
        
        // Note: The createColorsTask will finish before
        //the computeNormalsTask -- this allows estimated
        //progress to be displayed during the often-long-running
        //computeNormalsTask.
        if (usingThreads)
        {
            colorsCalledResult = thread.callFunction("createColors", [verticies]);
            normalsCalledResult = thread.callFunction("computeNormals", [verticies, normalsTolerance]);
        }
        else
        {
            colorsCalledResult = createColorsTask(verticies);
            normalsCalledResult = computeNormalsTask(verticies, normalsTolerance);
        }
        
        // Start recording the running time...
        normalComputationProgressEstimator.startRecord();
        
        const computeColorsPromise = colorsCalledResult.then(
        (colors) => 
        {
            updateProgress("Created colors! Now computing normals...");
            
            return colors;
        });
        
        const computeNormalsPromise = normalsCalledResult.then(
        (normals) => 
        {
            updateProgress("Found normals!");
            
            // Stop recording progress.
            normalComputationProgressEstimator.stopRecord(verticies.length);
            
            return normals;
        });
        
        // If displaying progress,
        if (updateProgressArg)
        {
            // Loop, updating the progress bar.
            normalComputationProgressEstimator.predictProgressLoop(verticies.length, progress =>
            {
                // Underestimate progress.
                let progressPercentString = "~ " + Math.floor(progress * 0.8 * 100) + "%";
                
                if (progress > 1.0)
                {
                    progressPercentString = "...";
                }
                
                updateProgressArg(lastProgressAmount / totalSegments + progress / totalSegments, lastProgressMessage + " (" + progressPercentString + ")");
            });
        }
        
        // After both the normals and random colors for verticies have generated,
        return Promise.all([computeNormalsPromise, computeColorsPromise]).then(values =>
        {
            // Unpack arguments.
            const normals      = values[0],
                  vertexColors = values[1];
            
            updateProgress("Done finding normals and vertex colors! Now buffering data...");

            // Cache the normals.
            computedNormals = normals;

            // Returns a promise, so .then/.catch can be used.
            return bufferDataTask(normals, vertexColors);
        });
    };
    
    reloadVerticies().then(render);
    
    // Where the camera is to look.
    var cameraLookAt = new Vector3(12, 0, 10);
    var upDirection = new Vector3(0, 1, 0);
    var cameraPosition = new Vector3(0, 0, 405);
    
    var updateWorldMatrix = function()
    {
        gl.uniformMatrix4fv(worldMatrixUniformLocation, false, worldMatrix.getTranspose().getArray());
        gl.uniformMatrix4fv(worldInverseTrLocation, false, worldMatrix.getInverse().getArray());
    };
    
    var updateMatricies = function()
    {
        // DO transpose.
        //Note: In WebGL 1.0, transpose must be false, so
        //this transposition is done by JS.
        updateWorldMatrix();
        gl.uniformMatrix4fv(viewMatrixUniformLocation, false, viewMatrix.getTranspose().getArray());
        gl.uniformMatrix4fv(cameraMatrixUniformLocation, false, cameraMatrix.getTranspose().getArray());
    };
    
    var setLightPosition = function(position)
    {
        gl.uniform4fv(lightPositionUniformLocation, [position.x, position.y, position.z, 1]);
    };
    
    var setCameraPosition = function(position)
    {
        cameraMatrix = Mat44Helper.createLookAtMatrix(position, cameraLookAt, upDirection);
        gl.uniform4fv(cameraPositionUniformLocation, [position.x, position.y, position.z, 1]);
        
        //cameraMatrix.rotateY(0.5);
        
        gl.uniformMatrix4fv(cameraMatrixUniformLocation, false, cameraMatrix.getTranspose().getArray());
    };
    
    // Set specular amount. Should be large floats.
    var setShine = function(shine)
    {
        gl.uniform1f(shineAmountUniformLocation, shine);
    };
    
    // Set initial light and camera positions.
    setLightPosition(new Vector3(1, -36, 800));
    setCameraPosition(cameraPosition);
    setShine(5000.0);
    
    var timesAnimated = 0;
    
    var render = function(xRotation, yRotation, zRotation, tX, tY, tZ)
    {
        if (canvas.width != canvas.clientWidth || canvas.height != canvas.clientHeight)
        {
            updateView();
        }
        
        var time = (new Date()).getTime();
        
        if (xRotation === undefined)
        {
            xRotation = Math.cos(time / 1000) * 0.2;
        }
        
        if (yRotation === undefined)
        {
            yRotation = Math.sin(time / 2000) * 6.28;
        }
        
        tX = tX || 0.0;
        tY = tY || 0.0;
        tZ = tZ !== undefined ? tZ : 300 + Math.sin(time / 6000) * 20;
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        
        worldMatrix.save();
        
        worldMatrix.rotateY(yRotation);
        worldMatrix.rotateX(xRotation);
        worldMatrix.rotateZ(zRotation || 0.0);
        worldMatrix.translate([tX, tY, tZ]);
        
        setCameraPosition(cameraPosition);
        updateMatricies();
        
        gl.drawArrays(gl.TRIANGLES, 0, numberOfTrianglesToRender);
        
        worldMatrix.restore();
    };
    
    var animationRunning = false;
    var animate = function()
    {
        render();
        animationRunning = true;
        
        if (timesAnimated < 2000)
        {
            timesAnimated++;
            
            requestAnimationFrame(animate);
        }
        else
        {
            timesAnimated = 0;
            animationRunning = false;
        }
    };
    
    var tX = 0, tY = 0, tZ = 230,
        rotateX = 0.1, rotateY = 0.2, rotateZ = 0.3;
    render(rotateX, rotateY, rotateZ, tX, tY, tZ);
    
    var pointerDown = false;
    var lastX, lastY;
    
    JSHelper.Events.registerPointerEvent("down", canvas, function(e)
    {
        e.preventDefault();
        
        pointerDown = true;
        
        lastX = e.clientX;
        lastY = e.clientY;
    });
    
    JSHelper.Events.registerPointerEvent("move", canvas, function(e)
    {
        if (pointerDown)
        {
            e.preventDefault();
            
            var x = e.clientX;
            var y = e.clientY;
            
            var dx = x - lastX;
            var dy = y - lastY;
            
            if (manipulationMode === "ROTATE")
            {
                rotateX += dx / (canvas.width || 100) * 6.28;
                rotateY += (dx * dy) / (canvas.width + canvas.height) * 3.14;
                rotateZ += dy / (canvas.height || 100) * 6.28;
            }
            else
            {
                cameraPosition.z -= dy;
            }
            
            render(rotateX, rotateY, rotateZ, tX, tY, tZ);
            
            lastX = x;
            lastY = y;
        }
    });
    
    JSHelper.Events.registerPointerEvent("stop", canvas, function(e)
    {
        e.preventDefault();
        
        pointerDown = false;
    });
    
    /*
    canvas.onclick = function(e)
    {
        e.preventDefault();
        
        if (!animationRunning)
        {
            timesAnimated = 0;
            
            console.log("Starting animation.");
            
            animate();
        }
    };*/
}


// Inserted file MathHelper.js encoding='utf-8'
"use strict";

var MathHelper = {};

MathHelper.distance2D = function(point1, point2)
{
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
};

MathHelper.numberScheme = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

MathHelper.parseCharacter = function(character, numberScheme)
{
    numberScheme = numberScheme || MathHelper.numberScheme;
    
    let numberIndex = numberScheme.indexOf(character);

    return numberIndex;
};

// Parses a number and does not throw invalid formatting exceptions.
//InputString is the number's string representation, radix its base,
//and initialPlaceValue the place-value of the rightermost portion.
//Note that initialPlaceValue is zero by default. To auto-detect
//this initialPlaceValue, use MathHelper.forceParseFloat.
MathHelper.forceParseNumber = function(inputString, radix, initialPlaceValue)
{
    radix = radix || 10;

    let currentChar, result = 0, placeValue = initialPlaceValue || 0;
    
    // For every character in the string.
    //  Add its single-char parse times radix**position
    //   to the result.
    for (var i = inputString.length - 1; i >= 0; i--, placeValue++)
    {
        currentChar = inputString.charAt(i);
        
        // Accumulate!
        result += Math.pow( 
                              radix, placeValue // Multiply radix^placeValue
                          )
                          *
                              MathHelper.parseCharacter(currentChar); // with the value
                                                                       //signified by the
                                                                       //current character.
    }
    
    return result;
};

MathHelper.forceParseInt = function(inputString, radix)
{
    return MathHelper.forceParseNumber(inputString, radix, 0);
};

MathHelper.forceParseFloat = function(inputString, radix)
{
    let dotLocation = inputString.indexOf('.');
    let initialPlaceValue;
    let smallHalf = "", largeHalf = "";
    
    if (dotLocation === -1)
    {
        initialPlaceValue = 0;
        
        largeHalf = inputString;
    }
    else
    {
        initialPlaceValue = inputString.length - dotLocation - 1;
        
        // Divide into before/after the dot.
        smallHalf = inputString.substring(dotLocation + 1);
        largeHalf = inputString.substring(0, dotLocation);
    }
    
    let result = 0;
    
    result += MathHelper.forceParseNumber(smallHalf, radix, -initialPlaceValue);
    result += MathHelper.forceParseNumber(largeHalf, radix, 0);
    
    return result;
};

// Inserted file AreaHelper.js encoding='utf-8'
"use strict";

var AreaHelper = {};

// SAT stands for the "Separating Axis Theorem".
//It is applied to collisions through the repeated
//projection of both shapes onto a shared axis.
// Each shape should be an array of Vector3s --
//from the origin to each point on the shape.
//This is designed for a pair of shapes -- it
//returns whether there is separation between
//AT LEAST two of the shapes.
AreaHelper.runSATCollisionTest2D = function(shapes, axis)
{
    var pointIndex, currentShape, edge, axis, projection, testIndex, shapeLength;

    let testAxis = (axis, testShapeIndex) =>
    {
        var projection, pointIndex;
        var leftermostTest, rightermostTest;
        
        for (pointIndex = 0; pointIndex < shapes[testShapeIndex].length; pointIndex++)
        {
            projection = axis.dot(shapes[testShapeIndex][pointIndex]);
            
            if (pointIndex === 0 || projection < leftermostTest)
            {
                leftermostTest = projection;
            }
            
            if (pointIndex === 0 || projection > rightermostTest)
            {
                rightermostTest = projection;
            }
        }
        
        // For all shapes,
        for (shapeIndex = 0; shapeIndex < shapes.length; shapeIndex ++)
        {
            if (shapeIndex === testShapeIndex)
            {
                continue;
            }
        
            // Project each point onto the axis.
            for (pointIndex = 0; pointIndex < shapes[shapeIndex].length; pointIndex++)
            {
                projection = axis.dot(shapes[shapeIndex][pointIndex]);
                
                // If the point is within the test area,
                if (projection > leftermostTest && projection < rightermostTest)
                {
                    // A collision occured.
                    return true;
                }
            }
        }
        
        // There were no collisions on this axis.
        return false;
    };

    // For every shape,
    for (var shapeIndex = 0, l = shapes.length; shapeIndex < l; shapeIndex ++)
    {
        currentShape = shapes[shapeIndex];
    
        // For every point on the shape,
        for (pointIndex = 0, shapeLength = currentShape.length; pointIndex < shapeLength; pointIndex++)
        {
            testIndex = (pointIndex + 1) % shapeLength;
            
            // An edge cannot be created from two of the same points!
            if (testIndex === pointIndex)
            {
                break;
            }
        
            // Compute the edge vector for the current point.
            edge = currentShape[pointIndex].subtract(currentShape[pointIndex + 1]);
            
            // Zero-vectors have no direction, and so cannot be normalized.
            if (edge.x == 0 && edge.y == 0)
            {
                break;
            }
            
            // The axis to project onto is perpindicular to that edge.
            axis = edge.perpindicular2D().normalize2D();
            
            // Project onto that axis.
            if (!testAxis(axis, shapeIndex))
            {
                return false;
            }
        }
    }
    
    // A collision occurred.
    return true;
};



// Inserted file Mat.js encoding='utf-8'
"use strict";

/*
 A simple implementation of matricies in JavaScript.
 Just after construction, any such matrix is the zero
 matrix.
*/

function Mat(width, height)
{
    var me = this;
    
    this.content = [];
    this.rightMulTransform = true;
    
    var w = width;
    var h = height;
    
    var saveStack = [];
    
    var x;
    for (var y = 0; y < h; y++)
    {
        for (x = 0; x < w; x++)
        {
            this.content.push(0);
        }
    }
    
    this.getOrSetAt = function(x, y, setTo)
    {
        var result = 0;
        var index = x + y * w;
        
        if (index < this.content.length)
        {
            result = this.content[index];
            
            if (setTo !== undefined)
            {
                this.content[index] = setTo;
            }
        }
        
        return result;
    };
    
    this.getAt = function(x, y)
    {
        return this.getOrSetAt(x, y);
    };
    
    this.setAt = function(x, y, setTo)
    {
        return this.getOrSetAt(x, y, setTo);
    };
    
    this.swapValues = function(x1, y1, x2, y2)
    {
        var temp = me.getAt(x1, y1);
        
        me.setAt(x1, y1, me.getAt(x2, y2));
        me.setAt(x2, y2, temp);
    };
    
    this.leftMul = function(other)
    {
        return other.rightMul(this);
    };
    
    this.rightMul = function(other)
    {
        // Check to make sure other is not
        //undefined -- because of sloppy coding,
        //this could happen.
        if (other === undefined)
        {
            // Fail here?
            console.warn(`
            ~~~~~~~~~~~~~ WARNING -- POTENTIAL BUG ~~~~~~~~~~~
            Function Mat(${ w }, ${ h }).rightMul(otherMatrix)
            was called with otherMatrix === undefined. A copy
            of Mat(${ w }, ${ h }) was returned.
            `);
            
            // Return a copy -- nothing was to
            //happen.
            return this.getCopy();
        }
        
        var combinedW = w;
        var combinedH = other.getHeight();
        
        var otherWidth = other.getWidth();
        
        var resultMat = new Mat(combinedW, combinedH);
        
        var x, i, sum;
        for (var y = 0; y < combinedH; y++)
        {
            for (x = 0; x < combinedW; x++)
            {
                sum = 0;
                for (i = 0; i < h && i < otherWidth; i++)
                {
                    sum += me.getAt(x, i) * other.getAt(i, y);
                }
                
                resultMat.setAt(x, y, sum);
            }
        }
        
        return resultMat;
    };
    
    this.rightMulAndSet = function(other)
    {
        me.content = me.rightMul(other).getArrayCopy();
    };
    
    this.leftMulAndSet = function(other)
    {
        me.content = me.leftMul(other).getArrayCopy();
    };
    
    this.fromArray = function(array)
    {
        for (var i = 0; i < array.length; i++)
        {
            if (i >= this.content.length)
            {
                this.content.push(0);
            }
            
            this.content[i] = array[i];
        }
        
        return this;
    };
    
    this.getArray = function()
    {
        return this.content;
    };
    
    this.getArrayCopy = function()
    {
        var result = [];
        
        for (var i = 0; i < this.content.length; i++)
        {
            result[i] = this.content[i];
        }
        
        return result;
    };
    
    this.toArray = this.getArrayCopy;
    
    this.scalarMul = function(scalar)
    {
        for (var i = 0; i < this.content.length; i++)
        {
            this.content[i] *= scalar;
        }
    };
    
    this.multiplyScalar = this.scalarMul;

    this.scale = function(...scaleBy)
    {
        var indicies = [];

        if (typeof scaleBy[0] === "object" && scaleBy[0].toArray)
        {
            indicies = scaleBy[0].toArray();
        }
        else
        {
            indicies = scaleBy;
        }

        // Multiply the diagonal by segments of indicies.
        for (let i = 0; i < w && i < h && i < indicies.length; i++)
        {
            this.setAt(i, i, indicies[i] * this.getAt(i, i));
        }
    };
    
    this.getWidth = function()
    {
        return w;
    };
    
    this.getHeight = function()
    {
        return h;
    };
    
    this.toIdentity = function()
    {
        var y;
        for (var x = 0; x < w; x++)
        {
            for (y = 0; y < h; y++)
            {
                if (x == y)
                {
                    this.setAt(x, y, 1);
                }
                else
                {
                    this.setAt(x, y, 0);
                }
            }
        }
        
        return this;
    };
    
    this.toRightMulTranslateMatrix = function(translate)
    {
        this.toIdentity();
        
        for (var i = 0; i < translate.length && i < h - 1; i++)
        {
            this.setAt(w - 1, i, translate[i]);
        }
    };
    
    this.translate = function(translation)
    {
        for (var i = 0; i < translation.length && i < h - 1 && i < w - 1; i++)
        {
            if (this.rightMulTransform)
            {
                this.setAt(w - 1, i, this.getAt(w - 1, i) + translation[i]);
            }
            else
            {
                this.setAt(i, h - 1, this.getAt(i, h - 1) + translation[i]);
            }
        }
    };
    
    this.zoomCenter = function(zoom, width, height)
    {
        if (zoom < 1)
        {
            this.translate([width / 2, height / 2]);
        }
    
        this.multiplyScalar(zoom);
        
        if (zoom > 1)
        {
            this.translate([-width / 2, -height / 2]);
        }
    };
    
    this.getCopy = function()
    {
        return (new Mat(w, h)).fromArray(this.getArrayCopy());
    };
    
    this.multiplyRowByScalar = function(rowIndex, scalar)
    {
        for (var x = 0; x < w; x++)
        {
            this.setAt(x, rowIndex, this.getAt(x, rowIndex) * scalar);
        }
    };
    
    this.addConstantMultipleOfRowToRow = function(rowFromIndex, rowToIndex, scalar)
    {
        var rowFromValue, rowToValue;
        
        for (var x = 0; x < w; x++)
        {
            rowFromValue = this.getAt(x, rowFromIndex);
            rowToValue = this.getAt(x, rowToIndex);
            
            this.setAt(x, rowToIndex, rowToValue + rowFromValue * scalar);
        }
    };
    
    this.getInverse = function()
    {
        var moveToIdentity = this.getCopy();
        
        var moveToInverse = new Mat(w, h);
        moveToInverse.toIdentity();
        
        var x = 0, y = 0, diagonalValue = 0, scalar;
        for (x = 0; x < w; x++)
        {
            diagonalValue = moveToIdentity.getAt(x, x);
            
            // No inverse can be found using this method.
            //Return the closest value to the inverse, log
            //an error message.
            if (diagonalValue === 0)
            {
                console.warn("Error (Finding Inverse): Diagonal values cannot be zero!");
                return moveToInverse;
            }
            
            // Make the diagonal value 1.
            scalar = 1 / diagonalValue;
            
            moveToIdentity.multiplyRowByScalar(x, scalar);
            moveToInverse.multiplyRowByScalar(x, scalar);
            
            // Make all others in that column zero.
            for(y = 0; y < h; y++)
            {
                // If the row indicies match, skip
                //(the diagonal shouldn't be zero!)
                if (x === y)
                {
                    continue;
                }
                
                scalar = -moveToIdentity.getAt(x, y);
                moveToIdentity.addConstantMultipleOfRowToRow(x, y, scalar);
                moveToInverse.addConstantMultipleOfRowToRow(x, y, scalar);
            }
        }
        
        return moveToInverse;
    };
    
    this.transpose = function()
    {
        var result = new Mat(h, w);
        var y;
        
        for (var x = 0; x < w; x++)
        {
            for (y = 0; y < h; y++)
            {
                result.setAt(y, x, me.getAt(x, y));
            }
        }
        
        return result;
    };
    
    this.getTranspose = this.transpose;

    this.transposeAndSet = function()
    {
        me.result = me.transpose().result;

        const oldW = me.w;
        me.w = me.h;
        me.h = oldW;
    };
    
    this.save = function()
    {
        saveStack.push(this.getArrayCopy());
        
        // If the save stack is getting long, warn.
        if (saveStack.length > 10000)
        {
            console.warn("SaveStack.length = " + saveStack.length + ". Check for resource leaks.");
            window.leakedMat = this;
        }
    };
    
    this.restore = function()
    {
        if (saveStack.length > 0)
        {
            var restoreTo = saveStack.pop();
            
            this.fromArray(restoreTo); // ".content = restoreTo" should be faster than fromArray.
        }
    };
    
    this.toString = function(roundTo)
    {
        roundTo = roundTo || 3;
        
        var result = "[\n";
        
        var strings = [];
        
        var colStrings = [];
        
        var x, y, currentString, maxStringLengthInCol = 0, roundingMultiplier = Math.pow(10, roundTo);
        for (x = 0; x < w; x++)
        {
            maxStringLengthInCol = 0;
            colStrings = [];
            
            for (y = 0; y < h; y++)
            {
                currentString = (Math.floor(this.getAt(x, y) * roundingMultiplier) / roundingMultiplier) + "";
                
                if (currentString.indexOf(".") == -1)
                {
                    currentString += ".";
                }
                
                colStrings.push(currentString);
                
                maxStringLengthInCol = Math.max(currentString.length, maxStringLengthInCol);
            }
            
            for (y = 0; y < h; y++)
            {
                while (colStrings[y].length < maxStringLengthInCol)
                {
                    colStrings[y] += "0";
                }
            }
            
            strings.push(colStrings);
        } 
        
        for (y = 0; y < h; y++)
        {
            for (x = 0; x < w; x++)
            {
                result += " " + strings[x][y];
            }
            
            result += "\n";
        }
        
        result += "]";
        
        return result;
    };
}

function Mat44()
{
    var me = this;
    
    Mat.call(me, 4, 4);
    
    var transform = function(transformMatrix)
    {
        if (me.rightMulTransform)
        {
            me.rightMulAndSet(transformMatrix);
        }
        else
        {
            me.leftMulAndSet(transformMatrix.transpose());
        }
    };
    
    this.rotateX = function(dTheta)
    {
        var transformMatrix = Mat44Helper.getXRotationMatrix(dTheta);
        
        transform(transformMatrix);
    };
    
    this.rotateY = function(dTheta)
    {
        var transformMatrix = Mat44Helper.getYRotationMatrix(dTheta);
        
        transform(transformMatrix);
    };
    
    this.rotateZ = function(dTheta)
    {
        var transformMatrix = Mat44Helper.getZRotationMatrix(dTheta);
        
        transform(transformMatrix);
    };
}

var MatHelper = {};
var Mat33Helper = {};
var Mat44Helper = {};

/*
 This can be derived using y = r*sin(a), x = r*cos(a),
 y' = r*sin(a + da), and x' = r*cos(a + da). y' and x' can
 then be expanded using trigenometric identities (derivable from
 exp(ix + iy) = cos(x+y) + i*sin(x + y) 
 exp(ix + iy) = exp(ix) * exp(iy) = (cos(x) + i*sin(x))*(cos(y) + i*sin(y)).
*/
Mat33Helper.getRotationRightMulMatrix = function(deltaTheta)
{
    var result = new Mat(3, 3);
    result.toIdentity();
    
    result.setAt(0, 0, Math.cos(deltaTheta));
    result.setAt(1, 0, -Math.sin(deltaTheta));
    result.setAt(0, 1, Math.sin(deltaTheta));
    result.setAt(1, 1, Math.cos(deltaTheta));
    
    return result;
};

Mat44Helper.getXRotationMatrix = function(deltaTheta)
{
    var result = new Mat(4, 4);
    result.toIdentity();
    
    var cosValue = Math.cos(deltaTheta);
    var sinValue = Math.sin(deltaTheta);
    
    result.setAt(1, 1, cosValue);
    result.setAt(2, 1, sinValue);
    result.setAt(1, 2, -sinValue);
    result.setAt(2, 2, cosValue);
    
    return result;
};

Mat44Helper.getYRotationMatrix = function(deltaTheta)
{
    var result = new Mat(4, 4);
    result.toIdentity();
    
    var cosValue = Math.cos(deltaTheta);
    var sinValue = Math.sin(deltaTheta);
    
    result.setAt(0, 0, cosValue);
    result.setAt(2, 0, -sinValue);
    result.setAt(0, 2, sinValue);
    result.setAt(2, 2, cosValue);
    
    return result;
};

Mat44Helper.getZRotationMatrix = function(deltaTheta)
{
    var result = new Mat(4, 4);
    result.toIdentity();
    
    var cosValue = Math.cos(deltaTheta);
    var sinValue = Math.sin(deltaTheta);
    
    result.setAt(0, 0, cosValue);
    result.setAt(1, 0, -sinValue);
    result.setAt(0, 1, sinValue);
    result.setAt(1, 1, cosValue);
    
    return result;
};

Mat44Helper.fromArray = function(array)
{
    var result = new Mat44();
    result.fromArray(array);
    
    return result;
};

// Get a matrix (for right multiplication) that positions the camera
//such that it sees lookAt and up is up.
Mat44Helper.createLookAtMatrix = function(cameraPosition, lookAt, up)
{
    var zAxis = lookAt.subtract(cameraPosition);
    var yAxis = up.cross(zAxis);
    var xAxis = yAxis.cross(zAxis);
    
    xAxis.normalize();
    yAxis.normalize();
    zAxis.normalize();
    
    return Mat44Helper.createAxisTransformMatrix(xAxis, yAxis, zAxis, cameraPosition);
};

// Create an axis transform matrix.
//See webglfundamentals.org.
//TODO Double-check this refrence URL.
Mat44Helper.createAxisTransformMatrix = function(xAxis, yAxis, zAxis, origin)
{
    var result = Mat44Helper.fromArray(
    [
        xAxis.x, xAxis.y, xAxis.z, origin.x,
        yAxis.x, yAxis.y, yAxis.z, origin.y,
        zAxis.x, zAxis.y, zAxis.z, origin.z,
        0,       0,       0,       1
    ]);
    
    return result;
};

// Note: Aspect is height / width.
//zMin = zNear, zMax = zFar. Note that with this 
//view matrix, positive z is into the screen.
// This matrix is designed for right-multiplication,
//so be sure to transpose it if using for left-multiplication!
Mat44Helper.frustumViewMatrix = function(aspect, fovY, zMin, zMax)
{
    /*
        Note: result[x, y] denotes the (y + 1)th row and the (x + 1)th column
        of the resultant matrix.
    
        A reminder on how this works:
            For every point in world-space, x, y, and z must be scaled between -1 and 1 (clip-space).
            This can be done using a frustum (the shape below).
                              yMax (FOR ALL POINTS)
                             /|
                            / |
                  +y       [  |                                 < ---]
                   ^      /[  |                                      ]
                   |  yMin (FOR ALL POINTS)                          ]
                   |    /  [  |                                      ]
                   |   /|  P  |                 < ---]               ]  yMax (FOR THE
                   |  / |  [  |                      ]               ]  CURRENT POINT).
                   | /  |  [  |                      ]  P_y          ]
                   |/   |  [  |                      ]               ]
            CAMERA /)A  | P_z | ----------> +z  < ---]          < ---]
                       zMin  zMax
                       
            Consider a point, P and scaled point Q.
            
            To scale the y-component of P:
                Let A = fovY / 2.
                
                Define yMax to be the maximum P_y that can be displayed for the current P_z (before being clipped). This is labeled as "yMax (FOR THE CURRENT POINT)" on the diagram.
                
                Find yMax (For z = P_z):
                  tan(A)          = yMax / z
                  tan(A) * z      = yMax
                  yMax            = z * tan(A)
                
                Scale P_y:
                  Let y = P_y and y' = Q_y. (Where Q = P')
                  
                  y' = y / yMax                 Scale such that |y'| belongs to [0, 1].
                  y' = y / (z * tan(A))         Substitute.
                  y' = y / tan(A)
                        * (1 / z) < ------------ WebGL automatically divides by the w-component of gl_Position, so, a +1 is placed at result[2, 3] (zero-indexed) to set Q_z to w. 
                 
                  Based on this, result[1, 1] should be set to cot(A) to set y' to y / tan(A).
                
            To scale the x-component of P:
                Again, let x = P_x, y = P_y, z = P_z,
                    x' = Q_x, y' = Q_y, and z' = Q_z.
                
                Rather than providing separate fields of view for the x and y-axes, the x-axis is scaled with the y-axis.
                To prevent shapes generated from seeming "stretched," or "squished," we multiply the scaling factor by an "aspect ratio" -- the width / the height of the screen. This can be thought of as converting units -- from y-axis' units to the x-axis' units.
                
                x' = x * k * aspect_ratio where k = cot(A) * (1 / z) -- the scaling factor for P_y.
                x' = x * cot(A) / z * aspect_ratio (Note that x' is multiplied by -1 in the solution.
                                                    THIS IS A HACK. It compensates for an error somewhere
                                                    in the math and makes things work).
                
                From this, result[0, 0] is set to cot(A) * aspect_ratio. Note that the setting of result[2, 3] causes WebGL to divide x and y by z.
                
            To scale the z-component of P:
                P_z must be mapped from [zMin, zMax] to [-1, 1]. To do this, let
                z' = a / z + b -- scaling and shifting z to map between domains.
                Note that a division by z occurs -- WebGL automatically divides
                all components, even z by w, which we have set to z. This makes
                the math slightly more complicated for the z-component, but 
                less complicated for the x and y-components.
                
                To find a and b:
                    -1.0 = a / zMin + b and 1.0 = a / zMax + b
                    
                    -1.0 - a / zMin = b and 1.0 - a / zMax = b
                    -1.0 - a / zMin      =   1.0 - a / zMax
                    1.0 + a / zMin       =   a / zMax - 1.0
                    a / zMin - a / zMax  =   -2.0
a * zMax / (zMin * zMax) - a * zMin / (zMin * zMax)    =   -2.0
                    a * (zMax - zMin) / (zMin * zMax)  =   -2.0
                    a                                  =   -2.0 * zMin * zMax / (zMax - zMin)
                    
                    1.0 = a / zMax + b
                    1.0 = -2.0 * zMin * zMax / ((zMax - zMin) * zMax) + b
                    b   = 1.0 + 2 * zMin * zMax / (zMax * (zMax - zMin))
                    b   = 1.0 + 2 * zMin / (zMax - zMin), zMax != 0
                    so,
                    
                    z' = (-2.0 * zMin * zMax / (zMax - zMin)) / z + 1.0 + 2 * zMin / (zMax - zMin).
                
                    Assuming w = z,
                    result[3, 2] = a = -2.0 * zMin * zMax / (zMax - zMin)
                    
                    result[2, 2] = b = 1.0 + 2 * zMin / (zMax - zMin) <-- This part is multiplied
                                                                              by z, but then DIVIDED
                                                                              BY z BY WEBGL BECAUSE IT
                                                                              DIVIDES BY W.
        Sources:
            Matrix.js (Written 1 year ago).
            <stackoverflow link here>
    */
    
    // Calculate cot(fovY / 2).
    var cotValue = Math.tan(fovY / 2);
    
    // Uncomment for aid in debugging (like a unit-test,
    //but not as useful).
    //console.warn(1.0 + 2 * zMin / (zMax - zMin) + " b");
    //console.warn(-2.0 * zMin * zMax / (zMax - zMin) + " a");
    
    // Avoid division by zero.
    if (cotValue !== 0)
    {
        cotValue = 1 / cotValue;
    }
    else
    {
        // A very large number to approximate
        //the <u>+</u>Infinity produced by
        //1 / 0.
        cotValue = 999999999;
    }
    
    var result = Mat44Helper.fromArray(
    [
        cotValue * aspect, 0,        0,                              0,
        0,                 -cotValue, 0,                              0,
        0,                 0,        1.0 + 2 * zMin / (zMax - zMin), -2.0 * zMin * zMax / (zMax - zMin),
        0,                 0,        1,                              0
    ]);
    
    return result;
};

Mat33Helper.getTranslateMatrix = function(tX, tY)
{
    var result = new Mat(3, 3);
    result.toRightMulTranslateMatrix([tX, tY]);
    
    return result;
};

MatHelper.transformPoint = function(arrayVector, transformMatrix)
{
    var pointMatrix = new Mat(1, arrayVector.length);
    pointMatrix.content = arrayVector;
    
    pointMatrix.fromArray(pointMatrix.rightMul(transformMatrix).getArray());
};

// Inserted file SyntaxHelper.js encoding='utf-8'
"use strict";

var SyntaxHelper =
{
    END_OF_LINE: -12,
    COMMENT: "COMMENT",
    COMMENT_MULTI_LINE: "COMMENT_MULTI_LINE",
    COMMENT_HTML: "COMMENT_HTML",
    STRING: "QUOTE",
    NUMBER_START: "NUMBER_START",
    NUMBER_STOP: "NUMBER_STOP",
    STANDARD_SEPARATORS: ">(<, \t*%:-+/!=.){}[];",
    CSS_LABEL_SEPARATORS: "[],{}; :\t",
    SEARCH_ALL: { all: true },
    SINGLE_CHAR_SEPARATOR: "",
    NUMBER_SEPARATORS: ">(<, \t*%/!=){}",
    COMPARISON_SEARCH_SEPARATOR: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234567890 \t[]()_?!",

    LABEL_SINGLE: "SINGLE_LABEL",
    LABEL_START: "START_LABEL",
    LABEL_END: "END_LABEL",
    LABEL_CONTINUED: "CONTINUED_LABEL",

    SCRIPT_BLOCK: "SCRIPT_BLOCK",
    STYLE_BLOCK: "STYLE_BLOCK"
};

SyntaxHelper.regexps =
{
    NUMBER_START: new RegExp("(?:^|[\\( \\t\\=\\/\\+\\-\\#\\;])\\d+(?:[\\. \\t\\=\\/\\+\\-\\#\\;\\)\\,]|$)", "g"),
    NUMBER_STOP: new RegExp("\\.\\d+(?:[\\. \\t\\=\\/\\+\\-\\#\\;\\)\\,]|$)", "g")
};

SyntaxHelper.highlighters = { "js": new JavaScriptHighlightScheme(), "css": new CSSSyntaxHighlightScheme(), "html": new HTMLSyntaxHighlightScheme(),
                    "sh": new BashHighlightScheme(),
                    "java": new JavaHighlightScheme(),
                    "python": new PythonHighlightScheme() };

SyntaxHelper.fileExtensionToHighlighterMap =
{
    js: SyntaxHelper.highlighters.js,
    css: SyntaxHelper.highlighters.css,
    html: SyntaxHelper.highlighters.html,
    htm: SyntaxHelper.highlighters.html,
    sh: SyntaxHelper.highlighters.sh,
    java: SyntaxHelper.highlighters.java,
    py: SyntaxHelper.highlighters.python
};

SyntaxHelper.getStillOpenBrackets = function(text, 
        bracketOpenChar, bracketCloseChar, countOpenBefore,
        quoteChars, inQuote)
{
    var result = countOpenBefore || 0;
    var currentChar;
    
    var inQuote = inQuote || false;
    
    quoteChars = quoteChars || {};
    
    for (let i = 0; i < text.length; i++)
    {
        currentChar = text.charAt(i);
        
        if (currentChar === bracketOpenChar && !inQuote)
        {
            result ++;
        }
        else if (currentChar === bracketCloseChar && !inQuote)
        {
            result --;
        }
        else if (quoteChars[currentChar])
        {
            inQuote = !inQuote;
        }
    }
    
    return result;
};

function SyntaxChecker()
{
    const me = this;
    
    this.state = {};
    
    this.quoteChars =
    {
        "'": true,
        '\"': true,
        '`': true
    };
    
    this.navigationHelper =
    {
        levelCheckChars: [["[", "]"],
                          ["{", "}"],
                          ["(", ")"]],
                          
        // Note: THIS MUST BE CALLED FOR EVERY LINE,
        //in order of the line's number -- lineNo should
        //increase by 1 each call.       
        recordLevel: (state, text, lineNo) =>
        {
            if (!state.subZero)
            {
                state.subZero = {};
            }
            
            if (state.lastLineWithBracketCheck === lineNo)
            {
                console.log ("Error: state.lastLineWithBracketCheck === lineNo === " + lineNo);
                
                return;
            }
            
            state.lastLineWithBracketCheck = lineNo;
            
            var startLabel, endLabel;
        
            for (var i in me.navigationHelper.levelCheckChars)
            {
                startLabel = me.navigationHelper.levelCheckChars[i][0];
                endLabel = me.navigationHelper.levelCheckChars[i][1];
                
                if (state["openBrackets" + startLabel] === undefined)
                {
                    state["openBrackets" + startLabel] = [];
                }
                
                state["openBrackets" + startLabel][lineNo] = ( 
                  SyntaxHelper.getStillOpenBrackets(text, 
                    startLabel, 
                    endLabel, 
                    state["openBrackets" + startLabel][lineNo - 1] || 0,
                    me.quoteChars ));
                    
                state["openBrackets" + startLabel].length = lineNo + 1;
                    
                if (state["openBrackets" + startLabel] < 0)
                {
                    state.subZero[lineNo] = [startLabel, state["openBrackets"]];
                }
            }
        },
        
        getLastLineBelowLevel: (state, level, levelCheckChar) =>
        {
            var levelRecords = state["openBrackets" + levelCheckChar];
            
            for (let i = levelRecords.length - 1; i >= 0; i++)
            {
                if (levelRecords[i] < level)
                {
                    return i;
                }
            }
            
            return -1; // If -1 is returned, no lines were below
                       //the requested level.
        },
        
        getBracketsBelowOrAboveLevelOnLine: (state, lineNumber, level, belowLevel) =>
        {
            var currentGroupingCharacter, currentLevel;
            var count = {}; // Accumulates the number of open brackets on a specific line.
            
            // For/in for flexibility.
            for (var label in me.navigationHelper.levelCheckChars)
            {
                currentGroupingCharacter = me.navigationHelper.levelCheckChars[label][0];
                
                currentLevel = state["openBrackets" + currentGroupingCharacter][lineNumber];
                
                if (count[currentGroupingCharacter] === undefined)
                {
                    count[currentGroupingCharacter] = 0;
                }
                
                if (state["openBrackets" + currentGroupingCharacter][lineNumber] < level && belowLevel
                    || 
                    state["openBrackets" + currentGroupingCharacter][lineNumber] > level && !belowLevel)
                {
                    count[currentGroupingCharacter] = 1;
                }
            }
            
            return count;
        },
        
        getBracketsBelowLevelOnLine: (state, lineNumber, level) =>
        {
            return me.navigationHelper.getBracketsBelowOrAboveLevelOnLine(state, lineNumber, level, true);
        },
        
        getBracketsAboveLevelOnLine: (state, lineNumber, level) =>
        {
            return me.navigationHelper.getBracketsBelowOrAboveLevelOnLine(state, lineNumber, level, false);
        }
    };
    
    this.errorCheckers =
    {
        unendedString: (state, text) =>
        {
            var currentChar = "",
                lastChar    = "";
            var inSingleQuote = false;
            var inDoubleQuote = false;
            
            for (var i = 0; i < text.length; i++)
            {
                currentChar = text.charAt(i);
                
                if (currentChar === "'"
                    && lastChar !== '\\'
                     && !inDoubleQuote)
                {
                    inSingleQuote = !inSingleQuote;
                }
                else if (currentChar === '\"'
                    && lastChar !== '\\'
                    && !inSingleQuote)
                {
                    inDoubleQuote = !inDoubleQuote;
                }
                
                lastChar = currentChar;
            }
            
            return inSingleQuote || inDoubleQuote;
        },
        
        // Note that lineNo is the line number, where no
        //is a poor abbrievation for number. You might
        //want to rename this.
        bracketLevelError: (state, text, lineNo, isLastLine) =>
        {
            me.navigationHelper.recordLevel(state, text, lineNo);
            
            let message = undefined;
            
            // If any brackets have a level lesser than zero:
            var bracketsBelowZero = me.navigationHelper.getBracketsBelowLevelOnLine(state, lineNo, 0);
            
            if (JSON.stringify(bracketsBelowZero) != JSON.stringify(state.lastLineBelowZero || {}))
            {
                if (message === undefined)
                {
                    message = "";
                }
            
                var totalBelowZero = 0;
                
                for (var bracket in bracketsBelowZero)
                {
                    totalBelowZero += bracketsBelowZero[bracket];
                    
                    if (bracketsBelowZero[bracket] > 0)
                    {
                        message += "The bracket level for " + bracket + " is below zero. ";
                    }
                }
                
                state.lastLineBelowZero = bracketsBelowZero;
            }
            
            if (isLastLine)
            {
                var bracketsAboveZero = me.navigationHelper.getBracketsAboveLevelOnLine(state, lineNo, 0);
                
                var totalAboveZero = 0;
                
                for (var bracket in bracketsAboveZero)
                {
                    totalAboveZero += bracketsAboveZero[bracket];
                    
                    if (bracketsAboveZero[bracket])
                    {
                        message = message || "";
                        message += "Bracket " + bracket + " has no end. ";
                    }
                }
            }
            
            return message;
        }
    };
    
    this.checkFunctions =
    {
        "Line Level Check": me.errorCheckers.bracketLevelError
    };

    this.reset = function()
    {
        me.state = {};
        me.state.problems = [];
    };
    
    this.setBaseProblems = function(baseProblems)
    {
        me.state.problems = baseProblems;
    };

    this.checkLine = function(lineText, lineNumber, lastLine, lineLabels)
    {
        var currentMessage = undefined;
        
        if (lineText === undefined)
        {
            return;
        }
        
        for (var key in me.checkFunctions)
        {
            currentMessage = me.checkFunctions[key](me.state, lineText, lineNumber, lastLine || false);
            
            if (currentMessage)
            {
                me.state.problems.push(
                {
                    check: key,
                    lineNumber: lineNumber,
                    lineText: lineText,
                    message: currentMessage
                });
            }
        }
    };
    
    this.checkFinalLine = function(lineText, lineNumber, lineLabels)
    {
        me.checkLine(lineText, lineNumber, true);
    };
    
    this.getProblems = function()
    {
        return me.state.problems;
    };
}

SyntaxHelper.makeChecker = () =>
{
    return new SyntaxChecker();
};


function SyntaxSelector(initialHighlightScheme)
{
    const me = this;
    me.baseColor = "white";
    me.highlightScheme = initialHighlightScheme || (new HTMLSyntaxHighlightScheme());

    this.setDefaultHighlightScheme = function(key)
    {
        if (typeof (key) === "string")
        {
            if (key in SyntaxHelper.fileExtensionToHighlighterMap)
            {
                me.highlightScheme = SyntaxHelper.fileExtensionToHighlighterMap[key];
                return true;
            }
        }
        else if (typeof (key) === "object")
        {
            me.highlightScheme = key;

            return true;
        }

        return false;
    };

    this.getDefaultHighlighter = function()
    {
        return me.highlightScheme;
    };

    this.setDefaultHighlighter = function(key)
    {
        me.setDefaultHighlightScheme(key);
    };

    this.getBaseColor = function()
    {
        return me.baseColor;
    };

    /* Give only applicable labels. */
    this.getColor = function(labels)
    {
        let j, k, l, currentLabel, samePrecedenceLabels;

        let sortedLabels = getDepthSortedLabels(labels);

        /* Do any request a specific highlighter? */
        let isMissingDependency = me.getMissingDependencyCheck(labels);//, sortedLabels);
        let highlightScheme = me.getHighlightScheme(labels, isMissingDependency, sortedLabels);

        /* DANGER! This loop returns! */
        for (let i = 0; i < highlightScheme.labelPrecedence.length; i++)
        {
            /* If there are multiple labels with the same precedence,
            choose the one that started first. */
            if (typeof (highlightScheme.labelPrecedence[i]) === "object")
            {
                samePrecedenceLabels = [];
                for (j = 0; j < highlightScheme.labelPrecedence[i].length; j++)
                {
                    currentLabel = highlightScheme.labelPrecedence[i][j];

                    if (currentLabel in labels)
                    {
                        for (k = 0; k < labels[currentLabel].length; k++)
                        {
                            if (!isMissingDependency(labels[currentLabel][k]))
                            {
                                samePrecedenceLabels.push(labels[currentLabel][k]);
                            }
                        }
                    }
                }

                /* Sort the labels by which occurs first. */
                samePrecedenceLabels.sort(function(first, second)
                {
                    return first.startIndex - second.startIndex;
                });

                /* Choose the first, if any, that is applicable. */
                if (samePrecedenceLabels.length > 0)
                {
                    return highlightScheme.labelMap[samePrecedenceLabels[0].tagName];
                }
            }
            else /* Otherwise, if only one with the same precedence, */
            {
                currentLabel = highlightScheme.labelPrecedence[i];

                if (currentLabel in labels)
                {
                    let missingDependencyCount = 0;

                    for (l = 0; l < labels[currentLabel].length; l++)
                    {
                        if (isMissingDependency(labels[currentLabel][l]))
                        {
                            missingDependencyCount++;
                        }
                    }

                    if (missingDependencyCount !== labels[currentLabel].length)
                    {
                        return highlightScheme.labelMap[currentLabel];
                    }
                }
            }
        }

        /* No matching tags... */
        return me.getBaseColor();
    };

    this.getLabelIndicies = function(text, indexOffset, highlightScheme)
    {
        highlightScheme = highlightScheme || me.highlightScheme;

        var result = {};
        indexOffset = indexOffset || 0;

        var noteLabel = function(labelName, indexStart, indexStop, labelType, linkTo)
        {
            if (!result[labelName])
            {
                result[labelName] = [];
            }

            if (indexStart >= 0)
            {
                indexStart += indexOffset;
            }

            if (indexStop >= 0)
            {
                indexStop += indexOffset;
            }

            if (highlightScheme.labelExtensions && highlightScheme.labelExtensions.end[labelName] && indexStop >= 0
                    && labelType !== SyntaxHelper.LABEL_START)
            {
                if (labelType === SyntaxHelper.LABEL_END)
                {
                    indexStart += highlightScheme.labelExtensions.end[labelName];
                }

                indexStop += highlightScheme.labelExtensions.end[labelName];
            }

            if (highlightScheme.labelExtensions && highlightScheme.labelExtensions.start[labelName] && indexStart >= 0
                    && labelType !== SyntaxHelper.LABEL_END)
            {
                if (labelType === SyntaxHelper.LABEL_START)
                {
                    indexStop += highlightScheme.labelExtensions.start[labelName];
                }

                indexStart += highlightScheme.labelExtensions.start[labelName];
            }

            let newLabel = new SyntaxLabel(labelName, indexStart, indexStop, labelType, linkTo);

            result[labelName].push(newLabel);

            return newLabel;
        };

        var handlePart = function(labelName, partContent, partIndex)
        {
            var handledPart = false;
            var startRegex = highlightScheme.labelSearchRegexes.start[labelName];
            var stopRegex = highlightScheme.labelSearchRegexes.end[labelName];

            var handleRegex = function(content, regex, markerType, mirrorLabels)
            {
                var lastIndex = -1, regexResult, currentIndex, currentEndIndex, mirrorLabel = undefined, shouldContinue,
                        currentChar;
                let result = {};

                //console.warn(mirrorLabels);
                regex.lastIndex = 0;

                do
                {
                    regexResult = regex.exec(content);

                    if (regexResult != null)
                    {
                        currentIndex = regexResult.index;
                        currentEndIndex = regex.lastIndex;

                        if (currentIndex > 0 && content.charAt(currentIndex - 1) === "\\")
                        {
                            shouldContinue = false;
                            
                            let walkbackIndex = 1, count = 0;
                            
                            do
                            {
                                currentChar = content.charAt(currentIndex - walkbackIndex);
                                
                                count++;
                                
                                walkbackIndex++;
                            }
                            while (currentChar === "\\" && currentIndex - walkbackIndex >= 0);
                            
                            if (count % 2 === 0) // === because count++ also happens for first non backslash character.
                            {
                                continue;
                            }
                        }

                        if (mirrorLabels && currentIndex in mirrorLabels && mirrorLabels[currentIndex].end === currentEndIndex
                            && mirrorLabels[currentIndex].content == regexResult[0])
                        {
                            mirrorLabel = mirrorLabels[currentIndex].label;
                        }

                        result[currentIndex] = { end: currentEndIndex, label: noteLabel(labelName, currentIndex, currentEndIndex, markerType, mirrorLabel),
                                                 content: regexResult[0] };
                    }
                    else
                    {
                        break;
                    }
                }
                while (lastIndex < currentIndex);

                return result;
            };

            var startLabels = [];

            if (startRegex && startRegex.exec)
            {
                startLabels = handleRegex(partContent, startRegex, SyntaxHelper.LABEL_START);

                handledPart = true;
            }

            if (stopRegex && stopRegex.exec)
            {
                handleRegex(partContent, stopRegex, SyntaxHelper.LABEL_END, startLabels);

                handledPart = true;
            }

            // If another method was not used,
            //check whether the part is equivalent to
            //the label's name.
            if (!handledPart)
            {
                if (partContent === labelName)
                {
                    noteLabel(labelName, partIndex - labelName.length, partIndex, SyntaxHelper.LABEL_SINGLE);
                }
            }
        };

        var handleLabel = function(labelName)
        {
            // Check for a splitting method...
            if (highlightScheme.labelSearchSeparators[labelName] !== SyntaxHelper.SEARCH_ALL)
            {
                // Use the standard separator if none were specified.
                var splitMethod = highlightScheme.labelSearchSeparators[labelName] !== undefined ? highlightScheme.labelSearchSeparators[labelName] : SyntaxHelper.STANDARD_SEPARATORS;
                var splitChars = {};
                var index;

                var splitAll = (splitMethod === SyntaxHelper.SINGLE_CHAR_SEPARATOR || splitMethod.length === 0);
                var indexShift = 0;

                if (splitAll)
                {
                    indexShift = 1;
                }

                var buffer = "", currentChar;

                for (index = 0; index < splitMethod.length; index++)
                {
                    currentChar = splitMethod.charAt(index);

                    // Note the current character's usability as a split character.
                    splitChars[currentChar] = true;
                }

                // Handle each part of the text.
                for (index = 0; index <= text.length; index++)
                {
                    // If a character is to be accessed,
                    if (index < text.length)
                    {
                        currentChar = text.charAt(index);
                    }

                    // If ending, or the current character is to be used to split segments,
                    if (index === text.length || (splitAll && currentChar !== "\\") || currentChar in splitChars)
                    {
                        if (splitAll && index !== text.length)
                        {
                            buffer += currentChar;
                        }

                        //console.log("Handling part: " + buffer + " at index " + index + ". Label: " + labelName + ".");
                        handlePart(labelName, buffer, index + indexShift, highlightScheme);

                        buffer = "";
                    }
                    else // Otherwise, add to the buffer.
                    {
                        buffer += currentChar;
                    }
                }
            }
            else
            {
                handlePart(labelName, text, 0, highlightScheme);
            }
        };

        /* For all findable labels... */
        for (var labelName in highlightScheme.labelMap)
        {
            handleLabel(labelName);
        }

        return result;
    };

    this.labelCanMultiLine = function(labelName, highlightScheme)
    {
        highlightScheme = highlightScheme || me.highlightScheme;

        if (highlightScheme.multiLineLabels && labelName in highlightScheme.multiLineLabels)
        {
            return highlightScheme.multiLineLabels[labelName];
        }

        return false;
    };

    var getDepthSortedLabels = function(appliedLabels)
    {
        var allLabels = [];
        var i;

        for (var label in appliedLabels)
        {
            for (i = 0; i < appliedLabels[label].length; i++)
            {
                allLabels.push(appliedLabels[label][i]);
            }
        }

        allLabels.sort((a, b) => (a.depth - b.depth));

        return allLabels;
    };

    this.getHighlightScheme = function(appliedLabels, missingDependencyCheck, sortedLabels)
    {
        var allLabels = sortedLabels || getDepthSortedLabels(appliedLabels);

        var highlightSignificantLabels = [];
        var lastHighlighter = me.highlightScheme;

        for (var i = 0; i < allLabels.length; i++)
        {
            if (lastHighlighter.highlightSchemeSpecificLabels[allLabels[i].tagName] && !missingDependencyCheck(allLabels[i]))
            {
                lastHighlighter = lastHighlighter.highlightSchemeSpecificLabels[ allLabels[i].tagName ];

                //console.log("SWITCHED HIGHLIGHTER AT REQUEST OF " + allLabels[i].tagName);
            }
        }

        return lastHighlighter;
    };

    this.getMissingDependencyCheck = function(appliedLabels)
    {
        var allLabelIds = {};
        var i = 0;

        for (var labelName in appliedLabels)
        {
            for (i = 0; i < appliedLabels[labelName].length; i++)
            {
                allLabelIds[appliedLabels[labelName][i].getId()] = true;//appliedLabels[labelName][i];
            }
        }

        //console.log(allLabelIds);

        // Whether MISSING a dependency.
        var depCheck =
        (labelObject) =>
        {
            //console.log(labelObject.dependsOn);

            for (var key in labelObject.dependsOn)
            {
                if (!allLabelIds[key])
                {
                    return true;
                }
            }

            return false;
        };

        return depCheck;
    };

    this.labelSwapsHighlighter = function(label, highlighter)
    {
        return highlighter.highlightSchemeSpecificLabels[label] !== undefined;
    };
}

let __LABEL_ID__ = 0;
function SyntaxLabel(tagName, startIndex, endIndex, labelType, linkTo)
{
    const me = this;

    this.tagName = tagName;

    this.startIndex = startIndex || 0;
    this.endIndex = endIndex !== undefined ? endIndex : SyntaxHelper.END_OF_LINE;
    this.labelType = labelType;
    this.linkedTo = linkTo;
    this.labelId = (__LABEL_ID__++);
    this.dependsOn = {};
    this.depth = 0;

    var disabled = false;

    this.equivalentTo = function(other)
    {
        return me.startIndex === other.startIndex && me.endIndex === other.endIndex && me.labelType === other.labelType && me.tagName === other.tagName;
    };

    this.clearDependencies = function()
    {
        me.dependsOn = {};
        me.depth = 0;
    };

    this.getDependsOn = function(other)
    {
        return me.dependsOn[other.labelId] != undefined;
    };

    this.addDependency = function(newDependency)
    {
        this.dependsOn[newDependency.labelId] = true;
        me.depth ++;
    };

    this.getId = function()
    {
        return me.labelId;
    };

    this.disable = function()
    {
        disabled = true;
    };

    this.getDisabled = function()
    {
        return disabled;
    };
};

function SyntaxTracker(currentLine, previousLine, nextLine, syntaxSelector)
{
    const me = this;

    me.currentLine = currentLine;
    me.nextLine = nextLine || null;
    me.previousLine = previousLine || null;
    me.syntaxSelector = syntaxSelector;

    me.labels = {};
    me.continuedLabels = {};

    var linkLabels = function(forbiddenStartIndicies, labelSubset, highlightScheme)
    {
        var labelIndex, currentLabel, startingLabels = [], endingLabels = [], unendedLabels = [];
        var labels = labelSubset || me.labels;


        // Check whether new continued labels are to be created...
        for (var labelName in labels)
        {
            for (labelIndex = 0; labelIndex < labels[labelName].length; labelIndex++)
            {
                currentLabel = labels[labelName][labelIndex];

                // If a starting label...
                if (currentLabel.labelType === SyntaxHelper.LABEL_START
                        && !(currentLabel.startIndex in forbiddenStartIndicies))
                {
                    startingLabels.push(currentLabel);
                }
                else if (currentLabel.labelType === SyntaxHelper.LABEL_END)
                {
                    endingLabels.push(currentLabel);

                    //console.log(currentLabel.tagName);
                }
            }
        }

        var testIndex, matchedWith;

        // Search for ending labels for every starting label.
        //Unfortunately, this is quadratic... TODO Fix this.
        for (labelIndex = 0; labelIndex < startingLabels.length; labelIndex++)
        {
            currentLabel = startingLabels[labelIndex];

            if (currentLabel.getDisabled())
            {
                continue;
            }

            matchedWith = undefined;

            for (testIndex = 0; testIndex < endingLabels.length; testIndex++)
            {
                if (endingLabels[testIndex].tagName === currentLabel.tagName && (endingLabels[testIndex].startIndex >= currentLabel.endIndex && currentLabel.endIndex !== SyntaxHelper.END_OF_LINE)
                    && (!matchedWith || matchedWith.endIndex > endingLabels[testIndex].endIndex || matchedWith.endIndex === SyntaxHelper.END_OF_LINE))
                {
                    matchedWith = endingLabels[testIndex];
                }
            }

            if (matchedWith)
            {
                me.labels[currentLabel.tagName].push(new SyntaxLabel(currentLabel.tagName, currentLabel.endIndex, matchedWith.endIndex, SyntaxHelper.LABEL_SINGLE));

                if (matchedWith.linkedTo)
                {
                    matchedWith.linkedTo.disable();
                }

                // If the label can be multi-line, and the next line has that label,
                if (me.nextLine && me.syntaxSelector.labelCanMultiLine(currentLabel.tagName, highlightScheme) && me.nextLine.syntaxTracker.hasLabelToEndOfLine(currentLabel.tagName))
                {
                    // Update the next line.
                    me.nextLine.requestRefresh();
                }
            }
            else
            {
                // Apply the label to the next line.
                if (me.nextLine && me.syntaxSelector.labelCanMultiLine(currentLabel.tagName, highlightScheme))
                {
                    me.nextLine.requestRefresh();//syntaxTracker.applyContinuingLabel(currentLabel.tagName);
                }

                // Make the label span to the end of the line.
                currentLabel.endIndex = SyntaxHelper.END_OF_LINE;
            }
        }
    };

    // DANGER!! Only to be used after clearing
    //me.labels, as this function adds its
    //continuedLabels to the current ones.
    var refreshContinuedLabels = function(noLink, preventAppendContinued)
    {
        var forbiddenStartIndicies = {}, hasContinuingStart;

        for (var label in me.continuedLabels)
        {
            hasContinuingStart = false;

            if (me.labels[label])
            {
                for (var i = 0; i < me.labels[label].length; i++)
                {
                    if (me.labels[label][i].labelType === SyntaxHelper.LABEL_START)
                    {
                        hasContinuingStart = true;

                        break;
                    }
                }
            }

            let endLabels = me.getEndLabels(label, 1);

            // If the previous line doesn't have
            //the label, don't apply it.
            if (me.previousLine && (!me.previousLine.syntaxTracker.hasLabel(label) || !me.previousLine.syntaxTracker.hasLabelToEndOfLine(label)))
            {
                delete me.continuedLabels[label];

                if (me.labels[label])
                {
                    delete me.labels[label];
                }

                if (me.nextLine && me.nextLine.syntaxTracker.hasLabel(label))
                {
                    me.nextLine.requestRefresh();
                }

                continue;
            }
            else if (me.continuedLabels[label].endIndex !== SyntaxHelper.END_OF_LINE && endLabels.length === 0)
            {
                me.continuedLabels[label].endIndex = SyntaxHelper.END_OF_LINE;

                if (me.nextLine && !me.nextLine.syntaxTracker.hasLabel(label))
                {
                    me.nextLine.requestRefresh();
                }
            }
            else if (endLabels.length > 0 && me.continuedLabels[label].endIndex !== endLabels[0].startIndex)
            {
                me.continuedLabels[label].endIndex = endLabels[0].startIndex;

                if (me.nextLine && me.nextLine.syntaxTracker.hasLabel(label))
                {
                    me.nextLine.requestRefresh();
                }
            }

            if (me.continuedLabels[label].endIndex !== SyntaxHelper.END_OF_LINE && me.nextLine && me.nextLine.syntaxTracker.hasLabelToEndOfLine(label))
            {
                me.nextLine.requestRefresh();
            }

            if (me.continuedLabels[label].endIndex === SyntaxHelper.END_OF_LINE && me.nextLine && !me.nextLine.syntaxTracker.hasLabel(label))
            {
                me.nextLine.requestRefresh();
            }

            if (!me.labels[label])
            {
                me.labels[label] = [];
            }

            if (!preventAppendContinued)
            {
                me.labels[label].push(me.continuedLabels[label]);
            }

            if (me.continuedLabels[label].endIndex != SyntaxHelper.END_OF_LINE)
            {
                forbiddenStartIndicies[me.continuedLabels[label].endIndex] = true;

                forbiddenStartIndicies[me.continuedLabels[label].startIndex] = true;
            }
        }

        if (!noLink)
        {
            linkLabels(forbiddenStartIndicies);
        }

        return forbiddenStartIndicies;
    };

    var lastRefreshTime = 0,//(new Date()).getTime(),
        awaitingTimeout = false,
        minRefreshDeltaT = 500;

    this.refreshHighliting = function(ignoreForDeltaT)
    {
        var nowTime = (new Date()).getTime();
        var dt = nowTime - lastRefreshTime;

        var doneRefreshing = false;

        var oncomplete = () => { doneRefreshing = true; };

        if (dt > minRefreshDeltaT || ignoreForDeltaT)
        {
            me.labels = me.syntaxSelector.getLabelIndicies(me.currentLine.text);

            // Check the previous line for multi-line labels to be extended.
            if (me.previousLine)
            {
                me.previousLine.syntaxTracker.applyAnyToBeContinuedLabels(me);
            }

            refreshContinuedLabels();

            //linkLabels();
            me.updateLabelDeps();

            me.checkAndHandleOtherHighlightSchemes(0, me.currentLine.text.length); // Check whether the current highlighter requests a change in highlighting. Discover new labels if it does.

            lastRefreshTime = nowTime;

            awaitingTimeout = false;

            oncomplete();
        }
        else if (!awaitingTimeout)
        {

            setTimeout(() => 
            {
                me.refreshHighliting();

                oncomplete();
            }, minRefreshDeltaT - dt);

            awaitingTimeout = true;
        }

        return new Promise((resolve, reject) =>
        {
            if (!doneRefreshing)
            {
                oncomplete = () => resolve();
            }
            else
            {
                resolve();
            }
        });
    };

    this.getTextInLabel = function(labelName, labelIndex)
    {
        var label = me.labels[labelName][labelIndex];
        var endIndex = label.endIndex;
        var startIndex = label.startIndex;

        //console.log("   End (prior to check in getText): " + endIndex);

        if (endIndex == SyntaxHelper.END_OF_LINE)
        {
            endIndex = me.currentLine.text.length;
        }

        //console.log("  Getting text from label, " + labelName + ", at index " + labelIndex + ". The text starts at " + startIndex + " and ends at " + endIndex + ".");

        return me.currentLine.text.substring(startIndex, endIndex);
    };

    var noteNewLabels = function(labelsMap)
    {
        let i = 0;

        for (var labelName in labelsMap)
        {
            if (!me.hasLabel(labelName))
            {
                me.labels[labelName] = [];
            }

            for (i = 0; i < labelsMap[labelName].length; i++)
            {
                me.labels[labelName].push(labelsMap[labelName][i]);
            }
        }
    };

    this.checkAndHandleOtherHighlightSchemes = function(startIndex, stopIndex, currentHighlighter, recursionDepth)
    {
        let i = 0, newHighlighter, additionalLabels,
            currentStart, currentEnd,
            currentLabel,
            getEndIndex = (labelObj) =>
            {
                return labelObj.endIndex !== SyntaxHelper.END_OF_LINE ? labelObj.endIndex : me.currentLine.text.length;
            };

        // If recursing more than 15 times, an error probably has occurred! Log and return.
        if (recursionDepth > 15)
        {
            console.error("recursionDepth > 15 (checkAndHandleOtherHighlightSchemes).");

            return false;
        }

        let handleLabel = (labelText, startIndex, endIndex) =>
        {
            newHighlighter = currentHighlighter.highlightSchemeSpecificLabels[labelName];

            additionalLabels = me.syntaxSelector.getLabelIndicies(labelText,
                        startIndex, newHighlighter
                        );



            noteNewLabels(additionalLabels);

            if (me.previousLine)
            {
                me.previousLine.syntaxTracker.applyAnyToBeContinuedLabels(me, true, newHighlighter);
            }


            let forbiddenStartIndicies = refreshContinuedLabels(true, true);
            linkLabels(forbiddenStartIndicies, additionalLabels, newHighlighter);
            me.updateLabelDeps();

            me.checkAndHandleOtherHighlightSchemes(currentStart,
                    currentEnd, newHighlighter, recursionDepth + 1);
        };

        currentHighlighter = currentHighlighter || me.syntaxSelector.highlightScheme;

        for (var labelName in currentHighlighter.highlightSchemeSpecificLabels)
        {
            if (me.hasLabel(labelName))
            {
                //console.log("Got the label " + labelName + "! START_CHECK: " + startIndex + "; STOP_CHECK: " + stopIndex + ", list: " + me.labels[labelName].join(", "));

                if (me.labels[labelName].length === 0)
                {
                    handleLabel(me.currentLine.text, 0, me.currentLine.text.length);
                }

                for (i = 0; i < me.labels[labelName].length; i++)
                {
                    currentLabel = me.labels[labelName][i];
                    currentStart = currentLabel.startIndex;

                    if (currentStart >= startIndex && currentStart <= stopIndex)
                    {
                        handleLabel(me.getTextInLabel(labelName, i), currentStart, getEndIndex(currentLabel));
                    }
                }
            }
        }
    };

    this.getEndLabels = function(label, maxNumber)
    {
        if (!(label in me.labels))
        {
            return [];
        }

        maxNumber = maxNumber || me.labels[label].length;

        var result = [];

        for (var i = 0; i < me.labels[label].length; i++)
        {
            if (me.labels[label][i].labelType === SyntaxHelper.LABEL_END)
            {
                result.push(me.labels[label][i]);

                if (result.length >= maxNumber)
                {
                    break;
                }
            }
        }

        return result;
    }

    this.getColorAtIndex = function(characterIndex)
    {
        var result = me.syntaxSelector.getBaseColor();

        var applicableLabels = {};

        var handleLabel = function(label)
        {
            if (label.startIndex <= characterIndex
                && (label.endIndex > characterIndex
                    || label.endIndex === SyntaxHelper.END_OF_LINE))
            {
                if (!applicableLabels[label.tagName])
                {
                    applicableLabels[label.tagName] = [];
                }

                applicableLabels[label.tagName].push(label);

                d += ", " + label.tagName;
            }
        };

        var d = "";
        var i;
        for (var labelName in me.labels)
        {
            for (i = 0; i < me.labels[labelName].length; i++)
            {
                handleLabel(me.labels[labelName][i]);
            }
        }

        //console.log(d);
        //console.log(me.labels);

        return me.syntaxSelector.getColor(applicableLabels);
    };

    this.applyContinuingLabel = function(label)
    {
        var endIndex = SyntaxHelper.END_OF_LINE;

        /* If the label does not exist... */
        if (!me.labels[label])
        {
            me.labels[label] = [];
        }
        else
        {
            var endLabel;

            for (var i = 0; i < me.labels[label].length; i++)
            {
                if (me.labels[label][i].labelType === SyntaxHelper.LABEL_END && (me.labels[label][i].startIndex < endIndex || endIndex === -1))
                {
                    endIndex = me.labels[label][i].startIndex;

                    endLabel = me.labels[label][i];
                    break;
                }
            }

            if (endLabel && endLabel.linkedTo)
            {
                endLabel.linkedTo.disable();
            }
        }

        let newLabel = new SyntaxLabel(label, 0, endIndex, SyntaxHelper.LABEL_CONTINUED);

        // DO NOT apply the label if it already exists.
        if (!me.continuedLabels[label] || !newLabel.equivalentTo(me.continuedLabels[label]))
        {
            me.labels[label].push(newLabel);
            me.continuedLabels[label] = newLabel;

            /* Wait, then apply the label to the following line. */
            if (me.nextLine && me.nextLine.syntaxTracker && endIndex == SyntaxHelper.END_OF_LINE)
            {
                me.nextLine.requestRefresh();
            }
        }
    };

    this.hasLabel = function(label)
    {
        return (label in me.labels);
    };

    this.hasLabelToEndOfLine = function(label)
    {
        if (!me.hasLabel(label))
        {
            return false;
        }

        for (var i = 0; i < me.labels[label].length; i++)
        {
            if (me.labels[label][i].endIndex === SyntaxHelper.END_OF_LINE && me.labels[label][i].labelType !== SyntaxHelper.LABEL_END)
            {
                return true;
            }
        }

        return false;
    };

    this.applyAnyToBeContinuedLabels = function(toLine, excludeContinuedLabels, highlighter)
    {
        var appliedLabels = {};

        if (!excludeContinuedLabels)
        {
            for (var label in me.continuedLabels)
            {
                if (label.endIndex === SyntaxHelper.END_OF_LINE && !appliedLabels[label] && me.hasLabelToEndOfLine(label) && !toLine.hasLabelToEndOfLine(label))
                {
                    toLine.applyContinuingLabel(label);
                    appliedLabels[label] = true;
                }
            }
        }

        for (var label in me.labels)
        {
            if (me.syntaxSelector.labelCanMultiLine(label, highlighter) && me.hasLabelToEndOfLine(label) && !appliedLabels[label] && !toLine.hasLabelToEndOfLine(label))
            {
                toLine.applyContinuingLabel(label);
                appliedLabels[label] = true;
            }
        }
    };

    /*
    Determine and set the precedence of all labels
    applied to this line. ACQUIRE THIS LIST BEFORE
    CALLING THIS.
    */
    this.updateLabelDeps = function()
    {
        let allLabels = [];
        let i = 0, j = 0;

        // TODO: Consider caching a copy of allLabels to
        //prevent its regeneration.
        for (var key in me.labels)
        {
            for (i = 0; i < me.labels[key].length; i++)
            {
                allLabels.push(me.labels[key][i]);

                me.labels[key][i].clearDependencies();
                me.labels[key][i].updateLabelDeps__tempEndIndex = undefined;
            }
        }

        // Sort the labels by starting-index.
        allLabels.sort((a, b) =>
        {
            return a.startIndex - b.startIndex;
        });

        let getLength = (label) =>
        {
            let endIndex = label.endIndex;

            if (label.endIndex === SyntaxHelper.END_OF_LINE)
            {
                endIndex = me.currentLine.text.length;
            }

            if (label.updateLabelDeps__tempEndIndex !== undefined)
            {
                endIndex = label.updateLabelDeps__tempEndIndex;
            }

            return endIndex - label.startIndex;
        };

        if (allLabels.length > 0)
        {
            let currentLength = 0;
            let currentEndIndex = 0;

            for (i = 0; i < allLabels.length; i++)
            {
                currentLength = getLength(allLabels[i]);
                currentEndIndex = allLabels[i].startIndex + currentLength;

                if (currentLength <= 1 || allLabels[i].labelType === SyntaxHelper.LABEL_START || allLabels[i].labelType === SyntaxHelper.LABEL_END)
                {
                    continue;
                }

                for (j = i + 1; j < allLabels.length && allLabels[j].startIndex < currentEndIndex; j++)
                {
                    allLabels[j].addDependency(allLabels[i]);

                    if (allLabels[j].startIndex + getLength(allLabels[j]) > currentEndIndex)
                    {
                        allLabels[j].endIndex = currentEndIndex;
                    }
                }
            }

            return true;
        }

        return false;
    };
}

// Inserted file Line.js encoding='utf-8'
"use strict";

var __lineIdCounter = 0;
function Line(ctx, parentEditor, x, y, h, myIndex)
{
    this.ctx = ctx;
    this.text = "";
    this.cursorPosition = 0;
    this.maxCursorPosition = 0;
    this.h = h;
    this.x = x;
    this.y = y;
    this.noXFocusCheck = true;
    this.parentEditor = parentEditor;
    this.hasFocus = false;
    this.hadFocus = false;
    this.syntaxTracker = new SyntaxTracker(this, null, null, parentEditor.syntaxSelector);
    
    this.lastModifiedTime = (new Date()).getTime();
    this.creationTime = (new Date()).getTime();
    this.id = "id_" + (__lineIdCounter++);

    this.lastRefreshText = "";
    this.refreshRequested = true;

    this.editable = true;
    this.onentercommand = null;
    this.setColorFunction = null;

    this.selRange = [];

    this.selColor = "#441164";
    this.color = "white";

    this.flaggedForRemoval = false;

    let me = this; // NON-CONST: ME IS SET WHEN CODE MUST 
                   // CHANGE CONTEXT.

    this.requestRender = function()
    {
        me.parentEditor.render();
    };

    this.requestRefresh = function()
    {
        me.refreshRequested = true;
    };

    this.render = function(index, trueIndex)
    {
        me.y = index * me.h + me.parentEditor.y;

        if (me.y + me.h < 0 || me.x + me.getWidth() < 0 || me.y > me.ctx.canvas.height)
        {
            return;
        }

        const codeEditing = me.parentEditor.isCodeEditing();

        me.refreshHighlitingIfNeeded(trueIndex);

        const getCharColor = function(index)
        {
            // If the user has requested that
            //this line be a specific color
            //(e.g an error message in a console)
            //show this color instead of any other.
            if (me.setColorFunction)
            {
                let colorSetResult = me.setColorFunction(index);
                
                // Did the function actually return a color?
                if (typeof colorSetResult == "string")
                {
                    return colorSetResult;
                }
            }
        
            if (!codeEditing)
            {
                return me.color;
            }

            /*
             Get the context of the current part of
             the line. Stop search with space characters,
             etc.
            */

            //console.log("CHAR: " + currentCharacter);

            const color = me.syntaxTracker.getColorAtIndex(index);

            return color;
        };
        
        const canvasWidth = me.ctx.canvas.width;

        var currentChar, x = me.x, y = me.y,
            hasSelection = me.hasSelection(),
            currentCharW;

        for (var i = 0; i <= me.text.length; i++)
        {
            me.ctx.save();

            if (i < me.text.length)
            {
                currentChar = me.text.charAt(i);

                currentCharW = me.ctx.measureText(currentChar).width;

                if (hasSelection && i >= me.selRange[0] && i < me.selRange[1])
                {
                    me.ctx.fillStyle = me.selColor;

                    me.ctx.fillRect(x, y, currentCharW, me.h);
                }
            }

            if (i === me.cursorPosition && me.hasFocus)
            {
                me.ctx.fillStyle = me.color;
                me.ctx.fillRect(x, y, 1, me.h * 0.99);
            }


            if (i < me.text.length)
            {
                me.ctx.fillStyle = getCharColor(i);

                me.ctx.fillText(currentChar, x, y);

                x += currentCharW;
            }

            me.ctx.restore();
            
            if (x > canvasWidth)
            {
                return;
            }
        }

        /* Show the entire selection! */
        if (hasSelection && (me.text.length === 0 || (me.selRange[1] === me.text.length)))
        {
            me.ctx.save();

            me.ctx.beginPath();
            me.ctx.fillStyle = me.selColor;
            me.ctx.fillRect(x, y, me.ctx.canvas.width, me.h);

            me.ctx.restore();
        }
    };

    this.getWidth = function()
    {
        return me.ctx.measureText(me.text).width;
    };

    this.checkCollision = function(index, point)
    {
        me.y = index * me.h + me.parentEditor.y;

        return (point.x > me.x && point.x < me.x + me.getWidth() || me.noXFocusCheck) && point.y > me.y && point.y < me.y + me.h;
    };

    this.handleClick = function(index, point, screenIndex)
    {
        if (me.checkCollision(screenIndex, point))
        {
            var x = me.x, newX, i;
            var currentChar;

            me.hasFocus = true;

            me.cursorPosition = me.text.length;

            for (i = 0; i < me.text.length; i++)
            {
                currentChar = me.text.charAt(i);

                newX = x + me.ctx.measureText(currentChar).width;

                if (x <= point.x && newX >= point.x)
                {
                    me.cursorPosition = i;
                }

                x = newX;
            }

            if (point.x < me.x)
            {
                me.cursorPosition = 0;
            }

            me.parentEditor.shiftViewIfNecessary(index, screenIndex);
        }
        else
        {
            me.hasFocus = false;
        }

        me.deselect();
    };

    this.prepareToHandleKey = function()
    {
        me.hadFocus = me.hasFocus;
    };

    this.afterHandleKey = function(myIndex)
    {
        if (me.hasFocus)
        {
            me.parentEditor.shiftViewIfNecessary(myIndex, me.text.length);
        } // Did the user transition focus away from us?
        else if (me.hadFocus)
        {
            // Refresh highlighting -- don't force it, but do ignore
            //timeouts.
            me.refreshHighlitingIfNeeded(myIndex, false, true);
        }
    };

    this.transitionFocus = function(fromLine, otherWayLine)
    {
        if (!fromLine)
        {
            return;
        }

        if (fromLine.hadFocus)
        {
            me.hasFocus = true;
            fromLine.hasFocus = false;

            me.cursorPosition = Math.max(fromLine.cursorPosition, fromLine.maxCursorPosition);

            me.maxCursorPosition = me.cursorPosition;

            me.cursorPosition = Math.min(me.text.length, me.cursorPosition);
            
            return () =>
            {
                me.hadFocus = true;
            
                return fromLine.transitionFocus(me);
            };
        }

        if (me.hadFocus && otherWayLine)
        {
            me.hasFocus = false;
            
            return () =>
                me.transitionFocus(otherWayLine);
        }
    };

    this.lrTransitionFocus = function(toLine, direction)
    {
        if (me.hadFocus)
        {
            if (me.cursorPosition + direction >= 0 && me.cursorPosition + direction <= me.text.length)
            {
                me.cursorPosition += direction;
                
                // Returns an undo function.
                return () => 
                {
                    return me.lrTransitionFocus(toLine, -direction);
                };
            }
            else if (toLine)
            {
                me.hasFocus = false;

                toLine.hasFocus = true;

                if (direction < 0)
                {
                    toLine.cursorPosition = toLine.text.length;
                }
                else
                {
                    toLine.cursorPosition = 0;
                }
                
                // Return an undo function.
                return () =>
                {
                    return toLine.lrTransitionFocus(me, -direction);
                };
            }
        }
    };

    this.handleKey = function(key, lineAbove, lineBelow, myIndex, ignoreSpecial)
    {
        if (!me.hasFocus && !me.hadFocus && !me.hasSelection() && lineAbove
            && lineBelow && !lineAbove.hadFocus && !lineBelow.hadFocus)
        {
            return;
        }

        var added = false, undoResult = null;
        
        let topLevelArguments = arguments;
        
        let generalRedo = () =>
        {
            return me.handleKey.apply(me, topLevelArguments);
        };

        if (!ignoreSpecial)
        {
            if (key === "🔽" || key === "ArrowDown")
            {
                undoResult = me.transitionFocus(lineAbove, lineBelow);
                
                me.refreshHighlitingIfNeeded(myIndex, false, true);

                added = true;
            }
            else if (key === "🔼" || key === "ArrowUp")
            {
                undoResult = me.transitionFocus(lineBelow, lineAbove);
                
                me.refreshHighlitingIfNeeded(myIndex, false, true);

                added = true;
            }
            else if (key === "◀️" || key === "ArrowLeft")
            {
                undoResult = me.lrTransitionFocus(lineAbove, -1);

                added = true;

                me.maxCursorPosition = 0;
            }
            else if (key === "▶️" || key === "ArrowRight")
            {
                undoResult = me.lrTransitionFocus(lineBelow, 1);

                added = true;

                me.maxCursorPosition = 0;
            }
        }

        var hasSelection = me.hasSelection();

        if (hasSelection && !added && me.parentEditor.editable && me.editable)
        {
            let oldText = me.text + "";
            
            let oldHasFocus = me.hasFocus;
            
            const selStart = me.selRange[0],
                  selEnd = me.selRange[1],
                  cursorPosition = me.cursorPosition;
            
            let removeAction = () =>
            {
                me.text = me.text.substring(0, selStart) + me.text.substring(selEnd);

                me.cursorPosition = selStart;

                me.deselect();
                
                return undoResult;
            };
            
            undoResult = (lineHelper) =>
            {
                me.text = oldText;
                
                me.cursorPosition = cursorPosition;
                me.selRange = [selStart, selEnd];
                
                me.hasFocus = oldHasFocus;
                
                console.log("Undid! Text: " + oldText);
                
                return removeAction;
            };
            
            removeAction();
        }

        if (me.hadFocus && !added && me.parentEditor.editable && me.editable)
        {
            if ((key === "⏪" || key === "Backspace") && !ignoreSpecial)
            {
                if (me.cursorPosition === 0)
                {
                    if (lineAbove)
                    {
                        me.flaggedForRemoval = true;

                        me.lrTransitionFocus(lineAbove, -1);

                        lineAbove.text += me.text;
                        let myText = me.text;
                        
                        let priorTextAbove = lineAbove.text;
                        
                        undoResult = (lineHelper) =>
                        {
                            // Insert this line.
                            if (me.flaggedForRemoval)
                            {
                                me.flaggedForRemoval = false;
                                lineHelper.insertLineObject(myIndex, me);
                            }
                            
                            me.cursorPosition = 0;
                            me.focus();
                            
                            return generalRedo;
                        };
                    }
                }
                else if (!hasSelection)
                {
                    me.cursorPosition--;
                    
                    let oldText = me.text;

                    me.text = me.text.substring(0, me.cursorPosition) + me.text.substring(me.cursorPosition + 1);
                    
                    undoResult = () =>
                    {
                        me.cursorPosition++;
                        
                        me.text = oldText;
                        
                        return generalRedo;
                    };
                }
            }
            else if (((key === "⏬" || key === "Enter") && !ignoreSpecial) || key === "\n")
            {
                if (!me.onentercommand)
                {
                    var movedText = me.text.substring(me.cursorPosition);
                    me.text = me.text.substring(0, me.cursorPosition);

                    var originalMovedText = movedText;

                    if (me.parentEditor.isCodeEditing() && key !== "\n")
                    {
                        movedText = me.getStartingSpace() + movedText;
                    }


                    var newLine = me.parentEditor.addLine(myIndex + 1, movedText);

                    me.lrTransitionFocus(newLine, 1);

                    newLine.cursorPosition = newLine.text.length - originalMovedText.length;
                    newLine.refreshHighlitingIfNeeded(myIndex + 1);
                    
                    me.requestRefresh();
                    
                    undoResult = () =>
                    {
                        me.text = me.text + movedText;
                        me.cursorPosition = me.text.length - movedText.length;
                        me.focus();
                        
                        // Remove the new line.
                        newLine.flaggedForRemoval = true;
                    
                        me.requestRefresh();
                        
                        return generalRedo;
                    };
                }
            }
            else
            {
                var toInsert = key;

                // Space key.
                if (key === "_SPACE_" && !ignoreSpecial)
                {
                    toInsert = " ";
                }
                else if (key === "Tab" && !ignoreSpecial)
                {
                    toInsert = "    ";
                }

                let priorText = me.text;
                
                me.text = me.text.substring(0, me.cursorPosition) + toInsert + me.text.substring(me.cursorPosition);

                me.cursorPosition += toInsert.length;
                me.maxCursorPosition = 0;

                // Was an undo function created for some other action?
                let oldUndo = undoResult;
                
                undoResult = () =>
                {
                    me.text = priorText;
                    me.cursorPosition -= toInsert.length;

                    let redoOther = () => {};

                    // If so, call it as a part pf tjos imdp/
                    if (oldUndo)
                    {
                        redoOther = oldUndo();
                    }
                    
                    return () =>
                    {
                        redoOther();
                        generalRedo();
                    };
                };
            }
        }

        if (hasSelection && !added && me.text.length === 0)
        {
            me.flaggedForRemoval = true;
            
            let oldUndoResult = undoResult,
                oldRedoResult;
            let oldIndex = myIndex;
            
            undoResult = (lineHelper) =>
            {
                if (me.flaggedForRemoval)
                {
                    me.parentEditor.removeLinesFlaggedForRemoval();
                    
                    me.flaggedForRemoval = false;
                    lineHelper.insertLineObject(oldIndex, me);
                }
                
                if (oldUndoResult)
                {
                    console.log("IT DID EXIST!");
                    
                    oldRedoResult = oldUndoResult(lineHelper, me);
                }
            
                return () =>
                {
                    me.flaggedForRemoval = true;
                    me.requestRefresh();
                    
                    return undoResult;
                };
            };
        }

        if (me.hadFocus && me.onentercommand && (key === "⏬" || key === "\n" || key === "Enter"))
        {
            try
            {
                requestAnimationFrame(() => 
                {
                    me.onentercommand(me, myIndex)
                    me.parentEditor.render();
                });
            }
            catch(e)
            {
                noteError(e);
            }
        }

        me.updateModifiedTime();
        me.refreshHighlitingIfNeeded(myIndex);
        
        // Permits general undoing and redoing.
        return undoResult;
    };

    this.refreshHighlitingIfNeeded = function(myIndex, force, ignoreTimeout)
    {
        const codeEditing = me.parentEditor.isCodeEditing();

        me.syntaxTracker.nextLine = me.parentEditor.lines[myIndex + 1];
        me.syntaxTracker.previousLine = me.parentEditor.lines[myIndex - 1];

        // If code-editing, update the next and previous lines.
        if (codeEditing && (me.lastRefreshText != me.text || force || me.refreshRequested))
        {
            // Also update the highliting.
            me.syntaxTracker.refreshHighliting(ignoreTimeout).then(() =>
            {
                me.lastRefreshText = me.text + ""; // Cache the line's text.

                me.refreshRequested = false;
            });
        }
    };
    
    this.getText = function()
    {
        return me.text;
    };
    
    this.setText = function(newText)
    {
        var oldText = me.text + "";
        
        me.text = newText;
        
        if (oldText !== newText)
        {
            me.lastModifiedTime = (new Date()).getTime();
        }
    };
    
    var lastText = "";
    this.updateModifiedTime = function()
    {
        if (me.text !== lastText)
        {
            me.lastModifiedTime = (new Date()).getTime();
        }
    };
    
    this.setModifiedTime = function(lastTime)
    {
        me.lastModifiedTime = lastTime;
        
        lastText = me.text;
    };
    
    this.getLastTimeModified = function()
    {
        return me.lastModifiedTime;
    };

    this.select = function(selStart, selEnd)
    {
        me.selRange = [Math.max(0, selStart || 0), Math.min(selEnd !== undefined ? selEnd : me.text.length, me.text.length)];
    };

    this.deselect = function()
    {
        me.selRange = [];
    };

    this.hasSelection = function()
    {
        return me.selRange.length === 2;/* && me.selRange[0] !== me.selRange[1];*/
    };

    this.getSelectedText = function()
    {
        if (!me.hasSelection())
        {
            return "";
        }

        var selStart = me.selRange[0],
            selEnd   = me.selRange[1];

        return me.text.substring(selStart, selEnd);
    };

    this.getStartingSpace = function()
    {
        var result = "", currentChar;

        for (var i = 0; i < me.text.length; i++)
        {
            currentChar = me.text.charAt(i);

            if (currentChar !== " ")
            {
                return result;
            }

            result += currentChar;
        }

        return result;
    };

    this.indent = function(spacesCount)
    {
        var startingSpaces = "";

        for (var i = 0; i < spacesCount; i++)
        {
            startingSpaces += " ";
        }

        if (me.parentEditor.editable && me.editable)
        {
            me.text = startingSpaces + me.text;
        }
        
        me.updateModifiedTime();
    };

    this.deindent = function(maxSpaces)
    {
        var totalSpaces = me.getStartingSpace().length;

        maxSpaces = Math.min(totalSpaces, maxSpaces);

        if (me.parentEditor.editable && me.editable)
        {
            me.text = me.text.substring(maxSpaces);
        }
        
        me.updateModifiedTime();
    };

    this.focus = function()
    {
        me.parentEditor.unfocus();

        me.hasFocus = true;
        me.hadFocus = true;
    };

    this.unfocus = function()
    {
        me.hasFocus = false;
        me.hadFocus = false;
    };
}

// Inserted file Modeler2D.js encoding='utf-8'
"use strict";

// A simple object to allow the configuration of
//ModelerPoint2Ds.
function ConfigurationHandler(type)
{
    var me = this;
    
    this.get = function()
    {
        return me.type;
    };
    
    this.setType = function(newType)
    {
        me.type = newType;
    };
    
    this.GET = 0;
    this.SET = 1;
    this.GET_INPUT_TYPE = 2;
}

// A 2D point, which does not inherit from Point
//that is to be used to create two-dimensional models.
function ModelerPoint2D(x, y)
{
    var me = this; // Even when the context is changed
                   //through use of functions such as
                   //requestAnimationFrame, a refrence
                   //to the containing ModelerPoint2D
                   //is kept. Please note the warning
                   //about the "sloppyness [sic.]" of this
                   //script.
    
    this.x = x;
    this.y = y;
    this.r = 10;
    this.selected = false;
    this.toDestroy = false;
    this.translateListener = undefined; // A function of this, dx, and dy.
    this.color = "rgba(255, 255, 255, 0.7)";
    this.connectingLineStyle = "#000000";
    this.outlineStyle = "#000000";
    this.isControlPoint = false;
    
    this.getIsControlPoint = function()
    {
        return this.isControlPoint;
    };
    
    this.render = function(ctx, lastPoint, transformMatrix)
    {
        var position = this.getPosition(transformMatrix);
        
        var x = position[0];
        var y = position[1];
        var lineToPoint = null;
        
        // Line from previous to this.
        //Don't do this for control points, unless a different point was
        //set.
        if ((lastPoint && !this.getIsControlPoint()))
        {
            lineToPoint = lastPoint;
        }
        else
        {
            lineToPoint = this.lineToPoint;
        }
        
        if (lineToPoint)
        {
            ctx.beginPath();
            
            var lastPosition = lineToPoint.getPosition(transformMatrix);
            
            ctx.moveTo(x, y);
            ctx.lineTo(lastPosition[0], lastPosition[1]);
            
            ctx.strokeStyle = this.connectingLineStyle;
            
            ctx.stroke();
        }
        
        // Circle.
        
        ctx.strokeStyle = this.outlineStyle;
        
        ctx.beginPath();
        ctx.arc(x, y, this.r, 0, Math.PI * 2, true);
        
        ctx.stroke();
        
        // Selection-based coloring.
        
        if (!this.selected)
        {
            ctx.fillStyle = this.color;
        }
        else
        {
            ctx.fillStyle = "rgba(200, 200, 200, 0.85)";
        }
        
        ctx.fill();
    };
    
    this.select = function()
    {
        this.selected = true;
    };
    
    this.deselect = function()
    {
        this.selected = false;
    };
    
    this.getConfigureOptions = function()
    {
        var result = 
        {
            "X Position": function(command, xPosition)
            {
                var commandType = command.get();
                
                if (commandType === command.SET)
                {
                    var newX;
                    
                    try
                    {
                        newX = parseFloat(xPosition);
                    }
                    catch(e)
                    {
                        console.error("Error! " + e);
                        
                        return false;
                    }
                    
                    me.moveTo(newX, me.y);
                }
                else if (commandType === command.GET)
                {
                    return me.x;
                }
                else if (commandType === command.GET_INPUT_TYPE)
                {
                    return "number";
                }
            },
            
            "Y Position": function(command, yPosition)
            {
                var commandType = command.get();
                
                if (commandType === command.SET)
                {
                    var newY;
                    
                    try
                    {
                        newY = parseFloat(yPosition);
                    }
                    catch(e)
                    {
                        console.error("Error! " + e);
                        
                        return false;
                    }
                    
                    me.moveTo(me.x, newY);
                }
                else if (commandType === command.GET)
                {
                    return me.x;
                }
                else if (commandType === command.GET_INPUT_TYPE)
                {
                    return "number";
                }
            }
        };
        
        return result;
    };
    
    this.destroy = function()
    {
        this.selected = false;
        this.toDestroy = true;
    };
    
    this.translate = function(dx, dy)
    {
        this.x += dx;
        this.y += dy;
        
        if (this.translateListener)
        {
            this.translateListener(this, dx, dy);
        }
    };
    
    this.moveTo = function(x, y)
    {
        var dx = x - me.x;
        var dy = y - me.y;
        
        me.translate(dx, dy);
    };
    
    // Returns the screen position, not [me.x, me.y].
    //Returns an array of [screen x, screen y, element
    //used to help matrix math work].
    this.getPosition = function(transformMatrix)
    {
        var xyArray = [this.x, this.y, 1];
        MatHelper.transformPoint(xyArray, transformMatrix);
        
        return xyArray;
    };
    
    // Checks whether this object has collided with
    //a circle at (x1, y1) with radius = r1, but first
    //transforming this object such that its x and y are
    //in screen space ( {x1, y1} should be in screen-space ).
    //Transform is the transformation matrtix.
    this.checkCollision = function(x1, y1, r1, transform)
    {
        var position = this.getPosition(transform);
        var x2 = position[0];
        var y2 = position[1];
        
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) <= r1 + this.r;
    };
}

function BezierCurveControl(addPointFunction, points)
{
    var me = this;
    
    this.controlPoints = points || [];
    this.curvePoints = [];
    this.addPoint = addPointFunction || function(point) {}; // Allows the addition of new points to be noted by the controlling application.
    
    var shade = Math.floor((Math.random() * 206 + 50) / 2) * 2; // Choose a random point color, to make this curve's control points distinguishable from another's.
    var controlPointColor = "rgba(" + shade + ", " + shade / 2 + ", " + Math.floor(shade * Math.random() * 1.1) + ", 0.9)";
    
    this.resolution = 8;
    
    this.lockPoints3And5 = true;
    
    var movePointToLine = function(pointToMove, lineEnd, lineCenter)
    {
        var dx = lineCenter.x - lineEnd.x;
        var dy = lineCenter.y - lineEnd.y;
        
        pointToMove.x = lineCenter.x + dx;
        pointToMove.y = lineCenter.y + dy;
    };
    
    this.curveConfigureOptions = 
    {
        "Lock 3rd and 5th points: ": function(command, value)
        {
            var commandType = command.get();
            
            if (commandType === command.SET)
            {
                me.lockPoints3And5 = value;
            }
            else if (commandType === command.GET)
            {
                return me.lockPoints3And5;
            }
            else
            {
                return "checkbox";
            }
        },
        "Set Resolution: ": function(command, value)
        {
            var commandType = command.get();
            
            if (commandType === command.SET)
            {
                me.resolution = value;
                
                me.remakeCurve();
            }
            else if (commandType === command.GET)
            {
                return me.resolution;
            }
            else
            {
                return "number";
            }
        }
    };
    
    if (this.controlPoints.length < 7)
    {
        var addToEndPoint;
        
        var curveRadius = 100;
        var lastPoint = undefined;
        
        var makeControlPoint = function(i)
        {
            var newPoint = new ModelerPoint2D(0, 0);
            newPoint.color = controlPointColor;
            newPoint.connectingLineStyle = newPoint.color;
            newPoint.focusPriority = true;
            newPoint.isControlPoint = true;
            newPoint.lineToPoint = lastPoint;  // Set the point to connect to the previous control point.
            
            // Move the point to a reasonable location.
            newPoint.translate((Math.cos(i) * curveRadius + curveRadius/2) * Math.random(), (Math.sin(i) * curveRadius + curveRadius / 2) * Math.random());
            
            // Override the translation listener.
            newPoint.translateListener = function(point, dx, dy)
            {
                if (me.lockPoints3And5)
                {
                    // Lock the 3rd and 5th points.
                    if (i == 2 || i == 4) 
                    {
                        movePointToLine(me.controlPoints[i === 2 ? 4 : 2], me.controlPoints[i], me.controlPoints[3]);
                    } // Move the 3rd and 5th points with the 4th.
                    else if (i == 3)
                    {
                        me.controlPoints[2].translate(dx, dy);
                    }
                }
                
                // If the function to make the curve has been defined,
                if (me.remakeCurve)
                {
                    me.remakeCurve();
                }
            };
            
            newPoint.getConfigureOptions = function()
            {
                return me.curveConfigureOptions;
            };
            
            newPoint.setAddPointFunction = function(newAddPointFunction)
            {
                me.addPoint = newAddPointFunction;
            };
            
            lastPoint = newPoint;
            
            return newPoint;
        };
        
        // Add missing points...
        for (var i = this.controlPoints.length; i < 7; i++)
        {
            addToEndPoint = makeControlPoint(i);
            
            this.addPoint(addToEndPoint);
            this.controlPoints.push(addToEndPoint);
        }
        
        // Move the 3rd and 5th points to locations accross the center
        //from each other to create a smooth curve.
        movePointToLine(me.controlPoints[2], me.controlPoints[4], me.controlPoints[3]);
    }
    
    // Refrence: https://webgl2fundamentals.org/webgl/lessons/webgl-3d-geometry-lathe.html
    var getBezierCurvePoint = function(p1, p2, p3, p4, t)
    {
        var invT = 1 - t;
        var pointX = t*t*t * p1.x + 3 * t*t * invT * p2.x + 3 * t * invT * invT * p3.x + invT * invT * invT * p4.x;
        var pointY = t*t*t * p1.y + 3 * t*t * invT * p2.y + 3 * t * invT * invT * p3.y + invT * invT * invT * p4.y;
        
        return [pointX, pointY];
    };
    
    this.makeBezierCurve = function(p1, p2, p3, p4)
    {
        var newPoint, position, lastPoint = undefined;
        
        if (me.resolution === 0)
        {
            me.resolution = 99;
        }
        
        var dt = 1 / me.resolution;
        
        for (var t = 1; t >= 0; t -= dt)
        {
            position = getBezierCurvePoint(p1, p2, p3, p4, t);
        
            newPoint = new ModelerPoint2D(position[0], position[1]);
            me.curvePoints.push(newPoint);
            
            newPoint.translateListener = function(point, dx, dy)
            {
                // Remove the control points on translation of a sub-point.
                for (var i = 0; i < me.controlPoints.length; i++)
                {
                    me.controlPoints[i].destroy();
                }
            };
            
            this.addPoint(newPoint);
            
            if (lastPoint != undefined)
            {
                dt = Math.sqrt(Math.pow((lastPoint.x - newPoint.x) / dt, 2) + Math.pow((lastPoint.y - newPoint.y) / dt, 2));
                
                if (dt <= 1)
                {
                    dt = me.resolution / 5;
                }
                
                dt = 1 / dt;
                
                dt = Math.max(dt, 1 / me.resolution);
            }
            
            lastPoint = newPoint;
        }
    };
    
    this.remakeCurve = function()
    {
        // Flag all curve points for deletion.
        for (var i = 0; i < me.curvePoints.length; i++)
        {
            me.curvePoints[i].destroy();
        }
        
        // Clear the curve points array.
        me.curvePoints = [];
        
        // Make the curve...
        me.makeBezierCurve(me.controlPoints[0], me.controlPoints[1], me.controlPoints[2], me.controlPoints[3]);
        me.makeBezierCurve(me.controlPoints[3], me.controlPoints[4], me.controlPoints[5], me.controlPoints[6]);
    };
    
    this.remakeCurve();
}

function Modeler2D(onSubmit, initialPoints, undoBuffer, redoBuffer)
{
    var me = this;
    
    const INITIAL_WIDTH = 300;
    const INITIAL_HEIGHT = 150;
    
    this.subWindow = SubWindowHelper.create({ title: "Modeler 2D", content: "", 
            minWidth: INITIAL_WIDTH, minHeight: INITIAL_HEIGHT });
            
    this.subWindow.enableFlex(); // Causes the canvas to grow to fill the window.
    
    var canvas = document.createElement("canvas");
    canvas.style.width = "calc(100% - 5px)";
    canvas.style.height = "auto";
    canvas.style.margin = "0px";
    this.subWindow.content.style.padding = "0px";
    
    var ctx = canvas.getContext("2d");
    
    var pointerActions = { PAN: "PAN", EDIT_POINTS: "EDIT_POINTS" };
    
    var points = initialPoints || [ new ModelerPoint2D(10, 10), new ModelerPoint2D(20, 20) ];
    
    
    if (initialPoints)
    {
        for (var i = 0; i < initialPoints.length; i++)
        {
            // If the point has actions that might lead to 
            //the creation of new points,
            if (initialPoints[i].setAddPointFunction)
            {
                initialPoints[i].setAddPointFunction(function(newPoint)
                {
                    points.push(newPoint); // Note thepoint's creation.
                });
            }
        }
    }
    
    var previousStates = undoBuffer || [];
    var redoStates = redoBuffer || [];
    
    var shouldQuit = false;
    var action = pointerActions.PAN;
    var selectedPoints = [];
    var transformMatrix = Mat33Helper.getTranslateMatrix(INITIAL_WIDTH / 2, INITIAL_HEIGHT / 2);
    
    var zoomRate = 2;
    
    var fileMenu = new SubWindowTab("File");
    var editMenu = new SubWindowTab("Edit");
    var selectionMenu = new SubWindowTab("Selection");
    var helpMenu = new SubWindowTab("Help");
    
    if (onSubmit)
    {
        fileMenu.addCommand("Submit", function()
        {
            var submitPoints = [];
            
            for (var i = 0; i < points.length; i++)
            {
                if (!points[i].getIsControlPoint())
                {
                    submitPoints.push(new Point(points[i].x, points[i].y));
                }
            }
            
            onSubmit(submitPoints, points, previousStates, redoStates);
            
            shouldQuit = true;
            me.subWindow.destroy();
        });
    }
    
    fileMenu.addCommand("Exit", function() 
    {
        me.subWindow.destroy();
        shouldQuit = true;
    });
    
    // When the sub-window is closed...
    me.subWindow.setOnCloseListener(function()
    {
        shouldQuit = true; // Stop the animation loop.
    });
    
    var changePointerControl = function(tab)
    {
        if (action === pointerActions.EDIT_POINTS)
        {
            action = pointerActions.PAN;
            
            tab.setLabel("Edit Points");
        }
        else
        {
            action = pointerActions.EDIT_POINTS;
            
            tab.setLabel("Pan");
        }
    };
    
    var editPointsTab = editMenu.addCommand("Edit Points", function(tab)
    {
        changePointerControl(tab);
    });
    
    var deleteSelection = function()
    {
        // Allow undoing this...
        allowSoftUndo({ deletedThings: true });
    
        var newPoints = [];
        
        for (var i = 0; i < points.length; i++)
        {
            if (!points[i].selected)
            {
                newPoints.push(points[i]);
            }
            else
            {
                points[i].destroy();
            }
        }
        
        points = newPoints;
        selectedPoints = [];
    };
    
    editMenu.addCommand("Sort Points", function(tab)
    {
        allowSoftUndo({ changedPointsOrder: true });
        
        points.sort(function(a, b)
        {
            return a.y - b.y;
        });
    });
    
    var zoomIn = function()
    {
        transformMatrix.zoomCenter(zoomRate, canvas.width, canvas.height);
    };
    
    editMenu.addCommand("Zoom +", function()
    {
        zoomIn();
    });
    
    var zoomOut = function()
    {
        transformMatrix.zoomCenter(1 / zoomRate, canvas.width, canvas.height);
    };
    
    editMenu.addCommand("Zoom -", function()
    {
        zoomOut();
    });
    
    editMenu.addCommand("Reset View", function()
    {
        transformMatrix = Mat33Helper.getTranslateMatrix(0, 0);
    });
    
    var addCurve = function()
    {
        allowSoftUndo({ addedThings: true });
        
        new BezierCurveControl(function(point)
        {
            points.push(point);
        });
    };
    
    editMenu.addCommand("Add Curve", function() 
    {
        addCurve();
    });
    
    var selectAll = function()
    {
        for (var i = 0; i < points.length; i++)
        {
            points[i].select();
            
            selectedPoints.push(points[i]);
        }
    };
    
    selectionMenu.addCommand("Select All", function(tab)
    {
        selectAll();
    });
    
    selectionMenu.addCommand("Delete Selection", function(tab)
    {
        deleteSelection();
    });
    
    var configureSelection = function(allowConfigureMultiple)
    {
        var handlePoint = function(i, point)
        {
            var selectionWindow = SubWindowHelper.create({ title: "Point " + i, content: "" });
            HTMLHelper.addHeader("Point " + i, selectionWindow, "h2");
            
            var pointConfigureContent = point.getConfigureOptions();
            
            var handleConfigureKey = function(key)
            {
                var configFunction = pointConfigureContent[key];
                var option = new ConfigurationHandler();
                
                option.setType(option.GET_INPUT_TYPE);
                var inputType = configFunction(option);
                
                option.setType(option.GET);
                var inputInitialContent = configFunction(option);
                
                HTMLHelper.addBR(selectionWindow);
                HTMLHelper.addLabel(key, selectionWindow);
                
                HTMLHelper.addInput(key, inputInitialContent, inputType, selectionWindow, function(inputValue)
                {
                    option.setType(option.SET);
                    configFunction(option, inputValue);
                });
                
                HTMLHelper.addHR(selectionWindow);
            };
            
            for (var key in pointConfigureContent)
            {
                handleConfigureKey(key);
            }
        };
        
        for (var i = 0; i < selectedPoints.length; i++)
        {
            handlePoint(i, selectedPoints[i]);
                
            if (!allowConfigureMultiple)
            {
                break;
            }
        }
    };
    
    selectionMenu.addCommand("Configure Selection", function(tab)
    {
        configureSelection(true);
    });
    
    helpMenu.addCommand("Keyboard Shortcuts", function(tab)
    {
        var keyShortcutInfo = 
        `
        Keyboard Shortcuts:
        =====================
        a: Select all.
        Shift + click: Select multiple.
        Delete: Delete selection.
        p: Change cursor manipulation action.
        c: Add curve.
        - OR _: Zoom out.
        + OR =: Zoom in.
        
        Shift + Tab: Move another window to the fore.
        Shift + F4: Close the window in the fore.
        `;
        
        SubWindowHelper.alert("Keyboard Shortcuts", keyShortcutInfo);
    });
    
    helpMenu.addCommand("About", function(tab)
    {
        var aboutInformation = window.ABOUT_PROGRAM || "...";
        
        SubWindowHelper.alert("About", aboutInformation);
    });
    
    // Undo
    var getPointsCopy = function()
    {
        var copy = [];
        
        for (var i = 0; i < points.length; i++)
        {
            copy.push(points[i]);
        }
        
        return copy;
    };
    
    const maxUndo = 12;
    
    var redoCommand;
    
    var allowSoftUndo = function (data)
    {
        // So long as things have changed significantly...
        if (!data
             || !(data.deletedThings || data.addedThings || data.redid
             || data.changedPointsOrder))
        {
            return;
        }
        
        previousStates.push(getPointsCopy());
        
        console.log(previousStates[previousStates.length - 1].length);
        softUndo.show();
        
        // Hide redo options.
        if (!data.redid)
        {
            redoStates = [];
            redoCommand.hide();
        }
        
        if (previousStates.length > maxUndo)
        {
            // TODO Replace this with a faster (not in n) method.
            previousStates = previousStates.slice(previousStates.length - maxUndo);
        }
    };
    
    var softUndo = helpMenu.addCommand("Soft Undo", function(tab)
    {
        if (previousStates.length === 1)
        {
            softUndo.hide();
        }
        else if (previousStates.length === 0)
        {
            return;
        }
        
        var revertTo = previousStates.pop();
        
        if ((redoStates.length >= 1 && !ArrayHelper.equals(redoStates[redoStates.length - 1], points))
                || redoStates.length === 0)
        {
            redoStates.push(getPointsCopy());
        }
        
        points = revertTo;
        
        // Unmark all points to be destoryed.
        for (var i = 0; i < points.length; i++)
        {
            points[i].toDestroy = false;
        }
        
        redoCommand.show();
    });
    
    if (previousStates.length === 0)
    {
        softUndo.hide();
    }
    
    redoCommand = helpMenu.addCommand("Redo", function(tab)
    {
        if (redoStates.length === 1)
        {
            tab.hide();
        }
        else if (redoStates.length === 0)
        {
            tab.hide();
            return;
        }
        
        
        var lastRedo = redoStates.pop();
        console.log(lastRedo);
        
        allowSoftUndo({ redid: true });
        
        points = lastRedo;
    }); 
    
    if (redoStates.length === 0)
    {
        redoCommand.hide();
    }
    
    me.subWindow.addTab(fileMenu);
    me.subWindow.addTab(editMenu);
    me.subWindow.addTab(selectionMenu);
    me.subWindow.addTab(helpMenu);
    
    me.subWindow.appendChild(canvas);
    
    var drawAxis = function()
    {
        var yAxisPoint1 = new Point(0, 600, 1);
        var yAxisPoint2 = new Point(0, -600, 1);
        
        yAxisPoint1.transformBy(transformMatrix);
        yAxisPoint2.transformBy(transformMatrix);
        
        ctx.save();
        ctx.strokeStyle = "red";
        
        ctx.beginPath();
        
        ctx.moveTo(yAxisPoint1.x, yAxisPoint1.y);
        ctx.lineTo(yAxisPoint2.x, yAxisPoint2.y);
        
        //console.log(yAxisPoint1.toString() + ", " + yAxisPoint2.toString());
        
        ctx.stroke();
        
        ctx.restore();
    };
    
    this.render = function()
    {
        var lastPoint = undefined;
        var lastNonControlPoint = undefined;
        
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Draw a coordinate axis.
        drawAxis();
        
        var mustDestroyPoints = false;
        
        for (var i = 0; i < points.length; i++)
        {
            if (points[i].toDestroy)
            {
                mustDestroyPoints = true;
                
                continue;
            }
            
            // Only give the point to be rendered the last non-
            //control point to prevent lines being drawn between
            //control and non-control points.
            points[i].render(ctx, lastNonControlPoint, transformMatrix);
            
            lastPoint = points[i];
            
            if (!lastPoint.getIsControlPoint())
            {
                lastNonControlPoint = lastPoint;
            }
        }
        
        // If at least one point was flagged for destruction,
        //remove all that are flagged for destruction.
        if (mustDestroyPoints)
        {
            // Allow undo.
            let deletedControlPoint = false;
            
            // Check the list of all points.
            var newPoints = [];
            
            for (var i = 0; i < points.length; i++)
            {
                if (!points[i].toDestroy)
                {
                    newPoints.push(points[i]);
                }
                else if (points[i].getIsControlPoint())
                {
                    deletedControlPoint = true;
                }
            }
            
            // Check the selection.
            var newSelection = [];
            
            for (var i = 0; i < selectedPoints.length; i++)
            {
                if (!selectedPoints[i].toDestroy)
                {
                    newSelection.push(selectedPoints[i]);
                }
                else if (selectedPoints[i].getIsControlPoint())
                {
                    deletedControlPoint = true;
                }
            }
            
            // Allow undo.
            if (deletedControlPoint)
            {
                allowSoftUndo({ deletedThings: true });
            }
            
            points = newPoints;
            selectedPoints = newSelection;
        }
    };
    
    this.animate = function()
    {
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight)
        {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
        
        me.render();
        
        if (!shouldQuit)
        {
            requestAnimationFrame(me.animate);
        }
    };
    
    this.animate();
    
    canvas.style.touchAction = "none"; // Prevents default (scrolling/shortcut) action
                                       //on touch of the canvas.
    
    var selectPointsAtLocation = function(x, y, selectMultiple)
    {
        var canSelectMore = true;
        var lastFocus = undefined;
        
        for (var i = points.length - 1; i >= 0; i--)
        {
            if (points[i].checkCollision(x, y, 1, transformMatrix) && (!selectMultiple || !points[i].selected) && (canSelectMore || points[i].focusPriority))
            {
                if (points[i].focusPriority && !selectMultiple && lastFocus)
                {
                    lastFocus.deselect();
                    selectedPoints.pop();
                }
                
                selectedPoints.push(points[i]);
                points[i].select();
                
                if (!selectMultiple)
                {
                    canSelectMore = false;
                    lastFocus = points[i];
                }
            }
            else if (!selectMultiple)
            {
                points[i].deselect();
            }
        }
    };
    
    var pointerDown = false;
    var lastX, lastY;
    var inverseTransform = undefined;
    var shiftKeyPressed = false;
    
    // Arrow key control options.
    var arrowKeySpeed = 7;
    var lastArrowKeyPressTime = (new Date()).getTime();
    var newActionWaitTime = 1000;
    
    var startSelectedAction = function(x, y)
    {   
        lastX = x;
        lastY = y;
        
        // Clear selection if no shift.
        if (!shiftKeyPressed)
        {
            selectedPoints = [];
        }
        
        selectPointsAtLocation(x, y, shiftKeyPressed);
        
        if (action === pointerActions.EDIT_POINTS)
        {
            inverseTransform = transformMatrix.getInverse();
        }
        
        // On right click...
        if (event.button === 2)
        {
            configureSelection(false); // Do NOT configure multiple.
            
            event.preventDefault(); // Don't display the browser's right-click menu.
        }
    };
    
    var doSelectedAction = function(x, y)
    {
        // Nothing can be done without a direction!
        if (lastX === undefined || lastY === undefined)
        {
            lastX = x;
            lastY = y;
            
            return;
        }
        
        var dx = x - lastX;
        var dy = y - lastY;
        
        // Do different things based on the user- 
        //selected action. This might get large...
        //consider switching to a switch statement.
        if (action === pointerActions.PAN)
        {
            transformMatrix.translate([dx, dy]);
        }
        else if (action === pointerActions.EDIT_POINTS)
        {
            // MatHelper.transformPoint CHANGES
            //the contents of the arrays it is given,
            //format the points and transform them
            //so that the x and y - components are
            //in WORLD SPACE -- they match the 
            //transformed space of the points on
            //the screen.
            var currentXYArray = [x, y, 1];
            var lastXYArray = [lastX, lastY, 1];
            
            MatHelper.transformPoint(currentXYArray, inverseTransform);
            MatHelper.transformPoint(lastXYArray, inverseTransform);
            
            var dxScaled = currentXYArray[0] - lastXYArray[0];
            var dyScaled = currentXYArray[1] - lastXYArray[1];
            
            //allowSoftUndo({ dx: dxScaled, dy: dyScaled, selection: ArrayHelper.softCopy(selectedPoints) });
            
            for (var i = 0; i < selectedPoints.length; i++)
            {
                selectedPoints[i].translate(dxScaled, dyScaled);
            }
        }
        
        lastX = x;
        lastY = y;
    };
    
    // Make the canvas focusable (so it can recieve
    //key press input).
    canvas.setAttribute("tabindex", 1);
    
    // Listen for keys used to execute commands.
    canvas.addEventListener("keydown", function(event)
    {
        var nowTime = (new Date()).getTime();
        var arrowKeyPressed = event.key === "ArrowRight" || 
                event.key === "ArrowLeft" ||
                event.key === "ArrowUp" ||
                event.key === "ArrowDown";
        
        if (arrowKeyPressed && nowTime - lastArrowKeyPressTime > newActionWaitTime)
        {
            startSelectedAction(lastX, lastY);
            
            lastArrowKeyPressTime = nowTime;
        }
        
        if (event.key === "Shift")
        {
            shiftKeyPressed = true;
        }
        else if (event.key === "Delete")
        {
            deleteSelection();
        }
        else if (event.key === "a")
        {
            selectAll();
        }
        else if (event.key === "ArrowLeft")
        {
            doSelectedAction((lastX || 0) - arrowKeySpeed, lastY);
        }
        else if (event.key === "ArrowRight")
        {
            doSelectedAction((lastX || 0) + arrowKeySpeed, lastY);
        }
        else if (event.key === "ArrowUp")
        {
            doSelectedAction(lastX, (lastY || 0) - arrowKeySpeed);
        }
        else if (event.key === "ArrowDown")
        {
            doSelectedAction(lastX, (lastY || 0) + arrowKeySpeed);
        }
    }, true);
    
    canvas.addEventListener("keypress", function(event)
    {
        console.log(event.key);
        
        if (event.key === "-" || event.key === "_")
        {
            zoomOut();
        }
        else if (event.key === "+" || event.key === "=")
        {
            zoomIn();
        }
        else if (event.key === "Delete")
        {
            deleteSelection();
        }
        else if (event.key === "p")
        {
            changePointerControl(editPointsTab);
        }
        else if (event.key === "c")
        {
            addCurve();
        }
    }, true);
    
    canvas.addEventListener("keyup", function(event)
    {
        if (event.key === "Shift")
        {
            shiftKeyPressed = false;
        }
    }, true);
    
    JSHelper.Events.registerPointerEvent("down", canvas, function(event)
    {
        var bbox = canvas.getBoundingClientRect();
        var x = event.clientX - bbox.left,
            y = event.clientY - bbox.top;
        
        startSelectedAction(x, y, shiftKeyPressed);
        
        pointerDown = true;
        
        return true;
    }, false);
    
    JSHelper.Events.registerPointerEvent("move", canvas, function(event)
    {
        if (pointerDown)
        {
            var bbox = canvas.getBoundingClientRect();
            var x = event.clientX - bbox.left,
                y = event.clientY - bbox.top;
            
            doSelectedAction(x, y);
        }
    
        return true;
    }, false);
    
    JSHelper.Events.registerPointerEvent("stop", canvas, function()
    {
        pointerDown = false;
        return true;
    }, false);
    
    JSHelper.Events.registerPointerEvent("up", function(event)
    {
        pointerDown = false;
        
        // Don't display the browser's right-click
        //menu.
        if (event.button === 2)
        {
            event.preventDefault();
        }
        
        return true;
    }, false);
    
    // Don't show the default right-click menu.
    canvas.addEventListener("contextmenu", function(event)
    {
        event.preventDefault();
    });
}



// Inserted file DefaultSpellcheckWords.js encoding='utf-8'
"use strict";

// Citation: Wikipedia contributors, "Quicksort," Wikipedia, The Free Encyclopedia, https://en.wikipedia.org/w/index.php?title=Quicksort&oldid=969250830 (accessed July 24, 2020). 
// Additional words may have been added. Others may have been removed.
var DEFAULT_SPELLCHECK_WORDS = // Words taken from https://en.wikipedia.org/wiki/Quicksort
`a
ability
about
above
abstractly
acar
accepted
access
accomplished
according
accordingly
account
accurately
achieve
acm
adaptive
add
addison
additional
additionally
adjacent
adoption
affect
affects
after
again
against
agree
aid
al
alejandro
alenex
algol
algorithm
algorithms
algorithmsdivide
aligned
all
allowing
allows
almost
alone
alphabetic
already
also
alternative
although
always
amenable
american
amount
amounts
an
analysis
analyzed
and
andy
anim
animated
annual
another
anthony
antony
any
anywhere
api
apparent
appearing
appended
applied
apply
approach
appropriate
approx
approximately
approximation
april
architecture
archived
are
argument
arise
arithmetic
armin
array
arrays
art
article
arxiv
as
ascending
asked
assessment
association
assume
assuming
at
attached
attributed
attribution
august
aurick
australasian
autocode
auxiliary
available
average
averaged
averaging
avoid
away
azillionmonkeys
b
back
bad
balanced
barros
base
based
basic
batcher
be
bead
beautiful
because
becomes
been
before
beginning
behavior
behaviours
being
below
benefit
bentley
bergen
best
bet
better
between
bibcode
big
binary
bit
bitonic
bits
blelloch
block
blockquicksort
blocks
bogosort
book
boost
boss
both
bound
boundary
bounded
bounds
boxer
branch
branches
breshears
brings
british
bst
bubble
bucket
buckets
buffer
buffers
burstsort
but
by
bytes
c
ca
cache
caches
calculation
call
called
calls
came
can
cannot
carefully
cartesian
cascade
case
cases
categories
cause
causes
ch
chain
chance
change
changed
changes
chapter
character
charles
chernoff
chnotes
choice
choices
choose
chooses
choosing
chosen
cite
citeseerx
claim
claiming
class
classic
classical
clay
clearly
clifford
close
closer
cn
co
cocktail
code
coin
cole
com
comb
combination
come
comjnl
comm
common
commonly
commons
commun
communications
community
compact
compare
compared
comparison
comparisons
competes
competitor
competitors
complex
complexity
complicate
complicated
composed
comput
computational
computations
compute
computer
computers
computing
computingcomparison
concurrent
concurrently
conditional
conditions
conf
conquer
consequently
consider
considerably
considered
consistently
constant
constitutes
construct
constructing
construction
contact
contain
contained
contains
contents
continued
continues
contradictory
contribute
contributions
controlling
convert
cookie
copied
core
cormen
correct
corresponding
corresponds
cost
could
count
counters
counting
covcompiled
crcw
create
created
creates
creation
creative
crop
cs
current
cycle
d
dam
data
david
de
dead
deal
dean
debatable
december
decision
decreased
decreases
default
define
defined
definition
degrade
degrades
demonstrated
demonstration
denote
denoted
department
dependencies
dependent
depending
depends
depth
derivation
descending
described
design
designing
desirable
desired
details
detect
detected
deutsch
developed
developers
diagram
dictionary
did
diego
difference
different
difficult
direct
directly
directory
disadvantage
disadvantages
disclaimers
discovered
discrete
discussed
discussion
disk
displaystyle
distinct
distributed
distribution
divide
divided
divides
division
do
dobb
documentation
does
doesn
doi
dominance
don
donald
donate
done
dots
doug
douglas
down
download
dr
ds
dual
due
duplicates
during
dutch
e
each
early
easier
easily
easy
ed
edelkamp
edit
edited
edition
eds
education
effective
effectively
efficiency
efficient
efficiently
eight
either
element
elements
emden
emphasized
empirical
empty
enabled
encyclopedia
end
ends
engineering
england
english
enough
ensuring
entire
entropy
equal
equally
equals
equivalent
esa
especially
essay
essays
estimate
estimated
et
european
even
events
ever
every
exactly
example
excellent
exchange
exchanges
exchanging
excluded
execute
execution
exhibits
exist
existence
expectation
expected
expense
experience
experimental
experiments
explain
explained
explicit
export
expressed
expressing
expression
extensive
external
extra
extstyle
factor
failing
falls
family
faron
fast
faster
fat
fdocuments
february
fewer
fewest
file
files
filled
final
find
finish
first
fit
fix
flag
flashsort
flinders
flipped
flips
floor
folder
following
follows
footprint
for
forever
form
formal
formally
forming
formulation
found
foundation
fraction
frame
free
frequent
frequently
from
full
function
fundamentals
further
g
gained
general
generalization
generally
get
gets
gif
given
gives
gmane
gnome
gnu
go
good
graphical
greater
greatly
greg
groups
guaranteed
guarantees
guy
h
had
half
hall
handle
handled
happens
hard
has
hash
have
he
heads
heap
heapsort
help
hence
here
hi
hidden
high
highly
hill
him
his
history
hit
hoare
horizontal
how
however
hsieh
html
http
https
hybrid
i
ian
iconcomputer
idea
ideal
identical
if
ight
illustration
imagine
impacts
implement
implementation
implementations
implemented
implementing
implicit
implicitly
impliclty
implied
implies
important
improbable
improvements
in
inc
include
included
including
inclusive
incorporated
increase
increases
increasing
incremental
incremented
index
indicate
indicated
indices
industrial
inferior
infinite
influence
information
initial
initiated
inplacement
input
inputs
inserted
inserting
insertion
insertions
inside
insights
instances
instead
instruction
instructions
int
integer
interactive
interest
internal
interpolation
intervals
interview
into
introduction
introductory
introsort
introspective
invalid
inventor
inversion
inverted
involves
involving
inwards
is
isbn
isn
issn
issues
it
italiano
item
items
iterate
iteration
ith
its
itself
j
jagm
january
java
job
jon
jones
journal
july
jump
k
kaiserslautern
kaligosi
kanat
kandathil
kanela
keeps
key
keys
kind
kirkpatrick
kn
knew
known
knuth
kth
kushagra
l
laboratory
ladner
lamarca
languages
large
larger
largest
last
later
laube
laurence
ldots
leading
learned
least
leaves
lecture
left
leftmost
leiserson
length
lent
leq
less
let
level
libc
libraries
library
license
like
likely
limit
limiting
linear
linearity
lines
link
linked
links
list
listings
lists
ln
lo
location
log
logged
lomuto
long
longer
looked
looking
loop
loops
lost
lot
low
lower
lowers
m
machine
machinery
machines
mackay
made
magnetic
mailing
main
maintain
maintains
make
makes
making
malijan
management
manner
manual
many
marcelo
march
margaret
markus
master
material
mathematical
mathematics
mathrm
maximizing
may
mcgraw
mcilroy
meaning
means
media
median
medians
mediawiki
meet
memories
memory
mentioned
menu
mercury
merge
mergesort
method
methods
mid
middle
milestone
miller
minimal
minimizing
mispredictions
mit
mo
mobile
model
moderate
modern
modified
moller
more
morin
moscow
most
mostly
move
much
multi
multikey
multiple
multiquicksort
munro
museum
musser
must
my
n
naive
name
national
natural
navigation
nc
near
nearly
nebel
necessarily
need
needed
needless
needlessly
needs
nend
nested
net
network
never
new
next
nico
nine
ninther
nlog
no
node
non
norway
not
notation
note
noted
notes
noting
november
now
number
numbers
o
objects
observation
observe
occur
occurs
october
of
often
older
oleft
omitted
on
once
one
only
ontario
onto
open
operate
operating
operation
operations
operatorname
opposed
opposite
optimal
optimised
optimization
optimizations
optimized
or
oracle
oram
order
ordering
orderings
org
organization
organizes
original
ortiz
oscillating
other
others
our
out
outline
output
over
overcome
overflow
overhead
overheads
p
page
pages
pair
pairwise
pancake
parallel
parallelism
parallelization
parallelize
parallelized
parameter
parameters
part
partial
partition
partitioned
partitioning
partitions
parts
pass
passes
pat
patience
pattern
paul
pdf
pearls
pearson
per
percent
percentile
percentiles
perform
performance
performing
performs
perhaps
permalink
permanent
permutation
permutations
perspective
peter
ph
physical
pick
pieces
pigeonhole
pivot
pivoting
pivots
place
platform
plus
point
pointers
policy
polyphase
poor
popped
popularized
portal
position
positions
possible
post
powered
powers
pp
pr
practical
practice
pram
pre
prefix
premier
prentice
prepended
presentation
presented
preserved
press
previous
primitives
print
printable
prior
privacy
probability
problem
problems
proc
procedure
proceedings
process
processed
processes
processing
processor
processors
produce
product
professional
profit
program
programmers
programming
programs
project
projects
proof
proofs
property
proposed
prove
provide
providing
proxmap
pseudocode
pseudomedian
publications
publish
published
push
pushed
puts
qiao
qsort
quadratic
quantum
quick
quickly
quickmergesort
quickselect
quickshort
quicksort
quicksorts
quicksortsorting
r
rac
radix
radixsort
random
randomized
range
rank
rare
rather
rd
reach
reached
reaching
read
reader
really
rearranges
reason
recent
recognizing
recommended
record
records
recur
recurrence
recurrences
recurs
recurse
recursion
recursive
recursively
reducing
reference
references
registered
reid
reilly
reisch
reitzig
related
relation
relative
relatively
remaining
remains
removed
reorder
repeated
repeatedly
replacement
represent
representations
represents
reprinted
require
required
requirement
requires
requiring
resolved
rest
result
resulting
results
retrieved
return
returned
returns
reverse
revisited
richard
right
rightmost
rigorous
risk
rivest
robert
ronald
root
round
rounding
roura
routine
rule
run
running
runtime
russ
russian
s
same
sample
samplesort
sampling
san
sanders
saving
scalability
scan
scans
scheme
schemes
science
scientist
scratch
se
search
searching
sebastian
second
section
sedgewick
see
segments
select
selecting
selection
self
seminar
sense
sentences
separate
separately
separates
september
sequence
sequential
sequentially
set
sets
several
shaded
shaker
sharealike
shellsort
short
show
shows
shrinu
shustek
siam
sici
side
significant
similar
simple
simpler
simplifies
simply
simulation
since
single
sir
site
situ
sixpence
size
sized
sizes
skiena
slow
slower
slowsort
small
smaller
smallest
smoothsort
snippet
so
society
software
solve
solved
solves
solving
some
sometimes
somewhere
sophisticated
sort
sorted
sorter
sorting
sorts
sortssorting
source
soviet
space
spaghetti
spe
special
specific
specifically
speedup
splaysort
split
splits
spreadsort
springer
st
stability
stable
stack
stackexchange
stand
standard
start
state
statement
statistics
stefan
stein
step
steps
steven
still
stirling
stooge
stop
stopping
stops
storage
store
stored
strategies
strategy
string
stronger
structural
structures
student
study
sub
subarray
subarrays
subfile
subfiles
sublist
sublists
suboptimal
subpartitions
subroutine
subsequently
subsumed
subtree
successive
such
suffer
suffers
sufficiently
suggested
sum
superior
sure
swansea
swap
swapped
swaps
switch
switches
symbols
symposium
t
table
tables
tail
take
taken
takes
talk
tangwongsan
tape
task
technique
technische
technologies
tells
ten
tend
terminate
termination
terms
terrible
test
tests
text
textbook
th
than
that
the
their
them
then
theorem
theoretic
theoretical
theory
there
therefore
these
thesis
theta
they
thing
think
third
this
thomas
those
though
three
threshold
through
thus
time
times
timsort
tleft
to
together
tony
too
tools
topic
topological
total
tournament
toward
towards
trademark
transdichotomous
translation
tree
trees
trick
trivial
trivially
true
tuned
turned
two
type
typically
u
ubc
ugrad
ultimately
umut
unbalanced
unconditionally
under
understand
understood
unfortunately
unification
unified
uniform
uniformly
union
unique
uniqueprefix
university
unix
unlike
unpredictable
unsorted
unstable
until
up
update
upload
us
use
used
useless
uses
using
usually
utc
util
value
values
van
variable
variables
variance
variant
variants
various
vary
verify
verlag
version
versions
very
via
view
viewpoint
virtual
visiting
visualization
vladimir
volume
vs
vte
w
walkthrough
warrant
was
waterloo
way
ways
we
weak
well
were
wesley
what
when
where
whereas
whether
which
while
whole
whose
why
widely
widespread
wild
will
wilson
with
within
without
won
words
work
worked
working
workings
works
workshop
worse
worst
would
write
written
wrong
wrote
www
x
y
years
yield
yielding
yields
you
zero
zurich`;
// Inserted file SubWindowManager.js encoding='utf-8'
"use strict";

function SubWindowGlobals(parent, windowsList)
{
    this.parent = parent;
    this.windowsList = windowsList;
    this.dragElement = document.createElement("div");
    this.minZIndex = 100;
    
    var me = this;
    
    this.sortWindowsList = function()
    {
        /* Sort descending order. */
        me.windowsList.sort(function(windowA, windowB) 
        {
            return windowB.zIndex - windowA.zIndex;
        });
    };
    
    this.getMaxZIndex = function(excludeObject)
    {
        me.sortWindowsList();
        
        var result = this.minZIndex;
        
        if (me.windowsList.length > 0)
        {
            result = me.windowsList[0].zIndex;
            
            if (me.windowsList[0] == excludeObject)
            {
                if (me.windowsList.length > 1)
                {
                    result = me.windowsList[1].zIndex;
                }
                else
                {
                    result = this.minZIndex;
                }
            }
        }
        
        return result;
    };

    this.moveTopLevelWindowsToTheFore = function()
    {
        me.sortWindowsList();

        let hadBelowTop = false;

        for (var i = 0; i < me.windowsList.length; i++)
        {
            if (me.windowsList[i].alwaysOnTop && hadBelowTop)
            {
                me.windowsList[i].toTheFore(true);
            }

            hadBelowTop = hadBelowTop || !me.windowsList[i].alwaysOnTop;
        }
    };
    
    this.addWindow = function(newWindow)
    {
        me.windowsList.push(newWindow);
    };
    
    this.removeDestroyed = function()
    {
        me.sortWindowsList();
        
        while (me.windowsList.length > 0 
            && me.windowsList[me.windowsList.length - 1].zIndex === -1)
        {
            me.windowsList.pop();
        }
    };
    
    // Listen for shift + F3 to switch between windows.
    me.parent.addEventListener("keydown", function(event)
    {
        if (event.shiftKey && me.windowsList.length > 0)
        {
            if (event.key === "F3")
            {
                // Don't perform default action.
                event.preventDefault();
                
                me.sortWindowsList();
                
                // Select the last window.
                me.windowsList[me.windowsList.length - 1].toTheFore();
            }
            else if (event.key === "F4")
            {
                // Don't perform default action.
                event.preventDefault();
                
                me.sortWindowsList();
                
                // Close the first (focused) window.
                me.windowsList[0].close();
            }
        }
    }, true);
    
    this.parent.appendChild(this.dragElement);
    this.dragElement.setAttribute("class", "windowDragElement");
    this.dragElement.style.position = "fixed";
    this.dragElement.style.width = "100vw";
    this.dragElement.style.height = "100vh";
    this.dragElement.style.zIndex = 9999;
    this.dragElement.style.touchAction = "none";
    this.dragElement.style.display = "none";
}

// A tab specific to SubWindows.
function SubWindowTab(label, options)
{
    options = options || {};
    
    var parent = undefined;
    var me = this;
    var stylePrefix = options.stylePrefix || "base";
    this.mainElement = document.createElement(options.mainElement || "span");
    this.mainElement.setAttribute("class", stylePrefix + "Tab");
    this.mainElementCommand = document.createElement("span");
    this.mainElementCommand.setAttribute("class", stylePrefix + "TabLabel");
    this.mainElementCommand.textContent = label;
    this.label = label;
    this.mainElement.appendChild(this.mainElementCommand);
    
    if (!options.command)
    {
        this.menuElement = document.createElement("div");
        this.menuElement.style.display = "none";
        this.menuElement.style.position = "absolute";
        this.menuElement.setAttribute("class",  stylePrefix + "Menu");
        this.mainElement.appendChild(this.menuElement);
        this.subTabs = [];
        this.menuClickAwayEventListener = document.body.addEventListener("click", function(e)
        {
            if (me.menuElement && e.target !== me.menuElement && me.menuElement.style.display === "block")
            {
                e.preventDefault();
                me.menuElement.style.display = "none";
            }
        }, true);
        
        this.onClick = function()
        {
            me.menuElement.style.display = "block";
            me.menuElement.style.left = me.mainElement.offsetLeft + "px";
            //me.menuElement.style.top = (me.menuElement.clientHeight) + "px";
        };
    }
    else
    {
        this.onClick = options.command;
    }
    
    this.setLabel = function(newLabel)
    {
        me.mainElementCommand.textContent = newLabel;
        me.label = newLabel;
    };
    
    this.addCommand = function(label, action)
    {
        if (me.menuElement === undefined)
        {
            throw "Cannot add sub-commands to a tab with a pre-set action.";
        }
        
        var subTab;
        subTab = new SubWindowTab(label, { command: function(event) { action(subTab, event); }, stylePrefix: stylePrefix, mainElement: "div" });
        subTab.addToElement(me.menuElement);
        
        return subTab;
    };
    
    this.addToElement = function(element)
    {
        element.appendChild(me.mainElement);
        parent = element;
    };
    
    // Unhides the element.
    this.show = function()
    {
        me.mainElement.style.visibility = "visible";
        me.mainElement.style.width = "auto";
        me.mainElement.style.height = "auto";
        me.mainElement.setAttribute("title", "Visible item. " + me.label);
    };
    
    this.hide = function()
    {
        me.mainElement.style.visibility = "hidden";
        me.mainElement.style.height = "0px";
        me.mainElement.style.width = "0px";
        me.mainElement.setAttribute("title", "Hidden item. " + me.label);
    };
    
    this.destroy = function()
    {
        if (me.menuElement)
        {
            me.mainElement.removeChild(me.menuElement);
            delete me.menuElement;
        }
        
        if (me.subTabs)
        {
            for (var i = 0; i < me.subTabs.length; i++)
            {
                me.subTabs[i].destroy();
            }
        }
        
        if (parent !== undefined)
        {
            parent.removeChild(me.mainElement);
        }
        else
        {
            me.mainElement.outerHTML = "";
        }
        
        delete me.mainElement;
    };
    
    this.mainElementCommand.setAttribute("tabIndex", 2);
    this.mainElementCommand.addEventListener("click", me.onClick);
}

function SubWindow(globals, options)
{
    // Several significant options:
    //  minWidth    Minimum width (px)                              int
    //  minHeight   Minimum height (px)                             int
    //  maxWidth    Maximum width (px)                              int
    //  maxHeight   Maximum height (px)                             int
    //  title       Title content                                   str
    //  className   Additional style sheets for the window, all     str
    //              prepended with className.
    //fixWindowSize Whether to set the window's dimensions to a     bool
    //              size in pixels after load or to allow its size
    //              to be determined by its contents until resize.
    //  noResize    Disable window resizing.                        bool
    // unsnappable  Prohibits a "snapping" behavior from occurring  bool
    //              when a window is brought near an edge of the screen.
    // fixed        Whether the user can drag the window.           bool
    //noCloseButton Whether to include the "X" button.              bool
    // withPage     Whether the window moves with page content.     bool
    //titleHTML     HTML-based content for the title. If used,      str
    //              please also specify title, for accessibility.
    //contentHTML   HTML-based content for the window.              str
    //title         Text-based title content.                       str
    //content       Text-based window content.                      str

    options = options || {};
    var parent = globals.parent;
    
    var me = this;
    var styleClassName = options.className || "windowContainerDefault";
    
    // Get a string representing a component's style classes
    //for a given suffix.
    var getStyleClass = (suffix) =>
    {
        let result;
        
        result = styleClassName + suffix + " " + "windowContainer" + suffix;
        
        return result;
    };
    
    this.zIndex = globals.minZIndex;
    
    this.container = document.createElement("div");
    this.container.setAttribute("class", getStyleClass(""));
    
    this.container.style.display = "flex";
    this.container.style.flexDirection = "column";
    this.container.style.position = options.withPage ? "absolute" : "fixed";
    
    this.titleBar = document.createElement("div");
    this.titleBar.setAttribute("class", getStyleClass("TitleBar"));
    this.titleBar.setAttribute("tabIndex", 2);
    
    this.titleBar.style.display = "flex";
    this.titleBar.style.flexDirection = "row";
    this.titleBar.setAttribute("title", "In-page window. Title bar.");
    
    this.titleContent = document.createElement("div");
    this.titleContent.setAttribute("class", getStyleClass("TitleContent"));
    this.titleContent.style.flexGrow = "1";
    this.titleContent.setAttribute("tabIndex", 2);

    this.alwaysOnTop = options.alwaysOnTop || false;
    this.unsnappable = options.unsnappable === undefined ? (options.noResize || false) : options.unsnappable;
    this.snapThreshold = options.snapThreshold !== undefined ? options.snapThreshold : 60; // How far to the left/right the user needs to drag the window for it to snap.
    this.snapped = false; // Whether the window is currently snapped.
    
    this.draggable = false;
    
    if (options.titleHTML)
    {
        this.titleContent.innerHTML = options.titleHTML;
    }
    else if (options.title)
    {
        this.titleContent.textContent = options.title;
    }
    
    this.tabZone = document.createElement("div");
    this.tabZone.setAttribute("class", getStyleClass("TabZone"));
    this.tabZone.style.display = "none";
    var hasTabs = false;
    var tabs = [];
    
    var minWidth = options.minWidth;
    var minHeight = options.minHeight;
    var maxWidth = options.maxWidth;
    var maxHeight = options.maxHeight;
    
    let getMaxWidth = () =>
    {
        return maxWidth || window.innerWidth || parent.clientWidth;
    };
    
    let getMaxHeight = () =>
    {
        return maxHeight || window.innerHeight || parent.clientHeight;
    };
    
    var onCloseListener = undefined;
    
    this.content = document.createElement("div");
    this.content.setAttribute("class", getStyleClass("Content"));
    this.content.style.flexGrow = "1";
    
    if (options.contentHTML)
    {
        this.content.innerHTML = options.contentHTML;
    }
    else if (options.content)
    {
        this.content.textContent = options.content;
    }
    
    this.titleBar.appendChild(me.titleContent);
    this.container.appendChild(this.titleBar);
    this.container.appendChild(this.tabZone);
    this.container.appendChild(this.content);
    
    me.container.style.filter = "opacity(0%)";
    var transitionInOutFunction = function(progress)
    {
        me.container.style.filter = "opacity(" + Math.floor(progress * 100) + "%)";
    };
    
    this.destroyTransition = new Transition(transitionInOutFunction,
        options.destroyTransitionDuration !== undefined ? options.destoryTransitionDuration : 300,
        function()
        {
            parent.removeChild(me.container);
            
            for (var i = 0; i < tabs.length; i++)
            {
                tabs[i].destroy();
            }
            
            delete me.container;
            delete me.content;
            delete me.tabZone;
            delete me.titleBar;
            delete me.titleContent;
            
            me.zIndex = -1;
            globals.removeDestroyed();
            
            me.closed = true;
            
            if (onCloseListener)
            {
                onCloseListener();
            }

        });
        
    this.destroyTransition.reverse();
    
    var initialWidth, initialHeight, toWidth, toHeight;
    this.sizeTransition = new Transition(function(progress)
    {
        me.container.style.width = initialWidth + progress * (toWidth - initialWidth) + "px";
        me.container.style.height = initialHeight + progress * (toHeight - initialHeight) + "px";
        me.updateResizeCircleLocation(true);
    }, options.sizeTransitDuration !== undefined ? options.sizeTransitDuration : 250, function() // On end.
    {
        me.updateResizeCircleLocation(true);
    }, function(endWidth, endHeight) // Before start
    {
        initialWidth = me.container.clientWidth;
        initialHeight = me.container.clientHeight;
        
        if (endWidth !== undefined && endHeight !== undefined)
        {
            toWidth = endWidth;
            toHeight = endHeight;
        }

        // Bounds checking!
        if (minWidth !== undefined && toWidth < minWidth)
        {
            toWidth = minWidth;
        }
        
        if (minHeight !== undefined && toHeight < minHeight)
        {
            toHeight = minHeight;
        }

        if (toWidth > getMaxWidth())
        {
            toWidth = getMaxWidth();
        }

        if (toHeight > getMaxHeight())
        {
            toHeight = getMaxHeight();
        }
    });
    
    this.locationTransition = new Transition(function(progress)
    {
        me.container.style.left = (this.transitFromX + (this.transitToX - this.transitFromX) * progress) + "px";
        me.container.style.top = (this.transitFromY + (this.transitToY - this.transitFromY) * progress) + "px";
        
        me.updateResizeCircleLocation(false); // DO NOT re-measure the size of the container.
    }, options.locationTransitDuration !== undefined ? options.locationTransitDuration : 100, function() // On end.
    {
        me.updateResizeCircleLocation(false);
    }, function(toX, toY) // On before start.
    {
        var bbox = me.container.getBoundingClientRect();
    
        // Note that "this" is the transition.
        this.transitToX = toX;
        this.transitToY = toY;
        this.transitFromX = bbox.left;
        this.transitFromY = bbox.top;
    });
        
    this.createTransition = new Transition(transitionInOutFunction,
        options.createTransitionDuration !== undefined ? options.createTransitionDuration : 300,
        function()
        {
            // After creation, check for needed resizes again -- some
            //applications can take some time to inflate.
            if (!options.noResizeCircle && !options.noResize)
            {
                me.createResizeCircle();
            }
            
            me.scaleToParentWindow();
        });
    
    this.addTab = function(tab)
    {
        tab.addToElement(me.tabZone);
        tabs.push(tab);
        
        if (!me.hasTabs)
        {
            me.tabZone.style.display = "block";
            
            me.hasTabs = true;
        }
    };
    
    this.appendChild = function(child)
    {
        me.content.appendChild(child);
    };
    
    this.removeChild = function(child)
    {
        me.content.removeChild(child);
    };
    
    this.enableFlex = function(direction)
    {
        me.content.style.display = "flex";
        
        if (direction)
        {
            me.content.style.flexDirection = direction;
        }
    };

    var widthPreSnap = undefined, heightPreSnap = undefined;

    this.unsnap = function()
    {
        if (me.snapped)
        {
            me.sizeTransition.start(widthPreSnap || minWidth, 
                        heightPreSnap || minHeight).then(() =>
            {
                me.snapped = false;
            });
        }
        else
        {
            throw "Error in unsnap: Window is not snapped!";
        }
    };

    // Snap a window to the left of the screen,
    //or the right.
    this.snap = function(windowX, divideX)
    {
        if (!me.snapped)
        {
            widthPreSnap = me.container.clientWidth;
            heightPreSnap = me.container.clientHeight;
        }

        let top = 0;
        let left = windowX;

        if (me.container.style.position === "absolute")
        {
            top = window.scrollY;
            left += window.scrollX;
        }

        me.container.style.top = top;
        me.container.style.left = left + "px";

        toWidth = (window.innerWidth || parent.clientWidth) - divideX;
        toHeight = window.innerHeight || parent.clientHeight;

        if (windowX !== divideX)
        {
            toWidth = divideX;
        }

        me.sizeTransition.start();

        me.snapped = true;
    };

    this.snapLeft = function()
    {
        me.snap(0, (window.innerWidth || parent.clientWidth) / 2);
    };

    this.snapRight = function()
    {
        var divide = (window.innerWidth || parent.clientWidth) / 2;

        me.snap(divide, divide)
    };
    
    // Adjust the scale of the sub-window to fit in the browser's window.
    this.scaleToParentWindow = function()
    {
        toWidth = me.container.clientWidth;
        toHeight = me.container.clientHeight;
        var runSizeTransition = false;
        
        if (minWidth === undefined)
        {
            minWidth = me.container.clientWidth / 2;
        }
        
        if (minHeight === undefined)
        {
            minHeight = me.container.clientHeight / 2;
        }
        
        if (me.container.clientHeight < minHeight)
        {
            toHeight = minHeight;
            
            runSizeTransition = true;
        }
        
        if (me.container.clientWidth < minWidth)
        {
            toWidth = minWidth;
            
            runSizeTransition = true;
        }
        
        if (me.container.clientWidth > getMaxWidth())
        {
            toWidth = getMaxWidth();
            
            runSizeTransition = true;
        }
        
        if (me.container.clientHeight > getMaxHeight())
        {
            toHeight = getMaxHeight();
            
            runSizeTransition = true;
        }
        
        if (runSizeTransition)
        {
            me.sizeTransition.start();
        }
        
        var bbox = me.container.getBoundingClientRect();
        
        var left = bbox.left;
        var top = bbox.top;

        var moveToLeft = 0,
            moveToTop  = 0;

        if (me.container.style.position === "absolute")
        {
            left += window.scrollX;
            top += window.scrollY;

            moveToLeft = window.scrollX;
            moveToTop = window.scrollY;
        }
        
        var windowWidth = window.innerWidth || globals.dragElement.clientWidth;
        var windowHeight =  window.innerHeight || globals.dragElement.clientHeight;
        
        if (me.container.clientWidth + left > windowWidth)
        {
            me.container.style.left = moveToLeft;
            me.container.style.width = windowWidth + "px";
        }
        
        if (me.container.clientHeight + top > windowHeight)
        {
            me.container.style.top = moveToTop;
            me.container.style.maxHeight = windowHeight + "px";
        }
        
        me.updateResizeCircleLocation(true);
    };
    
    this.createCloseButton = function()
    {
        me.closeButton = document.createElement("div");
        me.closeButton.innerHTML = "X";
        
        me.closeButton.setAttribute("title", "Push button: Close");
        me.closeButton.setAttribute("tabIndex", 2);
        
        me.closeButton.setAttribute("class", getStyleClass("CloseButton"));
        
        me.titleBar.appendChild(me.closeButton);
        
        me.closeButton.addEventListener("click", function(event)
        {
            event.preventDefault();
            
            me.destroy();
        });
    };
    
    this.createMinimizeMaximizeButton = function()
    {
        me.minMaxButton = document.createElement("div");
        me.minMaxButton.setAttribute("class", getStyleClass("MaximizeButton"));
        
        me.minMaxButton.setAttribute("title", "Push button: Minimize or maximize.");
        me.minMaxButton.setAttribute("tabIndex", 2);
        
        me.titleBar.appendChild(me.minMaxButton);
        
        // Original state
        var originalResizeCircleDisplay = "block";
        var originalWidth = minWidth;
        var originalHeight = minHeight;
        var originalX = 0;
        var originalY = 0;
        var originalMovable = true;
        
        var storeOriginalState = function()
        {
            var bbox = me.content.getBoundingClientRect();
                
            originalWidth = me.container.clientWidth;
            originalHeight = me.container.clientHeight;
            
            originalWidth = Math.max(originalWidth, minWidth);
            originalHeight = Math.max(originalHeight, minHeight);
            
            originalX = bbox.left;
            originalY = bbox.top;
            
            originalMovable = me.getDraggable();
            
            if (me.resizeZone)
            {   
                originalResizeCircleDisplay = me.resizeZone.style.display;
            }
        };
        
        me.minMaxButton.addEventListener("click", function(event)
        {
            event.preventDefault();
            
            // Set up state for size transition.
            initialWidth = me.container.clientWidth;
            initialHeight = me.container.clientHeight;
            
            if (me.minMaxButton.getAttribute("class").indexOf("MinimizeB") === -1)
            {
                // Change the button's looks!
                me.minMaxButton.setAttribute("class", getStyleClass("MinimizeButton"));
                
                // Allow a return to the state of the window before maximization.
                storeOriginalState();
                
                me.locationTransition.start(0, 0);
                
                me.sizeTransition.start(window.innerWidth || parent.clientWidth, window.innerHeight || parent.clientHeight);
                
                me.setDraggable(false);
                
                setDragReplacementAction((dx, dy) =>
                {
                    if (dy > 0)
                    {
                        clearDragReplacementAction();
                        
                        me.minMaxButton.click();
                    }
                });
                
                if (me.resizeZone)
                {
                    me.resizeZone.style.display = "none";
                }
            }
            else
            {
                me.sizeTransition.start(originalWidth, originalHeight);
                
                me.locationTransition.start(originalX, originalY).then(() => 
                {
                    // Only change state related to minimization/maximization at the end.
                    me.minMaxButton.setAttribute("class", getStyleClass("MaximizeButton"));
                    me.setDraggable(originalMovable);
                });
                
                clearDragReplacementAction();
                
                // Show the resize circle.
                if (me.resizeZone)
                {
                    me.resizeZone.style.display = originalResizeCircleDisplay;
                }
            }
        });
    };
    
    this.updateResizeCircleLocation = function(measureSize)
    {
        // Do nothing if the circle is nonexistant.
    };
    
    this.createResizeCircle = function()
    {
        var bbox = me.container.getBoundingClientRect();
    
        me.resizeZone = document.createElement("div");
        me.resizeZone.setAttribute("class", getStyleClass("ResizeZone"));
        me.resizeZone.style.position = "absolute"; // Note: "fixed" has issues in WebKit.
        me.container.appendChild(me.resizeZone);
        
        // If specified, set the width and height of the window
        //to concrete values.
        if (options.fixWindowSize)
        {
            me.container.style.width = me.container.clientWidth + "px";
            me.container.style.height = me.container.clientHeight + "px";
        }
        
        var left = me.container.clientWidth - 5;
        var top = me.container.clientHeight - 5;
        
        me.resizeZone.style.left = left + "px";
        me.resizeZone.style.top = top + "px";
        
        var width = me.container.clientWidth;
        var height = me.container.clientHeight;
        
        me.updateResizeCircleLocation = function(measureSize)
        {
            if (measureSize)
            {
                width = me.container.clientWidth;
                height = me.container.clientHeight;
            }
        
            me.resizeZone.style.left = (width - me.resizeZone.clientWidth / 2) + "px";
            me.resizeZone.style.top = (height - me.resizeZone.clientHeight / 2) + "px";
        };
        
        var draggableWrapper = new DraggableElement(me.resizeZone, globals.dragElement);
        draggableWrapper.onDrag = function(dx, dy, x, y)
        {
            me.toTheFore();
        
            if ((width + dx > minWidth || dx > 0) && (width + dx < getMaxWidth() || dx < 0))
            {
                width += dx;
            }
            
            if ((height + dy > minHeight || dy > 0) && (height + dy < getMaxHeight() || dy < 0))
            {
                height += dy;
            }
            
            me.updateResizeCircleLocation(false);
            
            me.container.style.width = (width) + "px";
            me.container.style.height = (height) + "px";
        };
        
        draggableWrapper.onBeforeDrag = function()
        {
            me.toTheFore();
            
            width = me.container.clientWidth;
            height = me.container.clientHeight;
        };
    };
    
    this.toTheFore = function(calledFromTopToTheFore)
    {
        var maxZIndex = globals.getMaxZIndex(me);
        
        if (maxZIndex >= me.zIndex)
        {
            me.zIndex = maxZIndex + 1;
            me.container.style.zIndex = me.zIndex;
            globals.dragElement.style.zIndex = me.zIndex * 2;

            if (!calledFromTopToTheFore && !me.alwaysOnTop)
            {
                globals.moveTopLevelWindowsToTheFore();
            }
        }
    };
    
    this.getDraggable = function()
    {
        return me.draggable;
    };
    
    this.setDraggable = function(draggable)
    {
        me.draggable = draggable;
    };
    
    var dragReplacementAction;
    
    var setDragReplacementAction = function(action)
    {
        dragReplacementAction = action;
    };
    
    var clearDragReplacementAction = function()
    {
        dragReplacementAction = undefined;
    };
    
    this.makeMovable = function()
    {
        var bbox = me.container.getBoundingClientRect();
        var left = bbox.left;
        var top = bbox.top;
      
        // If using absolute positioning, position relative to the document.
        if (me.container.style.position === "absolute")
        {
            left += window.scrollX;
            top += window.scrollY;
        }
          
        me.container.style.left = left + "px";
        me.container.style.top = top + "px";
        
        me.draggable = true;
        
        var draggableWrapper = new DraggableElement(me.titleContent, globals.dragElement,
            undefined, me.container.style.position === "absolute");

        draggableWrapper.onDrag = function(dx, dy, x, y)
        {
            me.toTheFore();
            
            if (!me.getDraggable())
            {
                // Replace the action, if requested.
                if (dragReplacementAction)
                {
                    dragReplacementAction(dx, dy);
                }
            
                return;
            }
        
            left += dx;
            top += dy;
            
            me.container.style.left = left + "px";
            me.container.style.top = top + "px";

            if (left < -me.snapThreshold && !me.unsnappable)
            {
                me.snapLeft();
            }
            else if (left > (window.innerWidth || parent.clientWidth) - me.container.clientWidth + me.snapThreshold && !me.unsnappable)
            {
                me.snapRight();
            }
            else if (me.snapped)
            {
                me.unsnap();
            } // Snap top?
            else if (top < me.snapThreshold && me.minMaxButton && !me.unsnappable && dy < 0)
            {
                me.minMaxButton.click();
            }
        };
        
        draggableWrapper.onBeforeDrag = function()
        {
            me.toTheFore();
        
            bbox = me.container.getBoundingClientRect();
            left = bbox.left;
            top = bbox.top;

            // If using absolute positioning, position relative to the document.
            if (me.container.style.position === "absolute")
            {
                left += window.scrollX;
                top += window.scrollY;
            }
        };
    };
    
    this.destroy = function()
    {
        if (!me.closed)
        {
            me.destroyTransition.start();
        }
    };
    
    this.close = this.destroy;
    
    this.setOnCloseListener = function(newOnCloseListener)
    {
        onCloseListener = newOnCloseListener;
    };
    
    this.show = function()
    {
        parent.appendChild(me.container);
        
        me.createTransition.start();
        globals.addWindow(me);
        me.toTheFore();
        
        me.container.style.zIndex = me.zIndex;
        
        globals.dragElement.style.zIndex = me.zIndex * 2;
        
        if (!options.noFullScreenBox && !options.noResize)
        {
            me.createMinimizeMaximizeButton();
        }
        
        if (!options.noCloseButton)
        {
            me.createCloseButton();
        }
        
        if (!options.fixed)
        {
            me.makeMovable();
        }
        
        // Select the container's title.
        if (me.container.style.position !== "absolute")
        {
            me.titleContent.focus();
        }
        
        // Allow the window to scale, then
        //change its dimensions, if necessary.
        requestAnimationFrame(function()
        { 
            var initialX = options.x !== undefined ? options.x : Math.max(0, window.innerWidth - me.container.clientWidth) / 2;
            var initialY = options.y !== undefined ? options.y : Math.max(5, window.innerHeight / 4 - me.container.clientHeight) / 2;
            
            if (me.container.style.position === "absolute")
            {
                initialX += window.scrollX;
                initialY += window.scrollY;
            }
            
            me.locationTransition.start(initialX, initialY);
            me.scaleToParentWindow();
        });
    };
    
    this.container.addEventListener("click",
    function()
    {
        me.toTheFore();
    }, true);
}

var SubWindowHelper = {};
SubWindowHelper.create = function(options)
{
    if (!SubWindowHelper.globals)
    {
        SubWindowHelper.globals = new SubWindowGlobals(document.body, []);
    }
    
    var newWindow = new SubWindow(SubWindowHelper.globals, options);
    
    newWindow.show();
    
    return newWindow;
};

SubWindowHelper.confirm = function(title, message, okLabel, cancelLabel, htmlText, windowOptions)
{
    var dialog = SubWindowHelper.create(windowOptions 
    || { title: title, 
         content: "", 
         noCloseButton: true, 
         noResize: true, 
         maxWidth: 400, 
         minWidth: 400, 
         x: (window.innerWidth / 2 - 200), 
         minHeight: 120 });
    
    var contentDiv = document.createElement("div");
    
    if (!htmlText)
    {
        contentDiv.innerText = message;
    }
    else
    {
        contentDiv.innerHTML = message;
    }
    
    dialog.enableFlex("column");
    contentDiv.style.flexGrow = 2;
    contentDiv.style.overflowY = "auto";
    
    // Add additional padding.
    contentDiv.style.paddingLeft = "4px";
    
    var submitButtonOk = document.createElement("button");
    var submitButtonCancel = document.createElement("button");
    
    submitButtonOk.innerHTML = okLabel || "Ok";
    submitButtonCancel.innerHTML = cancelLabel || "Cancel";
    
    submitButtonOk.setAttribute("class", "dialogSubmitButton");
    submitButtonCancel.setAttribute("class", "dialogSubmitButton");
    
    dialog.content.appendChild(contentDiv);
    dialog.content.appendChild(submitButtonOk);
    dialog.content.appendChild(submitButtonCancel);
    
    return new Promise((resolve, reject) =>
    {
        const submit = (result) =>
        {
            dialog.close();
            
            resolve(result);
        };
    
        submitButtonOk.addEventListener("click", function()
        {
            submit(true);
        });
        
        submitButtonCancel.addEventListener("click", function()
        {
            submit(false);
        });
    });
};

SubWindowHelper.alert = function(title, message, onClose, htmlText, windowOptions)
{
    var alertDialog = SubWindowHelper.create(windowOptions 
    || { title: title, 
         content: "", 
         noCloseButton: true, 
         noResize: true, 
         maxWidth: 400, 
         minWidth: 400, 
         x: (window.innerWidth / 2 - 200), 
         minHeight: 120 });
    
    var contentDiv = document.createElement("div");
    
    if (!htmlText)
    {
        contentDiv.innerText = message;
    }
    else
    {
        contentDiv.innerHTML = message;
    }
    
    alertDialog.enableFlex("column");
    contentDiv.style.flexGrow = 2;
    contentDiv.style.overflowY = "auto";
    
    // Add additional padding.
    contentDiv.style.paddingLeft = "4px";
    
    var submitButton = document.createElement("button");
    submitButton.innerHTML = "Ok";
    submitButton.setAttribute("class", "alertSubmitButton");
    
    alertDialog.content.appendChild(contentDiv);
    alertDialog.content.appendChild(submitButton);
    
    return new Promise((resolve, reject) =>
    {
        submitButton.addEventListener("click", function()
        {
            alertDialog.close();
            
            if (onClose !== undefined)
            {
                onClose.call(this);
            }
            
            resolve(this);
        });
    });
};

// Prompt a user for input.
//This method takes a map of input placeholders/
//labels to input types as "inputs". It returns a promise.
//windowOptions is passed directly to SubWindowHelper.
//promptOptions is a map with further options related to
//the prompt. For example, promptOptions.initialContent
//should map from labels to initial content.
SubWindowHelper.prompt = function(title, message, inputs, 
        windowOptions, promptOptions)
{
    var promptDialog = SubWindowHelper.create
            (windowOptions
             || { title: title, 
                  content: "",  
                  minWidth: 400, 
                  x: (window.innerWidth / 2 - 200), 
                  minHeight: 120 });
                  
    promptDialog.enableFlex("column");
    
    promptOptions = promptOptions || {};
    promptOptions.initialContent = promptOptions.initialContent || {};
            
    var contentArea = document.createElement("div");
    var messageZone = document.createElement("div");
    var inputZone = document.createElement("div");
    
    contentArea.appendChild(messageZone);
    contentArea.appendChild(inputZone);
    
    promptDialog.appendChild(contentArea);
    
    messageZone.innerText = message;
    
    var addedInputs = [];
    var inputMap = {};
    var submit = () => {};
    
    var handleInput = (label) =>
    {
        const inputIndex = addedInputs.length;
        
        let newInputContainer = document.createElement("div");
        
        newInputContainer.style.display = "flex";
        newInputContainer.style.flexDirection = "row";
        
        let labelElement = HTMLHelper.addLabel(label, newInputContainer);
        
        labelElement.style.paddingRight = "6px";
        
        let newInput = HTMLHelper.addInput(label, 
                promptOptions.initialContent[label] || "",
                inputs[label], newInputContainer, (value) => // On input.
        {
            inputMap[label] = value;
        }, (value) => // On Enter key.
        {
            inputMap[label] = value;
            
            if (inputIndex + 1 < addedInputs.length 
                    && inputs[label] !== "textarea")
            {
                addedInputs[inputIndex + 1].focus();
            }
            else
            {
                submit();
            }
        });
        
        newInput.style.flexGrow = 1;
        
        inputZone.appendChild(newInputContainer);
        
        return newInput;
    };
    
    // For every given input...
    for (var label in inputs)
    {
        let input = handleInput(label);
        
        inputMap[label] = HTMLHelper.getInputContent(input, inputs[label]);
        addedInputs.push(input);
    }
    
    // Add a submit button.
    const submitButton = HTMLHelper.addButton("Submit", promptDialog, () =>
    {
        submit();
    });
    
    submitButton.style.flexGrow = 1;
    
    return new Promise((resolve, reject) =>
    {
        submit = () =>
        {
            promptDialog.close();
            
            resolve(inputMap);
        };
    });
};

// Creates a dialog... Returns an object with
//methods update, close, and a refrence to the dialog (dialog).
SubWindowHelper.makeProgressDialog = function(title)
{
    // Default values.
    title = title || "Loading...";
    
    // Make the window.
    let progressDialog = SubWindowHelper.create({ title: title, noCloseButton: true, noResize: true, maxWidth: 400, minWidth: 400, x: window.innerWidth / 2 - 200 });
    
    let statusText = HTMLHelper.addLabel("...", progressDialog, "div");
    let progressBar = HTMLHelper.addProgressBar(0, progressDialog);
    
    let update = function(progress, status)
    {
        progressBar.setProgress(progress);
        statusText.textContent = status;
    };
    
    let close = function()
    {
        progressDialog.close();
    };
    
    // Dictionaries cannot be
    //constructed in return statements.
    let result =  
    {
        update: update,
        
        close: close,
        
        dialog: progressDialog
    };
    
    return result;
};

// TODO: Finish implementation.
SubWindowHelper.setDisplayNavabar = function(displayNavBar)
{
    if (SubWindowHelper.navBar)
    {
        if (displayNavBar)
        {
            SubWindowHelper.navBar.style.display = "block";
        }
        else
        {
            SubWindowHelper.navBar.style.display = "none";
        }
    }
    else
    {
        SubWindowHelper.navBar = document.createElement("div");
    }
};

self.SubWindowHelper = SubWindowHelper;
self.EditorHelper = EditorHelper;
})();
