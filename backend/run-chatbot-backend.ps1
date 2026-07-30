# Supervisor for RIK RAG chatbot backend (.31). IDEMPOTENT:
# if 8011 is already served by a healthy backend - do NOT start a rival (port race -> 502).
# Kills nobody. Just guarantees the port is served by exactly one uvicorn.
# NOTE: ASCII-only file! PS 5.1 parses UTF-8-no-BOM as ANSI and chokes on Cyrillic strings.
$ErrorActionPreference = 'SilentlyContinue'
$dir = 'C:\Users\user2\rik-chatbot-backend'
$py  = Join-Path $dir '.venv\Scripts\python.exe'
$log = Join-Path $dir 'chatbot-backend.log'
function Log($m){ Add-Content $log ("[" + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + "] " + $m) }

Set-Location $dir
# The RIK prod tooling sets user-level SUPABASE_* env vars pointing at the PROD project.
# config.py loads .env via setdefault, so inherited vars would silently win and RAG
# would query the wrong Supabase (404 match_rag_chunks). Drop them for THIS process only.
foreach ($v in 'SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ANON_KEY','SUPABASE_KEY') {
    if (Test-Path "Env:$v") { Remove-Item "Env:$v" }
}
Log "supervisor up (idempotent, ascii, supabase env scrubbed)"
while ($true) {
    $bound = Get-NetTCPConnection -LocalPort 8011 -State Listen -ErrorAction SilentlyContinue
    if ($bound) {
        Start-Sleep -Seconds 20
        continue
    }
    Log "8011 free - starting uvicorn"
    & $py -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8011 --log-level warning *>> $log
    Log "uvicorn exited, restart in 5s"
    Start-Sleep -Seconds 5
}
