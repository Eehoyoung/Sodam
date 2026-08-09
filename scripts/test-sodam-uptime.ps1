[CmdletBinding()]
param(
    [string]$HealthUrl = 'http://127.0.0.1:7070/actuator/health',
    [Parameter(Mandatory)]
    [string]$WebhookUrl,
    [int]$TimeoutSeconds = 10,
    [switch]$AllowInsecureLocalWebhook
)

$ErrorActionPreference = 'Stop'
$webhookUri = [uri]$WebhookUrl
if ($webhookUri.Scheme -ne 'https' -and -not (
        $AllowInsecureLocalWebhook -and $webhookUri.Scheme -eq 'http' -and
        $webhookUri.Host -in @('127.0.0.1', 'localhost', '::1'))) {
    throw '업타임 웹훅은 HTTPS여야 합니다. 로컬 전달 시험만 -AllowInsecureLocalWebhook을 사용하세요.'
}
$timestamp = (Get-Date).ToUniversalTime().ToString('o')
try {
    $response = Invoke-WebRequest -Uri $HealthUrl -TimeoutSec $TimeoutSeconds -UseBasicParsing
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        Write-Output "UPTIME_OK url=$HealthUrl status=$($response.StatusCode)"
        exit 0
    }
    throw "예상하지 않은 HTTP 상태 $($response.StatusCode)"
}
catch {
    # 수신 URL은 실행 시 주입한다. 웹훅 시크릿이나 수신자 정보는 저장소에 두지 않는다.
    $payload = @{
        event = 'sodam_uptime_failure'
        occurredAt = $timestamp
        healthUrl = $HealthUrl
        detail = $_.Exception.Message
    } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri $WebhookUrl -Method Post -ContentType 'application/json' -Body $payload | Out-Null
    [Console]::Error.WriteLine("UPTIME_ALERT_SENT url=$HealthUrl")
    exit 1
}
