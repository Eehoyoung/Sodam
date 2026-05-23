param(
    [string]$Device = "auto"
)

function Get-AdbPath
{
    $adb = "adb"
    try
    {
        $null = & $adb version 2> $null
        return $adb
    }
    catch
    {
        Write-Error "adb not found. Please ensure Android Platform Tools are installed and adb is in PATH."
        exit 1
    }
}

function Resolve-DeviceArg([string]$dev)
{
    if ($dev -eq "auto")
    {
        return @()
    }
    return @("-s", $dev)
}

$adb = Get-AdbPath
$deviceArgs = Resolve-DeviceArg $Device

& $adb @deviceArgs logcat -c
if ($LASTEXITCODE -eq 0)
{
    Write-Host "[RECOVERY] Cleared device logcat successfully."
}
else
{
    Write-Warning "[RECOVERY] Failed to clear logcat."
}
