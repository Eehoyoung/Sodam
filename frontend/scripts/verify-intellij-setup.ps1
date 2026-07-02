param(
    [string]$ProjectRoot = "$PSScriptRoot\..",
    [string]$Out = "$PSScriptRoot\..\logs\intellij-verify.log"
)

$ErrorActionPreference = 'Stop'

function Write-Log
{
    param([string]$Message)
    $timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $line = "[$timestamp] $Message"
    Write-Host $line
    Add-Content -Path $Out -Value $line
}

try
{
    # Ensure log directory exists
    $outDir = Split-Path -Parent $Out
    if (!(Test-Path $outDir))
    {
        New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    }
    if (Test-Path $Out)
    {
        Remove-Item $Out -Force
    }
    New-Item -ItemType File -Force -Path $Out | Out-Null

    Write-Log "IntelliJ Project Setup Verification - Start"
    Write-Log "ProjectRoot: $ProjectRoot"

    $imlPath = Join-Path $ProjectRoot 'Sodam_Front_End.iml'
    if (!(Test-Path $imlPath))
    {
        throw "Missing module file: $imlPath"
    }

    [xml]$iml = Get-Content $imlPath

    $moduleType = $iml.module.type
    $content = $iml.module.component.content
    $sourceFolders = @($content.sourceFolder)
    $excludeFolders = @($content.excludeFolder)

    $ok = $true
    $advice = @()

    # 1) Module type
    if ($moduleType -ne 'WEB_MODULE')
    {
        $ok = $false; Write-Log "[FAIL] Module type is '$moduleType' (expected 'WEB_MODULE')"
    }
    else
    {
        Write-Log "[OK] Module type: WEB_MODULE"
    }

    # 2) Source roots
    $srcOk = $sourceFolders | Where-Object { $_.url -match '/src$' -and $_.isTestSource -eq $false }
    if ($null -eq $srcOk)
    {
        $ok = $false; Write-Log "[FAIL] Missing main source root: src"
    }
    else
    {
        Write-Log "[OK] Source root includes: src"
    }

    $testsOk = $sourceFolders | Where-Object { $_.url -match '/__tests__$' -and $_.isTestSource -eq $true }
    if ($null -eq $testsOk)
    {
        $advice += 'Consider marking __tests__ as Test Sources in IntelliJ.'; Write-Log "[ADVICE] __tests__ not marked as Test Sources"
    }
    else
    {
        Write-Log "[OK] Test source root includes: __tests__"
    }

    $testScriptsOk = $sourceFolders | Where-Object { $_.url -match '/test-scripts$' -and $_.isTestSource -eq $true }
    if ($null -eq $testScriptsOk)
    {
        $advice += 'Optionally mark test-scripts as Test Sources (if used for tests).'; Write-Log "[INFO] test-scripts not marked as Test Sources (optional)"
    }
    else
    {
        Write-Log "[OK] Test source root includes: test-scripts"
    }

    # 3) Excludes - recommend out, logs, .expo, coverage
    $excludedUrls = @($excludeFolders | ForEach-Object { $_.url })

    $recommendExcludes = @('out', 'logs', '.expo', 'coverage')
    foreach ($name in $recommendExcludes)
    {
        $path = "file://$($ProjectRoot.Replace('\\', '/') )/$name"
        $has = $excludedUrls | Where-Object { $_ -eq $path }
        if ($null -eq $has -and (Test-Path (Join-Path $ProjectRoot $name)))
        {
            $advice += "Mark '$name' as Excluded in IntelliJ (reduces indexing & inspections)."
            Write-Log "[ADVICE] Consider excluding: $name"
        }
    }

    # 4) Config presence checks
    $checks = @(
        @{ Path = 'tsconfig.json'; Desc = 'TypeScript config'; Mandatory = $true },
        @{ Path = 'jest.config.js'; Desc = 'Jest config'; Mandatory = $true },
        @{ Path = 'jest.setup.js'; Desc = 'Jest setup'; Mandatory = $true },
        @{ Path = 'metro.config.js'; Desc = 'Metro config'; Mandatory = $true },
        @{ Path = 'react-native.config.js'; Desc = 'React Native config'; Mandatory = $true }
    )

    foreach ($c in $checks)
    {
        $p = Join-Path $ProjectRoot $c.Path
        if (Test-Path $p)
        {
            Write-Log "[OK] $( $c.Desc ) found: $( $c.Path )"
        }
        else
        {
            if ($c.Mandatory)
            {
                $ok = $false; Write-Log "[FAIL] Missing $( $c.Desc ): $( $c.Path )"
            }
            else
            {
                Write-Log "[INFO] Optional missing: $( $c.Path )"
            }
        }
    }

    # 5) Quick content checks
    $tsPath = Join-Path $ProjectRoot 'tsconfig.json'
    if (Test-Path $tsPath)
    {
        $ts = (Get-Content $tsPath -Raw) | ConvertFrom-Json
        if ($ts.include -notcontains 'src/**/*')
        {
            $advice += 'tsconfig.json should include src/**/* for IDE type-check.'; Write-Log "[ADVICE] tsconfig include does not contain src/**/*"
        }
        if ($ts.exclude -contains 'android' -and $ts.exclude -contains 'ios')
        {
            Write-Log "[OK] tsconfig excludes native folders (android, ios)."
        }
        else
        {
            $advice += 'Exclude android and ios from tsconfig to reduce noise.'; Write-Log "[ADVICE] Consider excluding android/ios in tsconfig.json"
        }
    }

    $jestPath = Join-Path $ProjectRoot 'jest.config.js'
    if (Test-Path $jestPath)
    {
        $jestText = Get-Content $jestPath -Raw
        if ($jestText -match "preset:\s*'react-native'")
        {
            Write-Log "[OK] jest preset is react-native"
        }
        else
        {
            $advice += 'Use react-native preset in Jest for RN projects.'; Write-Log "[ADVICE] Jest preset not react-native"
        }
    }

    # Summary
    if ($ok)
    {
        Write-Log "[SUMMARY] IntelliJ module settings appear CORRECT."
    }
    else
    {
        Write-Log "[SUMMARY] Issues detected. See FAIL items above."
    }

    if ($advice.Count -gt 0)
    {
        Write-Log "[ADVICE_SUMMARY]"
        $advice | Select-Object -Unique | ForEach-Object { Write-Log " - $_" }
    }
    else
    {
        Write-Log "[ADVICE_SUMMARY] No additional recommendations."
    }

    Write-Log "IntelliJ Project Setup Verification - End"
}
catch
{
    Write-Host "[ERROR] $( $_.Exception.Message )" -ForegroundColor Red
    Add-Content -Path $Out -Value "[ERROR] $( $_.Exception.Message )"
    exit 1
}
