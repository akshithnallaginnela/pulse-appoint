@echo off
REM Doctor Appointment Booking System - Quick Setup Script for Windows
REM This script helps you set up the development environment quickly

echo 🏥 Doctor Appointment Booking System - Quick Setup
echo ==================================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v16 or higher.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo ✅ npm detected
npm --version

REM Create backend .env file if it doesn't exist
if not exist "backend\.env" (
    echo 📝 Creating backend .env file...
    copy "backend\env.example" "backend\.env" >nul
    echo ✅ Backend .env file created
    echo ⚠️  Please edit backend\.env with your MongoDB and Razorpay credentials
) else (
    echo ✅ Backend .env file already exists
)

REM Create frontend .env file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating frontend .env file...
    copy "env.example" ".env" >nul
    echo ✅ Frontend .env file created
    echo ⚠️  Please edit .env with your API URL and Razorpay key
) else (
    echo ✅ Frontend .env file already exists
)

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd ..
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed

echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Edit backend\.env with your MongoDB Atlas connection string
echo 2. Edit backend\.env with your Razorpay API keys
echo 3. Edit .env with your frontend configuration
echo 4. Start the backend server: cd backend ^&^& npm run dev
echo 5. Start the frontend server: npm run dev
echo.
echo 🌐 The application will be available at:
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:5000
echo.
echo 📖 For detailed setup instructions, see SETUP_INSTRUCTIONS.md
echo.
echo Happy coding! 🚀
pause
