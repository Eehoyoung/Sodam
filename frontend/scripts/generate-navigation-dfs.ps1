param(
  [ValidateSet('owner','employee','personal','all')]
  [string]$Role = 'all',
  [string]$GraphPath = "./docs/navigation/navigation_graph_roles_v1.json",
  [string]$OutFile = "./logs/navigation_dfs_report.md",
  [int]$MaxDepth = 12
)

$ErrorActionPreference = 'Stop'

function Write-Header($role, $graph) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "# Navigation DFS Report`n" |
    Out-File -FilePath $OutFile -Encoding UTF8
  "- Generated: $timestamp" | Out-File -FilePath $OutFile -Append -Encoding UTF8
  "- Role: $role" | Out-File -FilePath $OutFile -Append -Encoding UTF8
  "- Graph Version: $($graph.version)" | Out-File -FilePath $OutFile -Append -Encoding UTF8
  "- Notes: $($graph.notes)" | Out-File -FilePath $OutFile -Append -Encoding UTF8
  "`n> Command: powershell -ExecutionPolicy Bypass -File .\scripts\generate-navigation-dfs.ps1 -Role $role -OutFile $OutFile`n" |
    Out-File -FilePath $OutFile -Append -Encoding UTF8
}

function DFS($graph, [string]$start, [System.Collections.Generic.List[string]]$path, [System.Collections.Generic.HashSet[string]]$visited, [System.Collections.Generic.List[object]]$paths, [int]$depth) {
  if ($depth -gt $MaxDepth) { return }
  $path.Add($start) | Out-Null
  $visited.Add($start) | Out-Null

  $neighbors = @()
  if ($graph.nodes.$start) {
    $neighbors = @($graph.nodes.$start)
  }

  if (-not $neighbors -or $neighbors.Count -eq 0) {
    $paths.Add([PSCustomObject]@{ Path = ($path -join ' -> '); Length = $path.Count }) | Out-Null
  } else {
    foreach ($n in $neighbors) {
      if (-not $visited.Contains($n)) {
        DFS -graph $graph -start $n -path $path -visited $visited -paths $paths -depth ($depth + 1)
      } else {
        # record cycle edge once with a marker
        $cyclePath = ($path + @("$n (cycle)")) -join ' -> '
        $paths.Add([PSCustomObject]@{ Path = $cyclePath; Length = $path.Count + 1 }) | Out-Null
      }
    }
  }

  # backtrack
  [void]$visited.Remove($start)
  [void]$path.RemoveAt($path.Count - 1)
}

try {
  if (-not (Test-Path $GraphPath)) {
    throw "Graph file not found: $GraphPath"
  }
  $json = Get-Content $GraphPath -Raw -Encoding UTF8 | ConvertFrom-Json

  $rolesToRun = if ($Role -eq 'all') { $json.roles } else { @($Role) }
  Write-Header -role $Role -graph $json

  foreach ($r in $rolesToRun) {
    "## Role: $r`n" | Out-File -FilePath $OutFile -Append -Encoding UTF8
    $entry = $json.roleEntrypoints.$r
    if (-not $entry) {
      "- No entrypoint defined for role '$r'`n" | Out-File -FilePath $OutFile -Append -Encoding UTF8
      continue
    }

    $paths = New-Object System.Collections.Generic.List[object]
    $visited = New-Object System.Collections.Generic.HashSet[string]
    $path = New-Object System.Collections.Generic.List[string]

    # Start DFS from the last node of the entry sequence (treat prior nodes as fixed prelude)
    if ($entry.Count -gt 0) {
      $prelude = @()
      if ($entry.Count -gt 1) { $prelude = $entry[0..($entry.Count - 2)] }
      $startNode = $entry[$entry.Count - 1]

      # Seed the path with prelude
      foreach ($p in $prelude) { $path.Add($p) | Out-Null }
      foreach ($p in $prelude) { [void]$visited.Add($p) }

      DFS -graph $json -start $startNode -path $path -visited $visited -paths $paths -depth 1

      # Output
      "- Entrypoint: $($entry -join ' -> ')" | Out-File -FilePath $OutFile -Append -Encoding UTF8
      "- Total paths found: $($paths.Count)" | Out-File -FilePath $OutFile -Append -Encoding UTF8
      "" | Out-File -FilePath $OutFile -Append -Encoding UTF8
      $idx = 1
      foreach ($p in $paths | Sort-Object Length, Path) {
        "$idx. $($p.Path)" | Out-File -FilePath $OutFile -Append -Encoding UTF8
        $idx++
      }
      "`n" | Out-File -FilePath $OutFile -Append -Encoding UTF8
    }
  }

  "---`nScan complete." | Out-File -FilePath $OutFile -Append -Encoding UTF8
  Write-Host "[OK] DFS report generated at $OutFile"
}
catch {
  Write-Error $_
  exit 1
}
