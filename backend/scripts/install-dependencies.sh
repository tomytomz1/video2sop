#!/bin/bash

# Check if running on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Install Homebrew if not already installed
    if ! command -v brew &> /dev/null; then
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi

    # Install ffmpeg and yt-dlp using Homebrew
    echo "Installing ffmpeg and yt-dlp..."
    brew install ffmpeg yt-dlp

# Check if running on Linux
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Check if apt is available (Debian/Ubuntu)
    if command -v apt &> /dev/null; then
        echo "Installing ffmpeg and yt-dlp..."
        sudo apt update
        sudo apt install -y ffmpeg
        sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
        sudo chmod a+rx /usr/local/bin/yt-dlp
    else
        echo "Unsupported Linux distribution. Please install ffmpeg and yt-dlp manually."
        exit 1
    fi
else
    echo "Unsupported operating system. Please install ffmpeg and yt-dlp manually."
    exit 1
fi

echo "Dependencies installed successfully!" 