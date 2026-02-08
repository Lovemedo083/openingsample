@echo off
cd /d C:\Axolotl\Opening_3D\openingsample
call npx tsx scripts/golmokScraper.ts > scraper_log.txt 2>&1
echo Done >> scraper_log.txt
