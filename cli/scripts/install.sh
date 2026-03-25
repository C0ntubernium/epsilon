#!/bin/bash
set -e

INSTALL_DIR="${HOME}/.localscript/bin"
BINARY_NAME="localscript"

mkdir -p "$INSTALL_DIR"

if [ "$(uname)" = "Darwin" ]; then
    PLATFORM="darwin"
elif [ "$(uname)" = "Linux" ]; then
    PLATFORM="linux"
else
    echo "Unsupported platform"
    exit 1
fi

ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    ARCH="x64"
elif [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    ARCH="arm64"
fi

TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "Downloading localScript for ${PLATFORM}-${ARCH}..."

curl -fsSL "https://github.com/localscript/cli/releases/latest/download/localscript-${PLATFORM}-${ARCH}.tar.gz" -o localscript.tar.gz

tar xzf localscript.tar.gz

cp localscript "$INSTALL_DIR/${BINARY_NAME}"
chmod +x "$INSTALL_DIR/${BINARY_NAME}"

rm -rf "$TEMP_DIR"

if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
    echo ""
    echo "Add to PATH by running:"
    echo "  echo 'export PATH=\"\$PATH:${INSTALL_DIR}\"' >> ~/.bashrc"
    echo "  source ~/.bashrc"
fi

echo ""
echo "localScript installed successfully!"
echo "Run 'localscript --help' to get started"