@echo off
echo ================================
echo Running convert_to_webp.ps1...
echo ================================
powershell -ExecutionPolicy Bypass -File "%~dp0convert_to_webp.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo PowerShell script failed with error code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ================================
echo Running gen_manifest.py...
echo ================================
python "%~dp0gen_manifest.py"
if %ERRORLEVEL% NEQ 0 (
    echo Python script failed with error code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ================================
echo All scripts completed successfully!
echo ================================
pause
