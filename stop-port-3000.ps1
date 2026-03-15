# Script to stop all processes using port 3000
Write-Host "Stopping all processes on port 3000..." -ForegroundColor Yellow

# Get all processes using port 3000
$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    foreach ($processId in $processes) {
        try {
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "Stopping process: $($proc.ProcessName) (PID: $processId)" -ForegroundColor Cyan
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "Could not stop process $processId" -ForegroundColor Red
        }
    }
    Start-Sleep -Seconds 2
    Write-Host "✅ Port 3000 should now be free!" -ForegroundColor Green
} else {
    Write-Host "No processes found using port 3000" -ForegroundColor Green
}

# Also stop all Node processes
Write-Host "`nStopping all Node.js processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Write-Host "✅ All Node processes stopped!" -ForegroundColor Green

Write-Host "`nYou can now run: npm run dev" -ForegroundColor Cyan

