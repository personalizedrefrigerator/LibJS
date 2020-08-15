#!/bin/bash

echo -e "SubWindowHelper\nEditorHelper\nAuthHelper.js" | python3 ./Libs/unify.py ./Libs -e > FullLibJS.js
