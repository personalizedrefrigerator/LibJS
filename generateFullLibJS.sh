#!/bin/bash

echo -e "SubWindowHelper\nEditorHelper\nAuthHelper\nJSHelper\nHTMLHelper\nCloudHelper" | python3 ./Libs/unify.py ./Libs -e > FullLibJS.js
