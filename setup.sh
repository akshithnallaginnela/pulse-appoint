#!/bin/bash

# Doctor Appointment Booking System - Quick Setup Script
# This script helps you set up the development environment quickly

echo "🏥 Doctor Appointment Booking System - Quick Setup"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js v16 or higher."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Create backend .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cp backend/env.example backend/.env
    echo "✅ Backend .env file created"
    echo "⚠️  Please edit backend/.env with your MongoDB and Razorpay credentials"
else
    echo "✅ Backend .env file already exists"
fi

# Create frontend .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating frontend .env file..."
    cp env.example .env
    echo "✅ Frontend .env file created"
    echo "⚠️  Please edit .env with your API URL and Razorpay key"
else
    echo "✅ Frontend .env file already exists"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if npm install; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ..
if npm install; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit backend/.env with your MongoDB Atlas connection string"
echo "2. Edit backend/.env with your Razorpay API keys"
echo "3. Edit .env with your frontend configuration"
echo "4. Start the backend server: cd backend && npm run dev"
echo "5. Start the frontend server: npm run dev"
echo ""
echo "🌐 The application will be available at:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:5000"
echo ""
echo "📖 For detailed setup instructions, see SETUP_INSTRUCTIONS.md"
echo ""
echo "Happy coding! 🚀"
