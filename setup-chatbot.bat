@echo off
echo ========================================
echo  Healthcare Chatbot Setup Script
echo ========================================
echo.

echo [1/4] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend installation failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Installing frontend dependencies...
cd ..
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend installation failed!
    pause
    exit /b 1
)

echo.
echo [3/4] Checking environment configuration...
if not exist backend\.env (
    echo WARNING: backend\.env not found!
    echo Please copy backend\env.example to backend\.env and configure it.
    echo.
)

echo.
echo [4/4] Setup complete!
echo.
echo ========================================
echo  Next Steps:
echo ========================================
echo.
echo 1. Configure backend\.env with your MongoDB URI and JWT secret
echo 2. Start MongoDB if running locally
echo 3. Run 'npm run dev' in the root directory for frontend
echo 4. Run 'npm run dev' in the backend directory for backend
echo.
echo For detailed instructions, see CHATBOT_SETUP.md
echo.
echo ========================================
echo  Quick Start Commands:
echo ========================================
echo.
echo Terminal 1:  cd backend ^&^& npm run dev
echo Terminal 2:  npm run dev
echo.
pause
