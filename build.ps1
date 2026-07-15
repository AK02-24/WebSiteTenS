# TenSguru PowerShell Encryption Build Script
# AES-CBC 256-bit encryption for HTML, CSS, and JS.

$Password = "AWR34008Koom9RbBnt568M32Aak"
if ($env:TENSGURU_PASSWORD) {
    $Password = $env:TENSGURU_PASSWORD
}

Write-Host "Building TenSguru via PowerShell..."
Write-Host "Using password: $Password"

# Paths
$CurrentDir = $pwd.Path
$SrcDir = "$CurrentDir\src"
$src_html = "$SrcDir\index.html"
$src_js = "$SrcDir\app.js"
$src_css = "$SrcDir\styles.css"
$out_html = "$CurrentDir\index.html"

# Verify source files existence
if (-not (Test-Path $src_html)) {
    Write-Error "Error: index.html not found in src/"
    exit 1
}
if (-not (Test-Path $src_js)) {
    Write-Error "Error: app.js not found in src/"
    exit 1
}
if (-not (Test-Path $src_css)) {
    Write-Error "Error: styles.css not found in src/"
    exit 1
}

$RawHtml = [System.IO.File]::ReadAllText($src_html, [System.Text.Encoding]::UTF8)
$RawJs = [System.IO.File]::ReadAllText($src_js, [System.Text.Encoding]::UTF8)
$RawCss = [System.IO.File]::ReadAllText($src_css, [System.Text.Encoding]::UTF8)

# Extract body content
$BodyContent = ""
if ($RawHtml -match "(?s)<body>(.*?)</body>") {
    $BodyContent = $Matches[1]
    $BodyContent = $BodyContent -replace '<script\s+src="app\.js"\s*><\/script>', ''
} else {
    $BodyContent = $RawHtml
}

# Create JSON package
$AppData = [PSCustomObject]@{
    html = $BodyContent
    css = $RawCss
    js = $RawJs
}

$PlainText = ConvertTo-Json -InputObject $AppData -Depth 10 -Compress
$PlainTextBytes = [System.Text.Encoding]::UTF8.GetBytes($PlainText)

# Encryption setup
$Aes = [System.Security.Cryptography.Aes]::Create()
$Aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
$Aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7

# Generate Salt
$Salt = New-Object Byte[] 16
$Rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$Rng.GetBytes($Salt)

# Key derivation via PBKDF2
$UseSha1InBrowser = $false
try {
    $AlgorithmName = [System.Security.Cryptography.HashAlgorithmName]::SHA256
    $DeriveBytes = New-Object System.Security.Cryptography.Rfc2898DeriveBytes ($Password, $Salt, 100000, $AlgorithmName)
} catch {
    # Fallback to default (SHA-1) for older .NET Framework
    $DeriveBytes = New-Object System.Security.Cryptography.Rfc2898DeriveBytes ($Password, $Salt, 100000)
    $UseSha1InBrowser = $true
}

$Key = $DeriveBytes.GetBytes(32)
$Aes.Key = $Key
$Aes.GenerateIV()
$Iv = $Aes.IV

# Encrypt
$Encryptor = $Aes.CreateEncryptor()
$CipherTextBytes = $Encryptor.TransformFinalBlock($PlainTextBytes, 0, $PlainTextBytes.Length)

# Encode to Base64
$B64Salt = [Convert]::ToBase64String($Salt)
$B64Iv = [Convert]::ToBase64String($Iv)
$B64CipherText = [Convert]::ToBase64String($CipherTextBytes)

$BrowserHash = "SHA-256"
if ($UseSha1InBrowser) {
    $BrowserHash = "SHA-1"
}

# Payload JSON
$PayloadJson = '{"salt":"' + $B64Salt + '","iv":"' + $B64Iv + '","ciphertext":"' + $B64CipherText + '","hash":"' + $BrowserHash + '"}'

# Generate Static HTML
$HtmlLines = @(
    '<!DOCTYPE html>',
    '<html lang="ja">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>TenSguru</title>',
    '  <link rel="preconnect" href="https://fonts.googleapis.com">',
    '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">',
    '  <link rel="stylesheet" href="login.css">',
    '  <script src="supabase.js"></script>',
    '</head>',
    '<body>',
    '  <div id="password-screen" class="password-overlay">',
    '    <div class="password-card">',
    '      <div class="brand-logo">TenSguru</div>',
    '      <p id="login-desc" class="password-desc"></p>',
    '      <form id="password-form" onsubmit="event.preventDefault(); handleDecryptSubmit();">',
    '        <div class="input-group">',
    '          <input type="password" id="site-password" placeholder="" required autofocus>',
    '          <span class="focus-border"></span>',
    '        </div>',
    '        <div id="password-error" class="error-msg"></div>',
    '        <button type="submit" id="login-btn" class="btn btn-primary"></button>',
    '      </form>',
    '    </div>',
    '  </div>',
    '  <script>',
    "    const PAYLOAD = $PayloadJson;",
    '  </script>',
    '  <script src="decrypt.js" charset="utf-8"></script>',
    '</body>',
    '</html>'
)

$BuildHtml = $HtmlLines -join "`r`n"

# Output
[System.IO.File]::WriteAllText($out_html, $BuildHtml, [System.Text.Encoding]::UTF8)
Write-Host "Successfully built! Output file created at: $out_html"

# Copy supabase.js if exists
$src_supabase = "$SrcDir\supabase.js"
$out_supabase = "$CurrentDir\supabase.js"
if (Test-Path $src_supabase) {
    Copy-Item $src_supabase $out_supabase -Force
    Write-Host "Copied supabase.js to output folder."
}
