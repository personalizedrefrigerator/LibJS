"use strict";

/// @require ./MathHelper.js

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
JSHelper.waitForSeconds = (delay) =>
{
    let doResolve = false;
    let resolveFn = () => { doResolve = true; };

    setTimeout(delay * 1000, () => resolveFn());

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
 * Note that each environment will crash after roughly 10000 push events. This is a bug.
 *
 * Note that push returns a string version of the code's output, including console logs, errors, etc.
 */
JSHelper.Environs.makeNew = () =>
{
    const env_updateNotifier = new JSHelper.UniqueNotifier(); // An internal notification handler...
    const env_exitEvent = "EVENT_EXIT";
    const env_pushedEvent = "EVENT_PUSHED";
    const env_returnedEvent = "EVENT_RETURNED";
    const ENV_NEW_VAR_DECL = new RegExp('(\\s|[;\\n]|^)(let|var|const|function)($|\\s|[\\n])', 'g'); // We might have been pushed to a thread... In this case /.../g syntax might fail.

    let env_running = false;
    let env_result;

    env_result =
    {
        // The code inside this is rather frightening because
        // with statements don't work in strict mode... Can it be changed?
        "__start": async () => // Start accepting code...
        {
            env_running = true;

            let env_toRun;

            // Prefix to avoid conflicts with eval...
            const env_console_log = self.console.log;
            const env_console_warn = self.console.warn;
            const env_console_error = self.console.error;
            const env_console = self.console;
            let env_evalResult = "";
            let env_consoleResult = "";
            var // Re-map console.log...
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

            const CODE_TO_RUN = `
            (async function()
            {
                console.log('Entered eval block.');
                while (env_running)
                {
                    env_toRun = await env_updateNotifier.waitFor(env_pushedEvent, env_exitEvent);

                    /* TODO: Can this be made less evil? */
                    /* TODO: What if we reach the maximum recursion depth? */
                    if (env_running)
                    {
                        try
                        {
                            env_evalResult = "";
                            env_consoleResult = "";


                            if (env_toRun.search(ENV_NEW_VAR_DECL) !== -1)
                            {
                                env_evalResult += await eval("(async function() \\n{\\n" +
                                     env_toRun + ";" +
                                    "env_updateNotifier.notify(env_returnedEvent, env_consoleResult + '' + env_evalResult); await " +
                                     CODE_TO_RUN + ";" +
                                "\\n})()");

                                return;
                            }
                            else
                            {
                                env_evalResult += eval(env_toRun);
                            }
                        }
                        catch(e)
                        {
                            env_evalResult += "\\nError: " + e;
                        }

                        env_updateNotifier.notify(env_returnedEvent, env_consoleResult + "" + env_evalResult);
                        // console.log(env_evalResult);
                        /* Continue via while loop. We don't want to recurse if we don't have to. */
                    }
                }
            })()`;

            await eval(CODE_TO_RUN);

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
            // delete listeners[eventName][listenerId];
        };

        // For compatability, if the user called waitFor(something, true),
        //note that we should treat the first argument as the list of events.
        // Additionally, if the event has ever been fired, note that we
        // should return to the user.
        if (eventNames.length > 1 && eventNames[1] === true)
        {
            eventNames = eventNames[0];

            if (typeof eventNames === "string")
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
