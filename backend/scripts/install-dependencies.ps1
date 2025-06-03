# Install Chocolatey if not already installed
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
}

# Install ffmpeg
Write-Host "Installing ffmpeg..."
choco install ffmpeg -y

# Install yt-dlp
Write-Host "Installing yt-dlp..."
choco install yt-dlp -y

Write-Host "Dependencies installed successfully!" 