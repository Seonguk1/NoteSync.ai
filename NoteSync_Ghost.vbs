Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory

' 실행 전 기존 포트(8000, 5173) 프로세스를 강제로 정리합니다.
' 기존 stop.bat의 로직을 조용히(0) 먼저 실행하는 방식입니다.
WshShell.Run "cmd /c taskkill /f /fi ""PID gt 0"" /im python.exe /im node.exe", 0, True

' 잠시 대기 (프로세스가 정리될 시간)
WScript.Sleep 500

' 1. 백엔드 실행
WshShell.Run "cmd /c cd /d " & strPath & "\backend && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000", 0, False

' 2. 프론트엔드 실행
WshShell.Run "cmd /c cd /d " & strPath & "\frontend && npm run dev", 0, False

' 3. 서버 예열 대기
WScript.Sleep 0000

' 4. 브라우저 열기
WshShell.Run "http://localhost:5173", 1, False

Set WshShell = Nothing