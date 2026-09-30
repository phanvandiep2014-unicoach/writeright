# Chạy: powershell -ExecutionPolicy Bypass -File C:\dev\writeright\scripts\test-email.ps1
# Hỏi CRON_SECRET (không hiện trên màn hình), gửi 2 email thử về hộp thư của Phan, in kết quả.
$to = "phanvandiep2014@gmail.com"
$sec = Read-Host "Dan CRON_SECRET roi bam Enter" -AsSecureString
$s = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
if (-not $s) { Write-Host "Chua nhap secret." -ForegroundColor Red; exit 1 }
$h = @{ Authorization = "Bearer $s" }
$base = "https://writeright.unicoach.vn/api/cron"
foreach ($u in @("renewal-reminders?testTo=$to", "nurture?testTo=$to&kind=d1")) {
  try {
    $r = Invoke-WebRequest "$base/$u" -Headers $h -UseBasicParsing -TimeoutSec 90
    Write-Host "OK  $u -> $($r.StatusCode) $($r.Content)" -ForegroundColor Green
  } catch {
    $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "khong ket noi" }
    Write-Host "LOI $u -> $code" -ForegroundColor Red
  }
}
Write-Host "Kiem tra hop thu $to (ca muc Spam)."
