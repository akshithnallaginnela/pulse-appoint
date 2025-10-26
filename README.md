# 🏥 Doctor Appointment Booking System

A comprehensive full-stack web application for booking doctor appointments built with the MERN stack (MongoDB, Express.js, React, Node.js) and integrated with Razorpay for secure online payments.

![Project Status](https://img.shields.io/badge/status-complete-green)
![Node.js](https://img.shields.io/badge/node.js-v16+-green)
![React](https://img.shields.io/badge/react-v18+-blue)
![MongoDB](https://img.shields.io/badge/mongodb-atlas-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🔐 Three-Level Authentication System
- **Patient Portal**: Book appointments, manage medical history, view appointment history
- **Doctor Portal**: Manage profile, set availability, handle appointments, add diagnoses
- **Admin Portal**: Manage users, verify doctors, view analytics, system administration

### 🎯 Core Functionality
- **Doctor Discovery**: Advanced search and filtering by specialization, location, rating
- **Appointment Booking**: Real-time slot availability, booking confirmation
- **Payment Integration**: Secure online payments via Razorpay
- **Profile Management**: Comprehensive user and doctor profiles
- **Medical Records**: Track medical history, allergies, medications
- **Notifications**: Email notifications for appointments and updates
- **Responsive Design**: Mobile-first design for all devices

### 🚀 Advanced Features
- Real-time availability checking
- Appointment rescheduling and cancellation
- Payment refund processing
- Rating and review system
- Advanced filtering and pagination
- Context API for state management
- JWT-based authentication
- Role-based access control

## 🛠 Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **shadcn/ui** - Component library
- **React Router** - Client-side routing
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Sonner** - Toast notifications
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Razorpay** - Payment gateway
- **Nodemailer** - Email service
- **Multer** - File upload handling
- **Express Validator** - Input validation
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security headers
- **Rate Limiting** - API protection

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** (v8 or higher) - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)
- **MongoDB Atlas Account** - [Sign up](https://www.mongodb.com/atlas)
- **Razorpay Account** - [Sign up](https://razorpay.com/)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd pulse-appoint
```

### 2. Quick Setup (Recommended)

#### For Windows:
```bash
setup.bat
```

#### For Linux/Mac:
```bash
chmod +x setup.sh
./setup.sh
```

### 3. Manual Installation

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit the .env file with your configuration
# (See Configuration section below)
```

#### Frontend Setup

```bash
# Navigate back to root directory
cd ..

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit the .env file with your configuration
# (See Configuration section below)
```

## ⚙️ Configuration

### Backend Configuration (`backend/.env`)

Create a `.env` file in the `backend` directory with the following variables:

```env
# Environment Configuration
NODE_ENV=development
PORT=5000

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/doctor-appointment?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Razorpay Configuration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Configuration (`.env`)

Create a `.env` file in the root directory with the following variables:

```env
# Frontend Environment Configuration
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=HealthCare
VITE_APP_VERSION=1.0.0

# Razorpay Configuration (for frontend)
VITE_RAZORPAY_KEY_ID=your-razorpay-key-id

# Development
VITE_NODE_ENV=development
```

### MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose "FREE" tier
   - Select a cloud provider and region
   - Click "Create"

3. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Create username and password
   - Set permissions to "Read and write to any database"

4. **Whitelist IP Address**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Add your current IP or use "0.0.0.0/0" for development

5. **Get Connection String**
   - Go to "Clusters"
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

### Razorpay Setup

1. **Create Razorpay Account**
   - Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
   - Sign up for an account

2. **Get API Keys**
   - Go to "Settings" → "API Keys"
   - Generate "Key ID" and "Key Secret"
   - Use test keys for development

3. **Configure Webhooks (Optional)**
   - Go to "Settings" → "Webhooks"
   - Add webhook URL: `https://your-domain.com/api/payments/webhook`
   - Select events: `payment.captured`, `payment.failed`, `refund.created`

## 🏃‍♂️ Running the Application

### Development Mode

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Backend will start on `http://localhost:5000`

2. **Start Frontend Server** (in a new terminal)
   ```bash
npm run dev
   ```
   Frontend will start on `http://localhost:5173`

3. **Access the Application**
   - Open your browser
   - Navigate to `http://localhost:5173`

### Production Mode

1. **Build Frontend**
   ```bash
   npm run build
   ```

2. **Start Backend Server**
   ```bash
   cd backend
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/register-doctor` | Register new doctor | Public |
| POST | `/api/auth/login` | User login | Public |
| GET | `/api/auth/me` | Get current user | Private |
| POST | `/api/auth/logout` | User logout | Private |

### User Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/users/profile` | Get user profile | Private |
| PUT | `/api/users/profile` | Update user profile | Private |
| GET | `/api/users/appointments` | Get user appointments | Private |
| PUT | `/api/users/appointments/:id/cancel` | Cancel appointment | Private |

### Doctor Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/doctors` | Get all doctors | Public |
| GET | `/api/doctors/specializations` | Get specializations | Public |
| GET | `/api/doctors/:id` | Get doctor by ID | Public |
| GET | `/api/doctors/:id/availability` | Get doctor availability | Public |
| GET | `/api/doctors/profile/me` | Get doctor profile | Doctor |

### Appointment Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/appointments` | Book appointment | Patient |
| GET | `/api/appointments` | Get appointments | Private |
| GET | `/api/appointments/:id` | Get appointment | Private |
| PUT | `/api/appointments/:id/confirm` | Confirm appointment | Doctor |
| PUT | `/api/appointments/:id/cancel` | Cancel appointment | Private |

### Payment Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/payments/create-order` | Create Razorpay order | Patient |
| POST | `/api/payments/verify` | Verify payment | Patient |
| POST | `/api/payments/refund` | Process refund | Private |
| GET | `/api/payments/history` | Get payment history | Private |

### Admin Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/admin/dashboard/stats` | Get dashboard stats | Admin |
| GET | `/api/admin/users` | Get all users | Admin |
| GET | `/api/admin/doctors` | Get all doctors | Admin |
| PUT | `/api/admin/doctors/:id/verify` | Verify doctor | Admin |

## 📁 Project Structure

```
pulse-appoint/
├── backend/                     # Backend API
│   ├── models/                 # MongoDB Models
│   │   ├── User.js            # User model
│   │   ├── Doctor.js          # Doctor model
│   │   └── Appointment.js     # Appointment model
│   ├── routes/                # API Routes
│   │   ├── auth.js            # Authentication routes
│   │   ├── users.js           # User routes
│   │   ├── doctors.js         # Doctor routes
│   │   ├── appointments.js    # Appointment routes
│   │   ├── payments.js        # Payment routes
│   │   └── admin.js           # Admin routes
│   ├── middleware/             # Middleware
│   │   ├── auth.js            # Authentication middleware
│   │   └── validation.js      # Validation middleware
│   ├── server.js              # Main server file
│   ├── package.json           # Backend dependencies
│   └── env.example            # Environment template
├── src/                        # Frontend React App
│   ├── components/             # Reusable Components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── Navbar.tsx         # Navigation component
│   │   ├── Footer.tsx          # Footer component
│   │   └── DoctorCard.tsx     # Doctor card component
│   ├── pages/                 # Page Components
│   │   ├── Index.tsx          # Home page
│   │   ├── Login.tsx          # Login/Register page
│   │   ├── Doctors.tsx        # Doctors listing page
│   │   ├── Appointments.tsx   # Appointments page
│   │   └── NotFound.tsx       # 404 page
│   ├── contexts/              # React Context
│   │   ├── AuthContext.tsx   # Authentication context
│   │   └── AppointmentsContext.tsx # Appointments context
│   ├── services/              # API Services
│   │   └── api.ts            # API service layer
│   ├── hooks/                 # Custom Hooks
│   ├── lib/                   # Utilities
│   ├── assets/                # Static Assets
│   ├── App.tsx                # Main App component
│   └── main.tsx               # Entry point
├── public/                     # Public Assets
├── SETUP_INSTRUCTIONS.md      # Detailed setup guide
├── setup.sh                   # Linux/Mac setup script
├── setup.bat                  # Windows setup script
├── env.example                # Frontend environment template
├── package.json               # Frontend dependencies
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Vite configuration
```

## 🧪 Testing

### Manual Testing

1. **Test User Registration**
   ```bash
   # Register as Patient
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "John",
       "lastName": "Doe",
       "email": "john@example.com",
       "password": "password123",
       "phone": "1234567890",
       "dateOfBirth": "1990-01-01",
       "gender": "male"
     }'
   ```

2. **Test Doctor Registration**
   ```bash
   # Register as Doctor
   curl -X POST http://localhost:5000/api/auth/register-doctor \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Dr. Jane",
       "lastName": "Smith",
       "email": "jane@example.com",
       "password": "password123",
       "phone": "1234567890",
       "dateOfBirth": "1985-01-01",
       "gender": "female",
       "licenseNumber": "ML12345",
       "specialization": "Cardiologist",
       "experience": 10,
       "consultationFee": 500
     }'
   ```

3. **Test Login**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "john@example.com",
       "password": "password123"
     }'
   ```

### Frontend Testing

1. **Open Browser Developer Tools**
2. **Navigate to Application**
3. **Test Registration Flow**
4. **Test Login Flow**
5. **Test Doctor Search**
6. **Test Appointment Booking**

## 🚀 Deployment

### Backend Deployment (Heroku)

1. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

2. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your-production-mongodb-uri
   heroku config:set JWT_SECRET=your-production-jwt-secret
   heroku config:set RAZORPAY_KEY_ID=your-production-razorpay-key
   heroku config:set RAZORPAY_KEY_SECRET=your-production-razorpay-secret
   heroku config:set FRONTEND_URL=https://your-frontend-domain.com
   ```

3. **Deploy**
   ```bash
   git subtree push --prefix backend heroku main
   ```

### Frontend Deployment (Vercel)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   ```bash
   vercel env add VITE_API_URL
   vercel env add VITE_RAZORPAY_KEY_ID
   ```

### Frontend Deployment (Netlify)

1. **Build Project**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Connect GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variables

## 🔧 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```bash
Error: MongooseError: Operation `users.findOne()` buffering timed out
```
**Solution:**
- Check MongoDB Atlas connection string
- Verify IP whitelist includes your IP
- Check database user credentials

#### 2. CORS Error
```bash
Access to fetch at 'http://localhost:5000/api/auth/login' from origin 'http://localhost:5173' has been blocked by CORS policy
```
**Solution:**
- Ensure backend server is running
- Check `FRONTEND_URL` in backend `.env`
- Verify `VITE_API_URL` in frontend `.env`

#### 3. Razorpay Payment Error
```bash
RazorpayError: Invalid key_id
```
**Solution:**
- Check Razorpay API keys
- Ensure you're using correct environment (test/production)
- Verify key format

#### 4. Authentication Error
```bash
Error: Invalid token
```
**Solution:**
- Check JWT_SECRET in backend `.env`
- Verify token is being sent in Authorization header
- Check token expiration

### Development Tips

1. **Database Seeding**
   ```javascript
   // Create sample data
   db.users.insertOne({
     firstName: "Admin",
     lastName: "User",
     email: "admin@example.com",
     password: "$2a$12$...", // hashed password
     role: "admin",
     isActive: true
   });
   ```

2. **Testing Payments**
   - Use Razorpay test mode
   - Test with Razorpay test cards
   - Check webhook events

3. **File Uploads**
   ```bash
   mkdir backend/uploads
   ```

## 🤝 Contributing

1. **Fork the Repository**
2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit Changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to Branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Write comprehensive tests
- Update documentation
- Follow code style guidelines

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: Check this README and `SETUP_INSTRUCTIONS.md`
- **Issues**: Create an issue in the GitHub repository
- **Discussions**: Use GitHub Discussions for questions

## 🎯 Future Enhancements

- [ ] Real-time notifications with WebSocket
- [ ] Video consultation integration
- [ ] Mobile app development (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Integration with health records systems
- [ ] AI-powered symptom checker
- [ ] Prescription management system
- [ ] Appointment reminders via SMS
- [ ] Telemedicine features

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI framework
- [Express.js](https://expressjs.com/) - Web framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Razorpay](https://razorpay.com/) - Payment gateway
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

**Happy Coding! 🚀**

If you found this project helpful, please give it a ⭐ star on GitHub!