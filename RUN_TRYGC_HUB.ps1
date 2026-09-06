param([ValidateSet('dev', 'build')][string]$Mode = 'dev')
$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskAlias = $null
$taskCreatedAlias = $false
$taskExitCode = 1
try {
    # Vite treats # in absolute import paths as a URL fragment.
    if ($taskRoot.Contains('#')) {
        $taskMappings = @(& subst)
        foreach ($taskLetter in @('T', 'U', 'V', 'W', 'X', 'Y', 'Z')) {
            $taskDrive = "${taskLetter}:"
            if ($taskMappings | Where-Object { $_ -eq "$taskDrive\: => $taskRoot" }) {
                $taskAlias = $taskDrive
                break
            }
            if (-not (Test-Path "$taskDrive\")) {
                & subst $taskDrive $taskRoot
                if ($LASTEXITCODE -ne 0) { throw 'Could not create the local project drive alias.' }
                $taskAlias = $taskDrive
                $taskCreatedAlias = $true
                break
            }
        }
        if (-not $taskAlias) { throw 'No free drive letter T: through Z: is available for the project alias.' }
        $taskRoot = "$taskAlias\"
    }
    Push-Location -LiteralPath $taskRoot
    try {
        if (-not (Test-Path 'node_modules/vite/bin/vite.js')) {
            if (Get-Command bun -ErrorAction SilentlyContinue) {
                & bun install --frozen-lockfile
            } else {
                & npm.cmd install
            }
            if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
        }
        if ($Mode -eq 'build') {
            & npm.cmd run build
        } else {
            Write-Host 'TryGC Workspace Hub: http://127.0.0.1:5173'
            & npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort --configLoader runner
        }
        $taskExitCode = $LASTEXITCODE
    } finally { Pop-Location }
} finally {
    if ($taskCreatedAlias) { & subst $taskAlias /d }
}
exit $taskExitCode
