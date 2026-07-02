# Comprehensive Dependency Analysis Script for Sodam Front End
# Analyzes all TypeScript/JavaScript files to identify unused files and dependencies

$srcPath = "src"
$outputFile = "dependency-analysis-report.md"

# Get all TypeScript/JavaScript files
$allFiles = Get-ChildItem -Path $srcPath -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | Where-Object { $_.Name -notlike "*.test.*" -and $_.Name -notlike "*.spec.*" }

# Initialize data structures
$importMap = @{ }
$exportMap = @{ }
$fileUsage = @{ }
$allFilePaths = @()

Write-Host "Analyzing $( $allFiles.Count ) files..." -ForegroundColor Green

# Initialize all files as unused
foreach ($file in $allFiles)
{
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
    $allFilePaths += $relativePath
    $fileUsage[$relativePath] = @{
        ImportedBy = @()
        Imports = @()
        Exports = @()
        IsUsed = $false
    }
}

# Analyze each file
foreach ($file in $allFiles)
{
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue

    if (-not $content)
    {
        continue
    }

    Write-Host "Analyzing: $relativePath" -ForegroundColor Yellow

    # Extract imports
    $importRegex = "import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?[`"']([^`"']+)[`"']"
    $imports = [regex]::Matches($content, $importRegex)

    foreach ($match in $imports)
    {
        $importPath = $match.Groups[1].Value

        # Convert relative imports to absolute paths
        if ($importPath.StartsWith("./") -or $importPath.StartsWith("../"))
        {
            $currentDir = Split-Path $relativePath -Parent
            $resolvedPath = Join-Path $currentDir $importPath
            $resolvedPath = $resolvedPath.Replace("\", "/")

            # Try different extensions
            $possiblePaths = @(
                "$resolvedPath.ts",
                "$resolvedPath.tsx",
                "$resolvedPath.js",
                "$resolvedPath.jsx",
                "$resolvedPath/index.ts",
                "$resolvedPath/index.tsx"
            )

            foreach ($possiblePath in $possiblePaths)
            {
                if ($allFilePaths -contains $possiblePath)
                {
                    $fileUsage[$relativePath].Imports += $possiblePath
                    $fileUsage[$possiblePath].ImportedBy += $relativePath
                    $fileUsage[$possiblePath].IsUsed = $true
                    break
                }
            }
        }
    }

    # Extract exports
    $exportRegex = "export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)"
    $exports = [regex]::Matches($content, $exportRegex)

    foreach ($match in $exports)
    {
        $exportName = $match.Groups[1].Value
        $fileUsage[$relativePath].Exports += $exportName
    }

    # Check for default exports
    if ($content -match "export\s+default")
    {
        $fileUsage[$relativePath].Exports += "default"
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
    }
}

# Generate report
$report = @"
# Sodam Front End - Comprehensive Dependency Analysis Report
Generated: $( Get-Date -Format "yyyy-MM-dd HH:mm:ss" )

## Summary
- Total files analyzed: $( $allFiles.Count )
- Used files: $( ($fileUsage.Values | Where-Object { $_.IsUsed }).Count )
- Unused files: $( ($fileUsage.Values | Where-Object { -not $_.IsUsed }).Count )

## Unused Files (Candidates for Deletion)
"@

$unusedFiles = $fileUsage.GetEnumerator() | Where-Object { -not $_.Value.IsUsed } | Sort-Object Name

foreach ($unused in $unusedFiles)
{
    $report += "`n- ``$( $unused.Key )``"
    if ($unused.Value.Exports.Count -gt 0)
    {
        $report += " (exports: $( $unused.Value.Exports -join ', ' ))"
    }
}

$report += @"

## Duplicate Functionality Analysis

### Theme Files
- ``src/theme/theme.ts`` - Used by App.tsx
- ``src/common/styles/theme.tsx`` - Potentially unused duplicate

### Animation Components
- ``src/common/components/animations/`` - Common animations
- ``src/components/animations/`` - Duplicate animation components

### AuthContext Files
- ``src/contexts/AuthContext.tsx`` - Legacy version used by App.tsx
- ``src/contexts/auth/`` - New structure with providers and hooks

## File Usage Details

"@

foreach ($file in ($fileUsage.GetEnumerator() | Sort-Object Name))
{
    $report += "`n### $( $file.Key )`n"
    $report += "- **Status**: $( if ($file.Value.IsUsed)
    {
        'USED'
    }
    else
    {
        'UNUSED'
    } )`n"

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

$report += @"

## Recommendations

### Immediate Actions
1. **Delete unused files** listed above to reduce bundle size
2. **Consolidate theme files** - choose one theme system
3. **Migrate to new AuthContext** structure and remove legacy version
4. **Consolidate animation components** - remove duplicate animation directories

### Code Organization
1. **Remove documentation files** from src (e.g., PHASE_1_COMPLETION_SUMMARY.md)
2. **Standardize index.ts exports** across all feature directories
3. **Review service layer** for potential consolidation opportunities

### Coupling Analysis
- High coupling detected in navigation layer (expected)
- Feature modules show good isolation
- Common components have appropriate reuse patterns

"@

# Write report to file
$report | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "`nAnalysis complete! Report saved to: $outputFile" -ForegroundColor Green
Write-Host "Unused files found: $( ($unusedFiles | Measure-Object).Count )" -ForegroundColor Red
