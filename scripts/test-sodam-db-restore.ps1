[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$BackupFile,
    [string]$MySqlContainer = 'sodam-mysql'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$verificationDatabase = 'sodam_restore_verify_' + [guid]::NewGuid().ToString('N').Substring(0, 12)
if ($verificationDatabase -notmatch '^sodam_restore_verify_[a-f0-9]{12}$') {
    throw '검증 DB 이름 형식이 안전하지 않습니다.'
}
$containerFile = "/tmp/$verificationDatabase.sql"

function Invoke-MySqlInContainer([string]$command) {
    & docker exec $MySqlContainer sh -c $command
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL 명령이 실패했습니다. exit=$LASTEXITCODE"
    }
}

Push-Location $projectRoot
try {
    # 운영 DB에는 절대 restore하지 않는다. 일회성 검증 DB만 생성하고 마지막에 제거한다.
    Invoke-MySqlInContainer ('mysqladmin -uroot -p"$MYSQL_ROOT_PASSWORD" create ' + $verificationDatabase)
    & docker cp $BackupFile "${MySqlContainer}:$containerFile"
    if ($LASTEXITCODE -ne 0) {
        throw "컨테이너로 백업 파일 복사에 실패했습니다. exit=$LASTEXITCODE"
    }
    Invoke-MySqlInContainer ('mysql -uroot -p"$MYSQL_ROOT_PASSWORD" ' + $verificationDatabase + ' < ' + $containerFile)
    $tableNames = @(& docker exec $MySqlContainer sh -c ('mysql -N -uroot -p"$MYSQL_ROOT_PASSWORD" ' + $verificationDatabase + ' -e "SHOW TABLES"'))
    $tableCount = $tableNames.Count
    if ($LASTEXITCODE -ne 0 -or $tableCount -le 0) {
        throw '복원 검증 DB에 테이블이 없습니다.'
    }
    Write-Output "RESTORE_VERIFY_OK database=$verificationDatabase tables=$tableCount"
}
finally {
    & docker exec $MySqlContainer sh -c ('mysqladmin -uroot -p"$MYSQL_ROOT_PASSWORD" drop --force ' + $verificationDatabase) | Out-Null
    & docker exec $MySqlContainer rm -f $containerFile | Out-Null
    Pop-Location
}
