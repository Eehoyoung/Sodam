# Improved Comprehensive Dependency Analysis Script for Sodam Front End
# Fixes import path resolution issues and provides accurate unused file detection

$srcPath = "src"
$outputFile = "dependency-analysis-improved-report.md"

# Get all TypeScript/JavaScript files (excluding tests and documentation)
$allFiles = Get-ChildItem -Path $srcPath -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | Where-Object {
    $_.Name -notlike "*.test.*" -and
            $_.Name -notlike "*.spec.*" -and
            $_.Name -ne "PHASE_1_COMPLETION_SUMMARY.md"
}

# Also include App.tsx from root
$appFile = Get-Item "App.tsx" -ErrorAction SilentlyContinue
if ($appFile)
{
    $allFiles = @($appFile) + $allFiles
}

# Initialize data structures
$fileUsage = @{ }
$allFilePaths = @()

Write-Host "Analyzing $( $allFiles.Count ) files..." -ForegroundColor Green

# Function to normalize path
function Normalize-Path($path)
{
    return $path.Replace("\", "/")
}

# Function to resolve import path
function Resolve-ImportPath($currentFilePath, $importPath)
{
    # Handle absolute imports (node_modules, etc.)
    if (-not ($importPath.StartsWith("./") -or $importPath.StartsWith("../")))
    {
        return $null
    }

    # Get current file directory
    $currentDir = Split-Path $currentFilePath -Parent
    if (-not $currentDir)
    {
        $currentDir = "."
    }

    # Resolve relative path
    $resolvedPath = Join-Path $currentDir $importPath
    $resolvedPath = Normalize-Path $resolvedPath

    # Try different extensions
    $possiblePaths = @(
        "$resolvedPath.ts",
        "$resolvedPath.tsx",
        "$resolvedPath.js",
        "$resolvedPath.jsx",
        "$resolvedPath/index.ts",
        "$resolvedPath/index.tsx",
        "$resolvedPath/index.js"
    )

    foreach ($possiblePath in $possiblePaths)
    {
        if ($allFilePaths -contains $possiblePath)
        {
            return $possiblePath
        }
    }

    return $null
}

# Initialize all files as unused
foreach ($file in $allFiles)
{
    if ($file.Name -eq "App.tsx")
    {
        $relativePath = "App.tsx"
    }
    else
    {
        $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
    }

    $allFilePaths += $relativePath
    $fileUsage[$relativePath] = @{
        ImportedBy = @()
        Imports = @()
        Exports = @()
        IsUsed = $false
    }
}

Write-Host "File paths initialized: $( $allFilePaths.Count )" -ForegroundColor Cyan

# Analyze each file
foreach ($file in $allFiles)
{
    if ($file.Name -eq "App.tsx")
    {
        $relativePath = "App.tsx"
    }
    else
    {
        $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
    }

    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue

    if (-not $content)
    {
        continue
    }

    Write-Host "Analyzing: $relativePath" -ForegroundColor Yellow

    # Improved regex for imports - handles various import patterns
    $importPatterns = @(
        "import\s+\w+\s+from\s+[`"']([^`"']+)[`"']", # import Something from 'path'
        "import\s+\{\s*[^}]+\s*\}\s+from\s+[`"']([^`"']+)[`"']", # import { Something } from 'path'
        "import\s+\*\s+as\s+\w+\s+from\s+[`"']([^`"']+)[`"']", # import * as Something from 'path'
        "import\s+\w+\s*,\s*\{\s*[^}]+\s*\}\s+from\s+[`"']([^`"']+)[`"']", # import Default, { Named } from 'path'
        "import\s+[`"']([^`"']+)[`"']"                                  # import 'path'
    )

    foreach ($pattern in $importPatterns)
    {
        $imports = [regex]::Matches($content, $pattern)

        foreach ($match in $imports)
        {
            $importPath = $match.Groups[1].Value
            $resolvedPath = Resolve-ImportPath $relativePath $importPath

            if ($resolvedPath)
            {
                $fileUsage[$relativePath].Imports += $resolvedPath
                $fileUsage[$resolvedPath].ImportedBy += $relativePath
                $fileUsage[$resolvedPath].IsUsed = $true
                Write-Host "  -> Found import: $importPath -> $resolvedPath" -ForegroundColor Green
            }
        }
    }

    # Extract exports with improved patterns
    $exportPatterns = @(
        "export\s+default\s+(?:class|function|const|let|var)?\s*(\w+)?",
        "export\s+(?:class|function|const|let|var|interface|type|enum)\s+(\w+)",
        "export\s+\{\s*([^}]+)\s*\}",
        "export\s+\*\s+from"
    )

    foreach ($pattern in $exportPatterns)
    {
        $exports = [regex]::Matches($content, $pattern)

        foreach ($match in $exports)
        {
            if ($match.Groups[1].Success)
            {
                $exportName = $match.Groups[1].Value.Trim()
                if ($exportName -and $exportName -ne "")
                {
                    $fileUsage[$relativePath].Exports += $exportName
                }
            }
        }
    }

    # Check for default exports
    if ($content -match "export\s+default")
    {
        if (-not ($fileUsage[$relativePath].Exports -contains "default"))
        {
            $fileUsage[$relativePath].Exports += "default"
        }
    }
}

# Mark entry points as used
$entryPoints = @(
    "App.tsx",
    "src/navigation/AppNavigator.tsx",
    "src/navigation/AuthNavigator.tsx",
    "src/navigation/HomeNavigator.tsx"
)

foreach ($entryPoint in $entryPoints)
{
    if ( $fileUsage.ContainsKey($entryPoint))
    {
        $fileUsage[$entryPoint].IsUsed = $true
        Write-Host "Marked entry point as used: $entryPoint" -ForegroundColor Magenta
    }
}

# Propagate usage through dependency chain (iterative approach)
$changed = $true
$iterations = 0
while ($changed -and $iterations -lt 10)
{
    $changed = $false
    $iterations++
    Write-Host "Propagation iteration $iterations..." -ForegroundColor Cyan

    foreach ($file in $fileUsage.Keys)
    {
        if ($fileUsage[$file].IsUsed)
        {
            foreach ($importedFile in $fileUsage[$file].Imports)
            {
                if (-not $fileUsage[$importedFile].IsUsed)
                {
                    $fileUsage[$importedFile].IsUsed = $true
                    $changed = $true
                    Write-Host "  Marked as used: $importedFile" -ForegroundColor Green
                }
            }
        }
    }
}

# Generate improved report
$usedFiles = ($fileUsage.Values | Where-Object { $_.IsUsed }).Count
$unusedFiles = $fileUsage.GetEnumerator() | Where-Object { -not $_.Value.IsUsed } | Sort-Object Name

$report = @"
# Sodam Front End - Improved Dependency Analysis Report
Generated: $( Get-Date -Format "yyyy-MM-dd HH:mm:ss" )

## Summary
- Total files analyzed: $( $allFiles.Count )
- Used files: $usedFiles
- Unused files: $( $unusedFiles.Count )
- Dependency propagation iterations: $iterations

## Unused Files (Candidates for Deletion)

"@

foreach ($unused in $unusedFiles)
{
    $report += "`n- ``$( $unused.Key )``"
    if ($unused.Value.Exports.Count -gt 0)
    {
        $report += " (exports: $( $unused.Value.Exports -join ', ' ))"
    }
}

$report += @"

## Critical Issues Identified

### 1. Documentation in Source Code
- ``src/utils/animations/PHASE_1_COMPLETION_SUMMARY.md`` - Should be moved out of src/

### 2. Potential Duplicate Functionality

#### Theme Systems
- ``src/theme/theme.ts`` - Currently used by App.tsx
- ``src/common/styles/theme.tsx`` - $( if ($fileUsage['src/common/styles/theme.tsx'].IsUsed)
{
    'USED'
}
else
{
    'UNUSED - candidate for deletion'
} )

#### Animation Components
- ``src/common/components/animations/`` - $( if ($fileUsage['src/common/components/animations/JSISafeAnimations.tsx'].IsUsed)
{
    'USED'
}
else
{
    'UNUSED'
} )
- ``src/components/animations/`` - $( if ($fileUsage['src/components/animations/JSISafeAnimatedComponents.tsx'].IsUsed)
{
    'USED'
}
else
{
    'UNUSED'
} )

#### AuthContext Systems
- ``src/contexts/AuthContext.tsx`` - $( if ($fileUsage['src/contexts/AuthContext.tsx'].IsUsed)
{
    'USED (legacy)'
}
else
{
    'UNUSED'
} )
- ``src/contexts/auth/`` directory - $( if ($fileUsage['src/contexts/auth/providers/AuthProvider.tsx'].IsUsed)
{
    'USED (new structure)'
}
else
{
    'UNUSED'
} )

## Used Files Analysis

### Entry Points
"@

foreach ($entryPoint in $entryPoints)
{
    if ( $fileUsage.ContainsKey($entryPoint))
    {
        $status = if ($fileUsage[$entryPoint].IsUsed)
        {
            "[USED]"
        }
        else
        {
            "[UNUSED]"
        }
        $report += "`n- ``$entryPoint`` - $status"
    }
}

$report += @"

### Navigation Layer
"@

$navFiles = $fileUsage.Keys | Where-Object { $_ -like "*navigation*" } | Sort-Object
foreach ($navFile in $navFiles)
{
    $status = if ($fileUsage[$navFile].IsUsed)
    {
        "[USED]"
    }
    else
    {
        "[UNUSED]"
    }
    $report += "`n- $status ``$navFile``"
}

$report += @"

### Feature Modules Usage
"@

$features = @("attendance", "auth", "home", "info", "myPage", "qna", "salary", "subscription", "welcome", "workplace")
foreach ($feature in $features)
{
    $featureFiles = $fileUsage.Keys | Where-Object { $_ -like "*features/$feature*" }
    $usedCount = ($featureFiles | Where-Object { $fileUsage[$_].IsUsed }).Count
    $totalCount = $featureFiles.Count

    $report += "`n- **$feature**: $usedCount/$totalCount files used"
}

$report += @"

## Recommendations

### Immediate Actions (High Priority)
1. **Remove documentation from src/**: Move ``PHASE_1_COMPLETION_SUMMARY.md`` out of source code
2. **Delete unused files**: Remove the $( $unusedFiles.Count ) unused files listed above
3. **Consolidate theme systems**: Choose between ``src/theme/theme.ts`` and ``src/common/styles/theme.tsx``
4. **Consolidate animation components**: Merge or choose between the two animation directories

### Code Organization (Medium Priority)
1. **Standardize index.ts exports**: Ensure all feature directories have proper index.ts files
2. **Review AuthContext migration**: Complete migration from legacy to new AuthContext structure
3. **Service layer consolidation**: Review service files for potential merging opportunities

### Architecture Improvements (Low Priority)
1. **Feature module isolation**: Ensure features don't directly import from each other
2. **Common component usage**: Increase reuse of common components across features
3. **Type definition consolidation**: Review and consolidate type definitions

## Detailed File Analysis

"@

foreach ($file in ($fileUsage.GetEnumerator() | Sort-Object Name))
{
    $status = if ($file.Value.IsUsed)
    {
        "[USED]"
    }
    else
    {
        "[UNUSED]"
    }
    $report += "`n### $( $file.Key ) - $status`n"

    if ($file.Value.ImportedBy.Count -gt 0)
    {
        $report += "- **Imported by**: $( $file.Value.ImportedBy -join ', ' )`n"
    }

    if ($file.Value.Imports.Count -gt 0)
    {
        $report += "- **Imports**: $( $file.Value.Imports -join ', ' )`n"
    }

    if ($file.Value.Exports.Count -gt 0)
    {
        $report += "- **Exports**: $( $file.Value.Exports -join ', ' )`n"
    }
}

# Write report to file
$report | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "`nImproved analysis complete!" -ForegroundColor Green
Write-Host "Report saved to: $outputFile" -ForegroundColor Green
Write-Host "Used files: $usedFiles" -ForegroundColor Green
Write-Host "Unused files: $( $unusedFiles.Count )" -ForegroundColor Red

if ($unusedFiles.Count -gt 0)
{
    Write-Host "`nTop unused files:" -ForegroundColor Yellow
    $unusedFiles | Select-Object -First 10 | ForEach-Object {
        Write-Host "  - $( $_.Key )" -ForegroundColor Red
    }
}
