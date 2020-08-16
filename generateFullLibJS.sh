#!/bin/bash

echo -e "SubWindowHelper\nEditorHelper\nAuthHelper\nJSHelper" | python3 ./Libs/unify.py ./Libs -e > FullLibJS.js
