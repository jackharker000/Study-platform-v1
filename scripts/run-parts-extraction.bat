@echo off
cd /d C:\Users\OEM\Desktop\Study-platform-v1

:loop
echo [%date% %time%] Starting parts extraction run...

node scripts\extract-parts.js --continue %*

echo [%date% %time%] Parts extraction run complete. Waiting 60 minutes before next cycle...
timeout /t 3600 /nobreak
goto loop
