# LYGO Talk Radio — mint written hours and publish them.
#
# 1. make sure the studio model answers on 127.0.0.1:8089 (starts it if not)
# 2. write N hours with scripts/mint_llm.py
# 3. publish: the radio repo (CDN mirror) and the excavationpro site (same-origin queue)
#
#   powershell -File scripts\mint-and-publish.ps1 -Count 2
#   Scheduled task "LYGO Talk Radio Mint" runs this every 3 hours, hidden.

param(
  [int]$Count = 2,
  [switch]$SkipPublish
)

$repo   = Split-Path -Parent $PSScriptRoot
$server = 'D:\LYGO_PROTOCOL_STACK\lygo_llm_console\engine\backends\cuda\llama-server.exe'
$model  = 'I:\LYGO_MODELS\MiMo-V2.6-Distill-Qwen-9B-Q4_K_M.gguf'
$python = 'C:\Python313\python.exe'
$git    = 'C:\Program Files\Git\cmd\git.exe'
$site   = 'C:\Users\justi\source\excavationpro-ca'
$log    = Join-Path $repo 'live\mint.log'

function Log([string]$msg) {
  $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -LiteralPath $log -Value $line -Encoding utf8
}

function Test-Model {
  try {
    $r = Invoke-WebRequest 'http://127.0.0.1:8089/health' -TimeoutSec 5 -UseBasicParsing
    return $r.StatusCode -eq 200
  } catch { return $false }
}

Log "start (count=$Count)"

if (-not (Test-Model)) {
  Log 'model not answering; starting llama-server'
  Start-Process -FilePath $server -WindowStyle Hidden -ArgumentList @(
    '-m', $model, '--port', '8089', '--host', '127.0.0.1', '-c', '8192', '-ngl', '99',
    '--no-webui', '--jinja'
  )
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 5
    if (Test-Model) { break }
  }
  if (-not (Test-Model)) { Log 'model failed to start'; exit 1 }
  Log 'model ready'
}

$queuePath = Join-Path $repo 'live\queue.json'
$before = (Get-FileHash -LiteralPath $queuePath -Algorithm SHA256).Hash

$out = & $python (Join-Path $repo 'scripts\mint_llm.py') --count $Count 2>&1
foreach ($line in $out) { Add-Content -LiteralPath $log -Value ("    " + $line) -Encoding utf8 }

$after = (Get-FileHash -LiteralPath $queuePath -Algorithm SHA256).Hash
if ($before -eq $after) { Log 'no new hour'; exit 0 }
Log 'queue changed; publishing'

if ($SkipPublish) { Log 'publish skipped'; exit 0 }

# --- the radio repo (the CDN mirror the studio also reads) ---
& $git -C $repo add live/queue.json live/heard.json
& $git -C $repo -c user.name='Justin Helmer' -c user.email='justin.prince@email.com' commit -q -m 'Mint the next written hours from the studio model.'
if ($LASTEXITCODE -ne 0) { Log 'radio repo: nothing to commit' }
& $git -C $repo push origin HEAD:main 2>&1 | ForEach-Object { Add-Content -LiteralPath $log -Value $_ -Encoding utf8 }
if ($LASTEXITCODE -eq 0) { Log 'radio repo pushed' } else { Log 'radio repo push FAILED' }

# --- the site (same-origin queue + Pages) ---
Copy-Item -LiteralPath $queuePath -Destination (Join-Path $site 'queue.json') -Force
Copy-Item -LiteralPath $queuePath -Destination (Join-Path $site 'talk-radio\queue.json') -Force
& $git -C $site add queue.json talk-radio/queue.json
& $git -C $site -c user.name='Justin Helmer' -c user.email='justin.prince@email.com' commit -q -m 'talk radio: the fresh written hours'
& $git -C $site fetch origin --quiet
& $git -C $site rebase origin/main 2>&1 | ForEach-Object { Add-Content -LiteralPath $log -Value $_ -Encoding utf8 }
& $git -C $site push origin HEAD:main 2>&1 | ForEach-Object { Add-Content -LiteralPath $log -Value $_ -Encoding utf8 }
if ($LASTEXITCODE -eq 0) { Log 'published to excavationpro.ca' } else { Log 'site push FAILED' }
Log 'done'
