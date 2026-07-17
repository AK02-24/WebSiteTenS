$port = 58085
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
}

$listener.Start()
Write-Host "Listening on http://localhost:$port/"
while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $urlPath = $request.Url.LocalPath
    if ($urlPath -eq "/") { $urlPath = "/index.html" }
    
    $urlPath = [System.Uri]::UnescapeDataString($urlPath)
    $filePath = [System.IO.Path]::GetFullPath((Join-Path $pwd.Path $urlPath))
    
    if (-not $filePath.StartsWith($pwd.Path)) {
        $response.StatusCode = 403
        $bytes = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()
    }

    if ($filePath.StartsWith($pwd.Path)) {
        $exists = Test-Path $filePath -PathType Leaf
        if ($exists) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $contentType = $mimeTypes[$ext]
            }
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        if (-not $exists) {
            $response.StatusCode = 404
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not Found: $urlPath")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        $response.Close()
    }
}
