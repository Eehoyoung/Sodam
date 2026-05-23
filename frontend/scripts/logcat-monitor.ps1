param(
    [string]$Device = "auto",
    [string]$Out = "logs\\session.log",
    [string]$Tags = "ReactNative|ReactNativeJS|AndroidRuntime|ActivityManager|libc|art|ReactNativeJNI|\[RECOVERY\]",
    [switch]$Append,
    [int]$TimeoutSec = 0
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

$adb = Get-AdbPath

function Resolve-DeviceArg([string]$dev)
{
    if ($dev -eq "auto")
    {
        return @()
    }
    return @("-s", $dev)
}

# Ensure output directory exists
$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir))
{
    New-Item -ItemType Directory -Path $dir | Out-Null
}

# Build filter regex for findstr
# findstr on Windows uses spaces to separate multiple search strings, so we pass /R for regex
$tagsRegex = $Tags

# Print session header
$sessionHeader = "[RECOVERY] Logcat session start $( Get-Date -Format o ) | Device=$Device | Tags=$Tags"
if ($Append)
{
    Add-Content -LiteralPath $Out -Value $sessionHeader
}
else
{
    Set-Content -LiteralPath $Out -Value $sessionHeader
}
Write-Host $sessionHeader

# Construct adb logcat command
$deviceArgs = Resolve-DeviceArg $Device

# Use PowerShell Start-Process with redirected output to avoid encoding issues
$arguments = @($deviceArgs + @("logcat"))

# Start logcat process
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $adb
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.Arguments = ($arguments -join ' ')
$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $psi
$proc.Start() | Out-Null

$startTime = Get-Date

try
{
    while (-not $proc.HasExited)
    {
        if ($TimeoutSec -gt 0)
        {
            $elapsed = (Get-Date) - $startTime
            if ($elapsed.TotalSeconds -ge $TimeoutSec)
            {
                break
            }
        }
        $line = $proc.StandardOutput.ReadLine()
        if ($null -ne $line)
        {
            if ($line -match $tagsRegex)
            {
                $tsLine = "$( Get-Date -Format o ) $line"
                Add-Content -LiteralPath $Out -Value $tsLine
                Write-Host $tsLine
            }
        }
        else
        {
            Start-Sleep -Milliseconds 50
        }
    }
}
finally
{
    if (-not $proc.HasExited)
    {
        $proc.Kill()
    }
    $footer = "[RECOVERY] Logcat session end $( Get-Date -Format o )"
    Add-Content -LiteralPath $Out -Value $footer
    Write-Host $footer
}
