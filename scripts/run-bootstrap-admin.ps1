$ErrorActionPreference = "Stop"

# -----------------------------------------------------------------------------
# Edit these values before running the script.
# -----------------------------------------------------------------------------
$DatabaseUrl = "mysql://user:pass@host:3306/db"
$BootstrapAdminEmail = "admin@company.com"
$BootstrapAdminFirstName = "Admin"
$BootstrapAdminLastName = "Principal"
$SmtpHost = "smtp.company.com"
$SmtpPort = "587"
$SmtpUser = "smtp-user"
$SmtpPass = "smtp-pass"
$SmtpFrom = "no-reply@company.com"
$SmtpSecure = "false"
$AppUrl = "https://your-domain.com"

Write-Host "[bootstrap] Setting env vars in current PowerShell process..."

$env:DATABASE_URL = $DatabaseUrl
$env:BOOTSTRAP_ADMIN_EMAIL = $BootstrapAdminEmail
$env:BOOTSTRAP_ADMIN_FIRSTNAME = $BootstrapAdminFirstName
$env:BOOTSTRAP_ADMIN_LASTNAME = $BootstrapAdminLastName
$env:SMTP_HOST = $SmtpHost
$env:SMTP_PORT = $SmtpPort
$env:SMTP_USER = $SmtpUser
$env:SMTP_PASS = $SmtpPass
$env:SMTP_FROM = $SmtpFrom
$env:SMTP_SECURE = $SmtpSecure
$env:NEXT_PUBLIC_APP_URL = $AppUrl

try {
  Write-Host "[bootstrap] Running bootstrap-admin in sequence..."
  npm run bootstrap-admin
}
finally {
  Write-Host "[bootstrap] Cleaning BOOTSTRAP_ADMIN_* environment variables..."
  Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:BOOTSTRAP_ADMIN_FIRSTNAME -ErrorAction SilentlyContinue
  Remove-Item Env:BOOTSTRAP_ADMIN_LASTNAME -ErrorAction SilentlyContinue
}
