"use strict";

/// @require ./JSHelper.js
/// @require ./MathHelper.js
/// @require ./SyntaxHelper.js
/// @require ./HTMLHelper.js
/// @require ./SubWindowHelper.js
/// @export EditorHelper
/// @export Editor

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
`there are hardly any default words in this dictionary
you should probably consider including the
spell help script file if using the spelling checker`.replace(/\s+/g, "\n").toLowerCase();

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

    this.render = async function()
    {
        if (me.ctx.canvas.clientHeight !== me.ctx.canvas.height || me.ctx.canvas.clientWidth !== me.ctx.canvas.width)
        {
            // If we have zero width or height...
            if (!me.ctx.canvas.clientHeight || !me.ctx.canvas.clientWidth)
            {
                await JSHelper.waitFor(0.2); // Wait, then render. We could be transitioning in.
            }
            
            me.ctx.canvas.height = me.ctx.canvas.clientHeight || 300; // If still zero, make a guess!
            me.ctx.canvas.width = me.ctx.canvas.clientWidth || 500;
        }

        me.ctx.clearRect(0, 0, me.ctx.canvas.width, me.ctx.canvas.height);

        me.ctx.font = me.font;
        me.ctx.textBaseline = "top";
        me.lineH = me.ctx.measureText("M").width * 1.5;

        var minDisplayIndex = Math.max(-me.viewOffset - 1, 0);
        var i;

        for (i = minDisplayIndex; i < me.lines.length; i++)
        {
            me.lines[i].x = me.x;
            me.lines[i].h = me.lineH;
            me.lines[i].render(i + me.viewOffset, i);

            if (me.lines[i].y > me.ctx.canvas.height)
            {
                break;
            }
        }

        var maxDisplayIndex = i;
        return [ minDisplayIndex, maxDisplayIndex ];
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

    // Note: This causes a render.
    // Gets all lines currently displayed.
    this.getDisplayedLines = async function()
    {
        const displayRange = await me.render();
        let result = [];

        for (let index = displayRange[0]; index < displayRange[1]; index++)
        {
            result.push(me.lines[index]);
        }

        return result;
    };

    // Like getDisplayedLines, but returns 
    // the text of the lines on display,
    // rather than the line objects themselves.
    this.getDisplayedText = async function()
    {
        let result = [];
        let lines = await me.getDisplayedLines();

        for (const line of lines)
        {
            result.push(line.text);
        }

        return result.join('\n');
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
    textExportParentElement, runFrameParentElement, onRun, syncTextcontrol)
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

        if (me.syncControlContents)
        {
            me.syncControlContents();
        }

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

    var handleKeyPress = (event) =>
    {
        if (!event.ctrlKey && event.key !== "Enter")
        {
            me.editControl.handleKey(event.key);
        }

        me.editControl.render();

        event.preventDefault();

        updateRestoreString();

        return true;
    };

    var handleKeyDown = (event) =>
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
    };

    const WHEEL_PIXEL_MODE = 0;
    const WHEEL_LINE_MODE = 1;
    const WHEEL_PAGE_MODE = 2;
    
    var handleWheel = (event) =>
    {
        var dy = event.deltaY;
        var lineHeight = me.editControl.lineH; 

        if (dy !== 0 && lineHeight > 0)
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
            var lineDeltaCount = Math.floor(Math.abs(dy / lineHeight));
            
            if (!didNotMove || lineDeltaCount < 1)
            {
                event.preventDefault();
            }
        }

        me.editControl.render();
    };

    this.editCanvas.addEventListener("keypress", function(event)
    {
        return handleKeyPress(event);
    }, true);


    this.editCanvas.addEventListener("wheel", function(event)
    {
        return handleWheel(event);
    });

    this.editCanvas.addEventListener("keydown", function(event)
    {
        return handleKeyDown(event);
    }, true);

    this.editCanvas.setAttribute('tabindex', 0);

    if (syncTextcontrol)
    {
        const syncControlContents = async () =>
        {
            let elem = me.copyPasteControl;
            let displayedLines = await me.editControl.getDisplayedLines();
            let text = "";
            let inSelection = false;
            let selStart = -1;
            let selEnd = -1;

            for (const line of displayedLines)
            {
                if (line.hasFocus)
                {
                    selEnd = text.length + line.cursorPosition;
                    
                    if (selStart == -1)
                    {
                        selStart = selEnd;

                        if (!line.hasSelection() || line.selRange[0] == line.selRange[1])
                        {
                            break;
                        }
                    }
                }

                if (line.hasSelection() && !inSelection)
                {
                    selStart = text.length + line.selRange[0];

                    inSelection = true;
                } // The selection ended.
                else if (inSelection && !line.hasSelection())
                {
                    break;
                }
                
                if (inSelection)
                {
                    selEnd = text.length + line.selRange[1];
                }

                text += line.text + '\n';
            }

            elem.value = await me.editControl.getDisplayedText();
            elem.setSelectionRange(selStart, selEnd);
        };

        me.copyPasteControl.addEventListener('keydown', (event) =>
        {
            syncControlContents();

            return handleKeyDown(event);
        }, true);

        me.copyPasteControl.addEventListener('keypress', (event) =>
        {
            return handleKeyPress(event);
        });

        me.copyPasteControl.addEventListener('keyup', () =>
        {
            syncControlContents();
        });

        JSHelper.Events.registerPointerEvent("up", me.copyPasteControl, async () =>
        {
            let elem = me.copyPasteControl;
            let displayedLines = await me.editControl.getDisplayedLines();
            let index = 0;

            let selStart = elem.selectionStart;
            let selEnd = elem.selectionEnd;

            if (selStart > selEnd)
            {
                let temp = selStart;
                selStart = selEnd;
                selEnd = temp;
            }

            for (const line of displayedLines)
            {
                line.unfocus();
                line.deselect();
            }

            for (const line of displayedLines)
            {
                if (index >= selStart || index + line.text.length >= selEnd)
                {
                    if (index == selEnd && index == selStart)
                    {
                        line.hasFocus = true;
                        line.cursorPosition = index - selStart;

                        line.deselect();

                        break;
                    }

                    line.hasFocus = false;
                    line.selRange = 
                    [
                        Math.max(0, selStart - index),
                        Math.min(line.text.length, selEnd - index)
                    ];

                    if (index + line.text.length + 1 > selEnd)
                    {
                        line.hasFocus = true;
                        line.cursorPosition = selEnd - index;

                        line.deselect();
                    }
                }

                if (index > selEnd)
                {
                    break;
                }

                index += line.text.length + 1; // +1 for \n
            }

            syncControlContents();
        });

        me.syncControlContents = syncControlContents;
    }

    this.openInteractiveConsole = async (contentToRun, options) =>
    {
        options = options || {};

        const PROMPT_TEXT = "> ";

        me.editControl.restoreState();
        me.editControl.saveStateAndClear();

        // View as JS.
        me.editControl.setDefaultHighlightScheme("js");

        const printResult = (result, color) =>
        {
            const lines = result.split('\n');

            for (const line of lines)
            {
                let newLine = me.editControl.appendLine(line);
                newLine.editable = false;

                newLine.setColorFunction = (index) =>
                {
                    return color || "#ffaf70";
                };
            }
        };
        
        // Show output...
        if (contentToRun !== undefined)
        {
            const result = await EditorHelper.__runOutOfContext(contentToRun);
            printResult(result);
        }

        let doneLine;
        if (!options.hideExitLine)
        {
            doneLine = me.editControl.appendLine("DONE");
            me.editControl.appendLine("");
        }

        let scriptLine;
        let createScriptLine;
        
        const run = async (newCommand) =>
        {
            const result = await EditorHelper.__runOutOfContext(newCommand);

            if (result.length > 0)
            {
                printResult(result);
            }

            createScriptLine().focus();
            scriptLine.cursorPosition = scriptLine.text.length;

            me.scrollToFocus();
            requestAnimationFrame(() => me.editControl.render());
        };

        createScriptLine = () =>
        {
            if (scriptLine)
            {
                scriptLine.editable = false;
                
                const oldScriptLine = scriptLine;
                scriptLine.onentercommand = () => 
                { 
                    // If removed...
                    if (scriptLine.flaggedForRemoval)
                    {
                        createScriptLine();
                    }

                    scriptLine.text = oldScriptLine.text;
                    const cursorPos = oldScriptLine.cursorPosition;
                    
                    scriptLine.focus();
                    scriptLine.cursorPosition = cursorPos;

                    me.scrollToFocus();
                };
            }

            scriptLine = me.editControl.appendLine(PROMPT_TEXT);

            scriptLine.onentercommand = async () =>
            {
                let newCommand = scriptLine.text.substring(PROMPT_TEXT.length);
                scriptLine.text = PROMPT_TEXT + newCommand;

                run(newCommand);
            };

            return scriptLine;
        };

        createScriptLine();
        
        requestAnimationFrame(() =>
        {
            if (doneLine)
            {
                doneLine.focus();
            }
            
            me.editControl.render();
        });

        if (doneLine)
        {
            doneLine.editable = false;
            doneLine.onentercommand = () =>
            {
                me.editControl.restoreState();
            };
        }

        const controls = 
        {
            run: async (command) =>
            {
                // Log the command.
                scriptLine.text = PROMPT_TEXT + command;

                // THEN run it.
                await run(command);
            },
            print: printResult,
        };

        return controls;
    };

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
                await me.openInteractiveConsole(contentToRun);
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
            exitLine.focus();

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
        highlightScheme: undefined,
        noPreview: false, // Show the preview tab by default.
        syncTextbox: false, // Sync with textbox contents.
        defaultTab: undefined,
    };

    // Start loading contents...

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
    }, container, options.defaultTab || "Editor");
    
    const editor = new Editor(editorElem, keyboardParent, elem, previewElem, () =>
    {
        if (currentTabName !== "Preview" && !options.noPreview)
        {
            tabView.selectTab("Preview");
        }

        editor.runFrame.style.display = "block";
        editor.runFrame.height = options.height;
        editor.runFrame.style.height = options.height + "px";

        return false;
    }, options.syncTextbox);

    if (options.font)
    {
        editor.setFont(options.font);
    }

    if (options.highlightScheme)
    {
        editor.setDefaultHighlightScheme(options.highlightScheme);
    }

    if (options.noPreview)
    {
        tabView.hideTab('Preview');
    }

    editor.clear();
    editor.displayContent(elem.value);
    editor.render();

    if (options.defaultTab == "Preview")
    {
        editor.updateRunFrame();
    }

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
        if (elem.value !== priorElemValue && !options.syncTextbox)
        {
            editor.clear();
            editor.displayContent(elem.value);

            priorElemValue = elem.value;
        }
    };

    const updateElemText = () =>
    {
        if (editor.syncControlContents)
        {
            editor.syncControlContents();
        }
        else
        {
            elem.value = editor.getText();
            priorElemValue = elem.value;
        }
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

    // Focus the first line, if there are lines!
    if (editor.editControl.lines.length > 0)
    {
        editor.editControl.lines[0].hasFocus = true;
    }

    return editor;
};
