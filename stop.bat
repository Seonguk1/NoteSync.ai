@echo off
setlocal
echo Terminating the NoteSync.ai service...

:: 1. 8000번(백엔드) 포트를 사용하는 실제 PID만 추출해서 종료
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":8000 *LISTENING"') do (
    if not "%%a"=="0" taskkill /f /pid %%a 2>nul
)

:: 2. 5173번(프론트엔드) 포트를 사용하는 실제 PID만 추출해서 종료
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":5173 *LISTENING"') do (
    if not "%%a"=="0" taskkill /f /pid %%a 2>nul
)

:: 3. 잔여 프로세스 이름으로 한 번 더 확인 (조용하게 실행)
taskkill /f /im python.exe /fi "WINDOWTITLE eq NoteSync-Backend" /t 2>nul
taskkill /f /im node.exe /fi "WINDOWTITLE eq NoteSync-Frontend" /t 2>nul

echo All servers have shut down quietly.
timeout /t 2 > nul