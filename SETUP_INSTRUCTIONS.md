# Doctor Appointment Booking System - Setup Instructions

This is a full-stack doctor appointment booking web application built with the MERN stack (MongoDB, Express.js, React, Node.js) with Razorpay payment integration.

## Features

### Three Levels of Login:
- **Patient Login**: Patients can log in, view doctor profiles, book appointments, and manage their bookings
- **Doctor Login**: Doctors can manage their profiles, update availability, view and manage appointments, and mark appointments as completed or canceled
- **Admin Login**: Admins can manage doctors, appointments, and user data

### Core Features:
- Doctor profiles with editable fields
- Appointment booking system with slot selection and availability logic
- Payment integration with Razorpay
- Real-time status updates
- Responsive design for all devices
- Context API for state management
- Advanced filtering and search functionality

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- Razorpay account for payments
- Git

## Project Structure

```
pulse-appoint/
├── backend/                 # Node.js/Express backend
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication & validation middleware
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   ├── pages/              # Page components
│   ├── contexts/           # React Context for state management
│   ├── services/           # API service layer
│   └── ...
└── README.md
```

## Backend Setup

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the backend directory:

```bash
cp env.example .env
```

Edit the `.env` file with your configuration:

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

# Email Configuration (for notifications)
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

### 4. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address
5. Get your connection string and update `MONGODB_URI` in `.env`

### 5. Razorpay Setup

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Create a new account or login
3. Go to Settings > API Keys
4. Generate API keys
5. Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`

### 6. Start Backend Server
```bash
# Development mode with auto-restart
npm run dev

# Or production mode
npm start
```

The backend server will start on `http://localhost:5000`

## Frontend Setup

### 1. Navigate to Root Directory
```bash
cd ..  # Go back to root directory
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```bash
cp env.example .env
```

Edit the `.env` file:

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

### 4. Start Frontend Development Server
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## Running the Application

### Development Mode
1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend server (in a new terminal):
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

### Production Mode
1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/register-doctor` - Register a new doctor
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/appointments` - Get user appointments
- `POST /api/users/appointments/:id/cancel` - Cancel appointment

### Doctors
- `GET /api/doctors` - Get all doctors with filtering
- `GET /api/doctors/specializations` - Get available specializations
- `GET /api/doctors/:id` - Get doctor by ID
- `GET /api/doctors/:id/availability` - Get doctor availability
- `GET /api/doctors/profile/me` - Get doctor profile (for doctors)

### Appointments
- `POST /api/appointments` - Book new appointment
- `GET /api/appointments` - Get appointments
- `GET /api/appointments/:id` - Get specific appointment
- `PUT /api/appointments/:id/confirm` - Confirm appointment
- `PUT /api/appointments/:id/cancel` - Cancel appointment
- `PUT /api/appointments/:id/reschedule` - Reschedule appointment

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment
- `POST /api/payments/refund` - Process refund
- `GET /api/payments/history` - Get payment history

### Admin
- `GET /api/admin/dashboard/stats` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/doctors` - Get all doctors
- `GET /api/admin/appointments` - Get all appointments
- `PUT /api/admin/doctors/:id/verify` - Verify doctor

## Testing the Application

### 1. Register as Patient
1. Go to `http://localhost:5173/login`
2. Click on "Sign Up" tab
3. Fill in the registration form
4. Submit the form

### 2. Register as Doctor
1. Go to `http://localhost:5173/login`
2. Click on "Doctor" tab
3. Fill in the doctor registration form
4. Submit the form

### 3. Login and Book Appointment
1. Login with your credentials
2. Go to "Find Doctors" page
3. Search and filter doctors
4. Click "Book Appointment" on a doctor card
5. Select date and time
6. Complete the booking process

### 4. Admin Access
To access admin features, you need to manually update a user's role to "admin" in the database:

```javascript
// In MongoDB Atlas or MongoDB Compass
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check your MongoDB Atlas connection string
   - Ensure your IP is whitelisted
   - Verify database user credentials

2. **Razorpay Payment Error**
   - Check your Razorpay API keys
   - Ensure you're using test keys for development
   - Verify webhook configuration

3. **CORS Error**
   - Check if backend server is running
   - Verify FRONTEND_URL in backend .env file
   - Ensure API_BASE_URL in frontend .env file

4. **Authentication Error**
   - Check JWT_SECRET in backend .env
   - Verify token is being sent in requests
   - Check if user exists in database

### Development Tips

1. **Database Seeding**
   You can create sample data by making API calls or directly inserting into MongoDB:

```javascript
// Sample doctor data
db.doctors.insertOne({
  userId: ObjectId("..."),
  licenseNumber: "ML12345",
  specialization: "Cardiologist",
  experience: 10,
  consultationFee: 500,
  isVerified: true,
  profileCompleted: true
})
```

2. **Testing Payments**
   - Use Razorpay test mode for development
   - Test with Razorpay test cards
   - Check webhook events in Razorpay dashboard

3. **File Uploads**
   - Create `uploads/` directory in backend
   - Configure multer for file handling
   - Set appropriate file size limits

## Deployment

### Backend Deployment (Heroku)
1. Create a Heroku app
2. Set environment variables in Heroku dashboard
3. Connect GitHub repository
4. Deploy from main branch

### Frontend Deployment (Vercel/Netlify)
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Set environment variables

### Environment Variables for Production
- Update `MONGODB_URI` with production database
- Update `FRONTEND_URL` with production frontend URL
- Use production Razorpay keys
- Set `NODE_ENV=production`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the API endpoints

## Future Enhancements

- Real-time notifications
- Video consultation integration
- Mobile app development
- Advanced analytics dashboard
- Multi-language support
- Integration with health records systems
