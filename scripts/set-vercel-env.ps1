param(
  [Parameter(Mandatory = $true)]
  [string]$Scope,
  [Parameter(Mandatory = $true)]
  [string]$MongoDatabaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$TelegramBotToken,
  [Parameter(Mandatory = $false)]
  [string]$BackendProject = "bottele-backend",
  [Parameter(Mandatory = $false)]
  [string]$BotProject = "bottele-bot",
  [Parameter(Mandatory = $false)]
  [string]$MiniAppProject = "bottele-mini-app",
  [Parameter(Mandatory = $false)]
  [string]$AdminProject = "bottele-admin"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$botDir = Join-Path $root "bot"
$miniAppDir = Join-Path $root "mini-app"
$adminDir = Join-Path $root "admin"

function New-HexSecret([int]$bytes = 32) {
  $buf = New-Object byte[] $bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($buf)
  }
  finally {
    $rng.Dispose()
  }
  return ([System.BitConverter]::ToString($buf) -replace "-", "").ToLower()
}

function Upsert-VercelEnv {
  param(
    [Parameter(Mandatory = $true)][string]$ProjectDir,
    [Parameter(Mandatory = $true)][string]$ProjectName,
    [Parameter(Mandatory = $true)][string]$Key,
    [Parameter(Mandatory = $true)][string]$Value
  )

  Push-Location $ProjectDir
  try {
    vercel link --yes --scope $Scope --project $ProjectName | Out-Null
    vercel env rm $Key production --yes --scope $Scope | Out-Null 2>$null
    vercel env add $Key production --yes --scope $Scope --value $Value | Out-Null
    Write-Host "[$ProjectName] $Key updated"
  }
  finally {
    Pop-Location
  }
}

$jwtSecret = New-HexSecret 32
$botApiKey = New-HexSecret 32
$webhookSecret = New-HexSecret 16
$setupKey = New-HexSecret 16
$adminSessionValue = New-HexSecret 24

$adminPayload = @{
  userId = "vercel-admin"
  role   = "ADMIN"
}
$adminTokenHeader = @{ alg = "HS256"; typ = "JWT" }

function ConvertTo-Base64Url([byte[]]$bytes) {
  $text = [System.Convert]::ToBase64String($bytes).TrimEnd("=") -replace "\+", "-" -replace "/", "_"
  return $text
}

function New-JwtHs256 {
  param(
    [hashtable]$Header,
    [hashtable]$Payload,
    [string]$Secret
  )
  $headerJson = ($Header | ConvertTo-Json -Compress)
  $payloadJson = ($Payload | ConvertTo-Json -Compress)
  $headerB64 = ConvertTo-Base64Url ([System.Text.Encoding]::UTF8.GetBytes($headerJson))
  $payloadB64 = ConvertTo-Base64Url ([System.Text.Encoding]::UTF8.GetBytes($payloadJson))
  $unsigned = "$headerB64.$payloadB64"
  $hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($Secret))
  try {
    $sigBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($unsigned))
  }
  finally {
    $hmac.Dispose()
  }
  $sigB64 = ConvertTo-Base64Url $sigBytes
  return "$unsigned.$sigB64"
}

$adminPayload.exp = [int]([DateTimeOffset]::UtcNow.AddYears(5).ToUnixTimeSeconds())
$adminToken = New-JwtHs256 -Header $adminTokenHeader -Payload $adminPayload -Secret $jwtSecret

Write-Host "Updating backend env..."
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "NODE_ENV" -Value "production"
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "DATABASE_URL" -Value $MongoDatabaseUrl
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "JWT_SECRET" -Value $jwtSecret
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "JWT_EXPIRES_IN" -Value "30d"
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "BACKEND_PORT" -Value "4000"
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "SOCKET_ENABLED" -Value "false"
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "TELEGRAM_LOGIN_REQUIRED" -Value "false"
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "TELEGRAM_INITDATA_MAX_AGE_SECONDS" -Value "86400"
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "CORS_ORIGIN" -Value "https://$MiniAppProject.vercel.app,https://$AdminProject.vercel.app"
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "SOCKET_CORS_ORIGIN" -Value "https://$MiniAppProject.vercel.app,https://$AdminProject.vercel.app"
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "RATE_LIMIT_WINDOW_MS" -Value "60000"
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "RATE_LIMIT_MAX" -Value "120"
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "TELEGRAM_BOT_TOKEN" -Value $TelegramBotToken
Upsert-VercelEnv -ProjectDir $backendDir -ProjectName $BackendProject -Key "BOT_API_KEY" -Value $botApiKey

Write-Host "Updating bot env..."
Upsert-VercelEnv -ProjectDir $botDir -ProjectName $BotProject -Key "TELEGRAM_BOT_TOKEN" -Value $TelegramBotToken
Upsert-VercelEnv -ProjectDir $botDir -ProjectName $BotProject -Key "TELEGRAM_WEBAPP_URL" -Value "https://$MiniAppProject.vercel.app"
Upsert-VercelEnv -ProjectDir $botDir -ProjectName $BotProject -Key "BACKEND_URL" -Value "https://$BackendProject.vercel.app"
Upsert-VercelEnv -ProjectDir $botDir -ProjectName $BotProject -Key "BOT_API_KEY" -Value $botApiKey
Upsert-VercelEnv -ProjectDir $botDir -ProjectName $BotProject -Key "BOT_RUN_MODE" -Value "webhook"
Upsert-VercelEnv -ProjectDir $botDir -ProjectName $BotProject -Key "TELEGRAM_WEBHOOK_URL" -Value "https://$BotProject.vercel.app/api/webhook"
Upsert-VercelEnv -ProjectDir $botDir -ProjectName $BotProject -Key "TELEGRAM_WEBHOOK_SECRET" -Value $webhookSecret
Upsert-VercelEnv -ProjectDir $botDir -ProjectName $BotProject -Key "BOT_SETUP_KEY" -Value $setupKey
Upsert-VercelEnv -ProjectDir $botDir -ProjectName $BotProject -Key "DEFAULT_LANGUAGE" -Value "ar"

Write-Host "Updating mini-app env..."
Upsert-VercelEnv -ProjectDir $miniAppDir -ProjectName $MiniAppProject -Key "VITE_API_URL" -Value "https://$BackendProject.vercel.app/api"
Upsert-VercelEnv -ProjectDir $miniAppDir -ProjectName $MiniAppProject -Key "VITE_SOCKET_URL" -Value "https://$BackendProject.vercel.app"
Upsert-VercelEnv -ProjectDir $miniAppDir -ProjectName $MiniAppProject -Key "VITE_DISABLE_SOCKET" -Value "true"
Upsert-VercelEnv -ProjectDir $miniAppDir -ProjectName $MiniAppProject -Key "VITE_TON_MANIFEST_URL" -Value "https://$MiniAppProject.vercel.app/tonconnect-manifest.json"

Write-Host "Updating admin env..."
Upsert-VercelEnv -ProjectDir $adminDir -ProjectName $AdminProject -Key "BACKEND_URL" -Value "https://$BackendProject.vercel.app"
Upsert-VercelEnv -ProjectDir $adminDir -ProjectName $AdminProject -Key "ADMIN_TOKEN" -Value $adminToken
Upsert-VercelEnv -ProjectDir $adminDir -ProjectName $AdminProject -Key "NEXT_PUBLIC_SOCKET_URL" -Value "https://$BackendProject.vercel.app"
Upsert-VercelEnv -ProjectDir $adminDir -ProjectName $AdminProject -Key "NEXT_PUBLIC_DISABLE_SOCKET" -Value "true"
Upsert-VercelEnv -ProjectDir $adminDir -ProjectName $AdminProject -Key "ADMIN_PANEL_USERNAME" -Value "alifakarr"
Upsert-VercelEnv -ProjectDir $adminDir -ProjectName $AdminProject -Key "ADMIN_PANEL_PASSWORD" -Value "Aliliwaa00"
Upsert-VercelEnv -ProjectDir $adminDir -ProjectName $AdminProject -Key "ADMIN_SESSION_VALUE" -Value $adminSessionValue

Write-Host ""
Write-Host "Done. Now redeploy all projects in Vercel."
Write-Host "Then register Telegram webhook with:"
Write-Host "POST https://$BotProject.vercel.app/api/setup?key=$setupKey"
