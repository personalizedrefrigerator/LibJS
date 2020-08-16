#!/bin/bash

echo -e "SubWindowHelper\nEditorHelper\nAuthHelper\nJSHelper\nCloudHelper" | python3 ./Libs/unify.py ./Libs -e > FullLibJS.js
