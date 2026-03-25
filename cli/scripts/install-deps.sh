#!/bin/bash
set -e

echo "Installing LocalScript dependencies..."

if command -v brew &> /dev/null; then
    echo "Using Homebrew to install dependencies..."
    
    brew install lua luacheck
    
    echo "Checking for llama.cpp..."
    if ! command -v llama-cli &> /dev/null; then
        echo "Installing llama.cpp via brew..."
        brew install llama.cpp
    fi
    
    echo "Checking for ollama..."
    if ! command -v ollama &> /dev/null; then
        echo "Note: ollama not found. Install from https://ollama.ai for easier model management"
    fi
elif command -v apt-get &> /dev/null; then
    echo "Using apt to install dependencies..."
    sudo apt-get update
    sudo apt-get install -y lua5.4 luacheck
fi

echo ""
echo "Verifying installations..."
command -v lua && echo "✓ lua"
command -v luac && echo "✓ luac"
command -v luacheck && echo "✓ luacheck"

echo ""
echo "Setup complete! Next steps:"
echo "1. Install ollama: curl -fsSL https://ollama.ai/install.sh | sh"
echo "2. Pull a model: ollama pull qwen2.5-coder:14b"
echo "3. Run: localscript status"