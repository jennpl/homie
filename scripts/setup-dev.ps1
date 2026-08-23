param(
  [ValidateSet("tony-test", "partner-test", "shared-demo")]
  [string]$HouseholdId = "tony-test"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env.local"
$examplePath = Join-Path $projectRoot ".env.example"

Push-Location $projectRoot
try {
  Write-Host "Installing Homie dependencies..."
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

  if (-not (Test-Path -LiteralPath $envPath)) {
    Copy-Item -LiteralPath $examplePath -Destination $envPath
    Write-Host "Created .env.local from .env.example."
  }

  $envText = Get-Content -Raw -LiteralPath $envPath
  $householdPattern = '(?m)^HOMIE_HOUSEHOLD_ID=.*$'
  if ($envText -match $householdPattern) {
    $envText = $envText -replace $householdPattern, "HOMIE_HOUSEHOLD_ID=$HouseholdId"
  } else {
    $envText = $envText.TrimEnd() + "`r`nHOMIE_HOUSEHOLD_ID=$HouseholdId`r`n"
  }
  Set-Content -LiteralPath $envPath -Value $envText -NoNewline

  $databaseLine = ($envText -split "`r?`n" | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1)
  $databaseUrl = if ($databaseLine) { $databaseLine.Substring("DATABASE_URL=".Length).Trim() } else { "" }
  if (-not $databaseUrl -or $databaseUrl -match 'user:password@host') {
    Write-Host ""
    Write-Host "Almost ready: add the shared Neon DATABASE_URL to .env.local, then run this command again."
    Write-Host "OpenAI credentials are optional for Twilio adapter development."
    exit 2
  }

  Write-Host "Applying shared database migrations..."
  & npm.cmd run db:migrate
  if ($LASTEXITCODE -ne 0) { throw "database migration failed" }

  Write-Host "Seeding isolated development households..."
  & npm.cmd run db:seed
  if ($LASTEXITCODE -ne 0) { throw "database seed failed" }

  Write-Host ""
  Write-Host "Homie is ready for $HouseholdId."
  Write-Host "Twilio work can import createNoteService without an OpenAI key."
} finally {
  Pop-Location
}
