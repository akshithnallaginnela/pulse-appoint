## PulseAppoint – Dependencies and One‑Shot Install Commands

This document lists all required libraries for both frontend and backend, with one‑line install commands for npm, yarn, and pnpm.

### Backend (Node/Express)
- express, mongoose, cors, helmet, compression
- express-rate-limit, express-validator
- dotenv, jsonwebtoken, bcryptjs
- multer, nodemailer, razorpay
- @google/generative-ai (Gemini)

Dev:
- nodemon, jest, supertest

Install (run inside `backend/`):

```bash
# npm
npm i express mongoose cors helmet compression express-rate-limit express-validator dotenv jsonwebtoken bcryptjs multer nodemailer razorpay @google/generative-ai && npm i -D nodemon jest supertest

# yarn
yarn add express mongoose cors helmet compression express-rate-limit express-validator dotenv jsonwebtoken bcryptjs multer nodemailer razorpay @google/generative-ai && yarn add -D nodemon jest supertest

# pnpm
pnpm add express mongoose cors helmet compression express-rate-limit express-validator dotenv jsonwebtoken bcryptjs multer nodemailer razorpay @google/generative-ai && pnpm add -D nodemon jest supertest
```

Environment (in `backend/.env`):
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your-mongodb-uri
JWT_SECRET=your-jwt-secret
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email
EMAIL_PASS=your-app-password
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend (Vite + React + TypeScript + shadcn/ui)
- react, react-dom, react-router-dom
- @tanstack/react-query, date-fns, recharts
- react-hook-form, @hookform/resolvers, zod
- lucide-react
- Radix UI: @radix-ui/react-* (accordion, dialog, dropdown-menu, etc.)
- UI utils: class-variance-authority, clsx, tailwind-merge, tailwindcss-animate, sonner, cmdk, embla-carousel-react, input-otp, next-themes, vaul, react-day-picker, react-resizable-panels

Dev:
- vite, @vitejs/plugin-react-swc, typescript
- tailwindcss, @tailwindcss/typography, postcss, autoprefixer
- eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals

Install (run at project root):

```bash
# npm
npm i react react-dom react-router-dom @tanstack/react-query date-fns recharts react-hook-form @hookform/resolvers zod lucide-react class-variance-authority clsx tailwind-merge tailwindcss-animate sonner cmdk embla-carousel-react input-otp next-themes vaul react-day-picker react-resizable-panels @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip && npm i -D vite @vitejs/plugin-react-swc typescript tailwindcss @tailwindcss/typography postcss autoprefixer eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals

# yarn
yarn add react react-dom react-router-dom @tanstack/react-query date-fns recharts react-hook-form @hookform/resolvers zod lucide-react class-variance-authority clsx tailwind-merge tailwindcss-animate sonner cmdk embla-carousel-react input-otp next-themes vaul react-day-picker react-resizable-panels @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip && yarn add -D vite @vitejs/plugin-react-swc typescript tailwindcss @tailwindcss/typography postcss autoprefixer eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals

# pnpm
pnpm add react react-dom react-router-dom @tanstack/react-query date-fns recharts react-hook-form @hookform/resolvers zod lucide-react class-variance-authority clsx tailwind-merge tailwindcss-animate sonner cmdk embla-carousel-react input-otp next-themes vaul react-day-picker react-resizable-panels @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip && pnpm add -D vite @vitejs/plugin-react-swc typescript tailwindcss @tailwindcss/typography postcss autoprefixer eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals
```

Frontend env (in `.env` at project root):
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=HealthCare
VITE_APP_VERSION=1.0.0
VITE_RAZORPAY_KEY_ID=your-razorpay-key-id
VITE_NODE_ENV=development
```

### Quick Start
```bash
# Backend
cd backend && npm i && npm run dev

# Frontend (new terminal at project root)
npm i && npm run dev
```


