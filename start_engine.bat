@echo off
echo Starting Autonomous Engine...
curl -X POST https://arbi-production.up.railway.app/api/autonomous-control/start-listing ^
  -H "Content-Type: application/json" ^
  -d "{\"scanIntervalMinutes\": 60, \"minScore\": 75, \"minProfit\": 20, \"minROI\": 15, \"markupPercentage\": 30, \"maxListingsPerRun\": 10}"
echo.
echo Done.
pause
