@echo off
setlocal
cd /d "%~dp0"
title VYLOOP - Local App
echo.
echo Starting VYLOOP. Please keep this window open.
echo.
set "VYLOOP_NODE="
where node.exe >nul 2>nul
if not errorlevel 1 set "VYLOOP_NODE=node.exe"
if not defined VYLOOP_NODE if exist "%ProgramFiles%\nodejs\node.exe" set "VYLOOP_NODE=%ProgramFiles%\nodejs\node.exe"
if not defined VYLOOP_NODE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "VYLOOP_NODE=%LocalAppData%\Programs\nodejs\node.exe"
if not defined VYLOOP_NODE (
  echo Node.js could not be found.
  echo Install Node.js 24 LTS from https://nodejs.org/ and reopen this file.
  echo.
  pause
  exit /b 1
)
"%VYLOOP_NODE%" "%~dp0scripts\serve.mjs" --port 4173 --open
set "VYLOOP_RESULT=%ERRORLEVEL%"
echo.
if not "%VYLOOP_RESULT%"=="0" (
  echo Startup failed. Copy the message above when asking for help.
  echo More details may be in VYLOOP-startup.log in this folder.
) else (
  echo VYLOOP has stopped. Reopen START-VYLOOP.cmd to use it again.
)
pause
exit /b %VYLOOP_RESULT%
