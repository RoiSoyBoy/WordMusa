param(
  [string]$Project = "wordmusa",
  [string]$Region  = "us-central1"
)

Write-Host "==> Deploying Cloud Functions..." -ForegroundColor Cyan
firebase deploy --only functions
if ($LASTEXITCODE -ne 0) {
  Write-Error "Firebase deploy failed - aborting credential cleanup."
  exit 1
}

Write-Host ""
Write-Host "==> Stripping GOOGLE_APPLICATION_CREDENTIALS from Cloud Run services..." -ForegroundColor Cyan
$raw = & gcloud run services list --project $Project --region $Region --format "value(metadata.name)"
$services = ($raw -split "`n") | Where-Object { $_.Trim() -ne "" }

foreach ($svc in $services) {
  Write-Host "    $svc" -NoNewline
  & gcloud run services update $svc --project $Project --region $Region --remove-env-vars GOOGLE_APPLICATION_CREDENTIALS --quiet
  if ($LASTEXITCODE -eq 0) {
    Write-Host " - cleaned" -ForegroundColor Green
  } else {
    Write-Host " - skipped (var not present)" -ForegroundColor DarkGray
  }
}

Write-Host ""
Write-Host "==> Done." -ForegroundColor Green
