$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    scanIntervalMinutes = 60
    minScore = 75
    minProfit = 20
    minROI = 15
    markupPercentage = 30
    maxListingsPerRun = 10
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://arbi-production.up.railway.app/api/autonomous-control/start-listing" -Method Post -Headers $headers -Body $body
