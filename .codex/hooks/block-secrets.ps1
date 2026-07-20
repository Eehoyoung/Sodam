$ErrorActionPreference = "Stop"

$inputText = [Console]::In.ReadToEnd()
$filePath = $null

try {
    $payload = $inputText | ConvertFrom-Json
    if ($payload.tool_input.file_path) {
        $filePath = [string]$payload.tool_input.file_path
    } elseif ($payload.file_path) {
        $filePath = [string]$payload.file_path
    }
} catch {
    # Free-form tool payloads are still scanned for secret values below.
}

if ($filePath -and $filePath -notmatch '\.env\.(example|sample)$') {
    $name = [IO.Path]::GetFileName($filePath)
    if ($name -eq ".env" -or $name -like ".env.*" -or $filePath -match '(^|[\\/])[^\\/]+\.env$') {
        [Console]::Error.WriteLine("차단: .env 파일은 커밋 대상 저장소에 직접 쓰지 않는다 (.claude/rules/security.md).")
        exit 2
    }
}

$secretPattern = 'live_sk_[A-Za-z0-9]{10,}|live_ck_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{36}|sk-ant-[A-Za-z0-9-]{20,}'
if ($inputText -match $secretPattern) {
    [Console]::Error.WriteLine("차단: 실 시크릿 패턴이 감지됐다. 시크릿은 환경변수로 주입한다.")
    exit 2
}

exit 0
