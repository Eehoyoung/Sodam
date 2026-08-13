[CmdletBinding()]
param(
    [string]$BackupDirectory = (Join-Path $PSScriptRoot '..\artifacts\db-backups'),
    [string]$MySqlContainer = 'sodam-mysql'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupId = [guid]::NewGuid().ToString('N')
$resolvedBackupDirectory = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($BackupDirectory)
New-Item -ItemType Directory -Force -Path $resolvedBackupDirectory | Out-Null
$backupFile = Join-Path $resolvedBackupDirectory "sodam-$timestamp-$backupId.sql"
$containerFile = "/tmp/sodam-backup-$timestamp-$backupId.sql"

Push-Location $projectRoot
try {
    # 비밀번호는 컨테이너 환경변수 안에서만 확장한다. SQL은 컨테이너 파일로 먼저 만들고 docker cp로
    # 옮겨 PowerShell 5.1의 텍스트 인코딩/파이프 변환으로 백업 바이트가 바뀌지 않게 한다.
    & docker exec $MySqlContainer sh -c "exec mysqldump --host=127.0.0.1 --single-transaction --routines --events --no-tablespaces -u`"`$MYSQL_USER`" -p`"`$MYSQL_PASSWORD`" `"`$MYSQL_DATABASE`" > $containerFile"
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL 백업 명령이 실패했습니다. exit=$LASTEXITCODE"
    }
    & docker cp "${MySqlContainer}:$containerFile" $backupFile
    if ($LASTEXITCODE -ne 0) {
        throw "백업 파일 복사에 실패했습니다. exit=$LASTEXITCODE"
    }
    if ((Get-Item -LiteralPath $backupFile).Length -eq 0) {
        throw '빈 백업 파일이 생성되어 안전하지 않습니다.'
    }
    Write-Output "BACKUP_OK $backupFile"
}
catch {
    if (Test-Path -LiteralPath $backupFile) {
        Remove-Item -LiteralPath $backupFile -Force
    }
    throw
}
finally {
    & docker exec $MySqlContainer rm -f $containerFile | Out-Null
    Pop-Location
}
