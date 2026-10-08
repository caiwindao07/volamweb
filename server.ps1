$root = $PSScriptRoot

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".mp3"  = "audio/mpeg"
    ".woff2"= "font/woff2"
    ".svg"  = "image/svg+xml"
}

# Tim port ranh tu 8080 tro len
$port = 8080
$listener = $null
while ($port -lt 8100) {
    try {
        $prefix = "http://localhost:$port/"
        $listener = [System.Net.HttpListener]::new()
        $listener.Prefixes.Add($prefix)
        $listener.Start()
        break
    } catch {
        $port++
    }
}

if (-not $listener.IsListening) {
    Write-Host "Khong the mo port tu 8080 den 8100!" -ForegroundColor Red
    pause
    exit
}

$url = "http://localhost:$port/"
Write-Host "==================================================" -ForegroundColor Green
Write-Host "   VO LAM IDLE - DIT ME PHAM HA!         " -ForegroundColor Yellow
Write-Host "   Truy cap: $url" -ForegroundColor Cyan
Write-Host "   (Dong cua so nay de tat game)                  " -ForegroundColor Gray
Write-Host "==================================================" -ForegroundColor Green

# Tu dong mo trinh duyet
Start-Process $url

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawUrl = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rawUrl) -or $rawUrl -eq "/") {
            $rawUrl = "index.html"
        }

        $decodedPath = [System.Uri]::UnescapeDataString($rawUrl.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        $filePath = [System.IO.Path]::Combine($root, $decodedPath)

        if ([System.IO.File]::Exists($filePath)) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            
            $response.ContentType = $mime
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Cache-Control", "no-cache")
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawUrl")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
