#!/bin/bash

echo -e "SubWindowHelper\nEditorHelper\nAuthHelper\nJSHelper\nHTMLHelper\nCloudHelper\nMat33Helper\nMat44Helper\nMat" | python3 ./Libs/unify.py ./Libs -e > FullLibJS.js
