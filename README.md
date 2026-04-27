# TrustedHands - On-Demand Service Platform

## 🎯 Problem Statement

Finding reliable, verified service providers for everyday tasks remains a challenge. Customers struggle with trust issues, lack of transparency in pricing, and difficulty in tracking service history. Service providers face challenges in reaching customers, managing their bookings, and building credibility. Traditional platforms lack comprehensive features like real-time communication, wallet systems, and advanced verification mechanisms.

## 💡 Solution

**TrustedHands** is a comprehensive on-demand service marketplace that bridges the gap between customers and verified service providers. Our platform ensures trust, transparency, and seamless transactions through advanced features like AI-powered document verification, real-time chat with translation, digital wallet integration, and a robust admin dashboard for platform management.

---

## ✨ Key Features

### 👤 For Customers
- **🔍 Service Discovery**: Browse and search verified service providers by category, location, and ratings
- **📍 Location-Based Services**: Find nearby service providers with integrated Google Maps
- **💬 Real-Time Chat**: Communicate directly with service providers with AI-powered translation support
- **📅 Booking Management**: Schedule, track, and manage service bookings with status updates
- **💰 Digital Wallet**: Secure payment system with transaction history and balance management
- **⭐ Reviews & Ratings**: Rate and review service providers to help the community
- **❤️ Favorites**: Save preferred service providers for quick access
- **📱 Address Management**: Save multiple addresses for convenient service booking
- **🔔 Real-Time Notifications**: Get instant updates on booking status, messages, and payments
- **🎫 Support System**: File complaints and disputes with ticket tracking

### 🛠️ For Service Providers (Taskers)
- **📝 Service Listing**: Create and manage service offerings with detailed descriptions and pricing
- **📊 Dashboard**: View earnings, bookings, and performance metrics
- **✅ Professional Verification**: AI-powered document verification using Puter.js for identity validation
- **🏆 Badge System**: Apply for and showcase professional badges (Verified, Top Rated, Premium)
- **💼 Booking Management**: Accept/reject bookings, update status, and manage schedule
- **💵 Wallet & Earnings**: Track income, request payouts, and view transaction history
- **📈 Analytics**: Monitor service performance and customer feedback
- **💬 Customer Communication**: Chat with customers in real-time
- **🔧 AMC Services**: Offer Annual Maintenance Contracts for recurring services
- **👥 Gender Preferences**: Set and display gender preferences for service delivery

### 🎛️ For Super Admins
- **📊 Comprehensive Dashboard**: Real-time analytics on users, bookings, revenue, and platform metrics
- **👥 User Management**: View, block/unblock, and manage customer and service provider accounts
- **📋 Booking Oversight**: Monitor all bookings, track statuses, and manage disputes
- **💰 Revenue Analytics**: Track platform earnings, commissions, and payment trends
- **✅ Verification Management**: Review and approve/reject document verification requests
- **🏅 Badge Management**: Approve professional badge applications
- **🔧 AMC Monitoring**: Oversee Annual Maintenance Contracts and renewals
- **📞 Support Management**: Handle customer complaints and dispute resolution
- **💳 Payment Management**: Monitor transactions, refunds, and wallet activities
- **🗺️ Location Analytics**: Track service distribution and demand by location

### 🌐 Universal Features
- **🌙 Dark Theme**: Elegant dark mode design with golden accents for reduced eye strain
- **🔐 Secure Authentication**: Google OAuth 2.0 integration with JWT token management
- **📱 Responsive Design**: Fully optimized for desktop, tablet, and mobile devices
- **🌍 Multi-Language Support**: AI-powered chat translation for seamless communication
- **🔔 Real-Time Updates**: WebSocket-based live notifications and updates
- **🛡️ Privacy Protection**: Secure photo uploads with privacy controls
- **♿ Accessibility**: WCAG-compliant design with proper color contrast

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: React.js 18.x
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Maps Integration**: @react-google-maps/api
- **Styling**: CSS3 with custom dark theme
- **State Management**: React Context API
- **Icons**: React Icons
- **Build Tool**: Create React App
- **Deployment**: Vercel

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Server**: Uvicorn ASGI server
- **Database**: MongoDB Atlas (NoSQL)
- **ODM**: Motor (Async MongoDB driver)
- **Authentication**: 
  - JWT (JSON Web Tokens)
  - Google OAuth 2.0
  - python-jose for token management
- **File Handling**: 
  - python-multipart for file uploads
  - Pillow for image processing
- **API Documentation**: 
  - Swagger UI (auto-generated)
  - OpenAPI 3.0
- **CORS**: FastAPI CORS middleware
- **Environment Management**: python-dotenv
- **Deployment**: Render

### AI & External Services
- **Document Verification**: Puter.js AI for identity validation
- **Chat Translation**: Puter.js AI for multi-language support
- **Authentication**: Google OAuth 2.0

### Database Schema
- **Collections**: 
  - Users (customers, taskers, admins)
  - Services
  - Bookings
  - Chats & Messages
  - Notifications
  - Payments & Wallets
  - Reviews & Ratings
  - AMC Contracts
  - Badge Applications
  - Document Verifications
  - Support Tickets
  - Addresses
  - Favorites

### DevOps & Tools
- **Version Control**: Git & GitHub
- **Package Management**: 
  - npm (frontend)
  - pip (backend)
- **API Testing**: Swagger UI, Postman
- **Database Indexing**: MongoDB compound indexes for performance
- **Environment Variables**: .env files for configuration

---

## 🚀 Getting Started

### Prerequisites
```bash
# Node.js 16+ and npm
node --version
npm --version

# Python 3.10+
python --version

# MongoDB Atlas account (or local MongoDB)
```

### Installation

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd localrepo
```

#### 2. Backend Setup
```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI, Google OAuth credentials, etc.

# Run the backend server
python main.py
```
Backend will run on `http://localhost:8000`

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Edit src/config.js with your API URL and Google Maps API key

# Start development server
npm start
```
Frontend will run on `http://localhost:3000`

### Environment Variables

#### Backend (.env)
```env
MONGODB_URI=your_mongodb_atlas_connection_string
SECRET_KEY=your_secret_key_for_jwt
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
PUTER_API_KEY=your_puter_ai_api_key
```

#### Frontend (src/config.js)
```javascript
const config = {
  API_BASE_URL: 'http://localhost:8000',
  GOOGLE_MAPS_API_KEY: 'your_google_maps_api_key',
  GOOGLE_CLIENT_ID: 'your_google_oauth_client_id'
};
```

---

## 📁 Project Structure

```
localrepo/
├── backend/
│   ├── app/
│   │   ├── routes/          # API endpoints
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Auth & request middleware
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helper functions
│   ├── uploads/             # User file uploads
│   ├── main.py              # FastAPI application entry
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Page components
│   │   │   ├── Customer/    # Customer-specific pages
│   │   │   ├── Tasker/      # Service provider pages
│   │   │   ├── SuperAdmin/  # Admin dashboard pages
│   │   │   └── Common/      # Shared pages
│   │   ├── services/        # API service layer
│   │   ├── context/         # React Context providers
│   │   ├── styles/          # Global CSS
│   │   ├── App.js           # Main app component
│   │   └── config.js        # Frontend configuration
│   ├── public/              # Static assets
│   └── package.json         # npm dependencies
│
├── DEPLOYMENT.md            # Deployment guide
├── README.md                # This file
└── START.bat                # Quick start script (Windows)
```

---

## 🔑 Key Highlights

### 🤖 AI-Powered Features
- **Document Verification**: Uses Puter.js AI to automatically extract and verify names from ID documents (Aadhar, PAN, Driver's License)
- **Smart Translation**: Real-time chat translation enabling communication across language barriers

### 🎨 Design Excellence
- **Modern Dark Theme**: Professional dark UI with golden accents (#FDB913) for premium feel
- **Responsive Layout**: Seamless experience across all devices
- **Accessibility First**: WCAG 2.1 AA compliant with proper color contrast ratios

### ⚡ Performance Optimization
- **Database Indexing**: Strategic MongoDB indexes for fast queries
- **Async Operations**: Non-blocking I/O with Python's asyncio
- **Optimized Rendering**: React optimization techniques for smooth UX

### 🔒 Security
- **JWT Authentication**: Secure token-based auth with refresh mechanism
- **OAuth Integration**: Google Sign-In for trusted authentication
- **Role-Based Access**: Separate interfaces for customers, taskers, and admins
- **Data Validation**: Input sanitization and validation at all layers

---

## 🎯 Use Cases

1. **Home Services**: Plumbing, electrical, carpentry, cleaning
2. **Beauty & Wellness**: Salon services, spa, yoga, fitness training
3. **Tech Support**: Computer repair, gadget servicing, IT support
4. **Automotive**: Car washing, repair, maintenance
5. **Education**: Tutoring, coaching, skill development
6. **Event Services**: Photography, catering, decoration

---

## 🤝 Multi-Role System

### Customer Role
- Browse services
- Book and manage appointments
- Chat with service providers
- Make payments via wallet
- Rate and review services

### Service Provider (Tasker) Role
- List and manage services
- Accept/manage bookings
- Verify professional credentials
- Track earnings and analytics
- Apply for professional badges

### Super Admin Role
- Platform oversight and analytics
- User and booking management
- Verification approval
- Dispute resolution
- Revenue tracking

---

## 📈 Future Enhancements

- 🔔 Push notifications via Firebase
- 📊 Advanced analytics with ML-based predictions
- 🎥 Video call integration for remote consultations
- 🌐 Progressive Web App (PWA) support
- 💳 Multiple payment gateway integration
- 🗣️ Voice-based search and commands
- 📱 Native mobile apps (React Native)
- 🤖 AI chatbot for customer support

---

## 📸 Screenshots

*(Add screenshots of key features)*

---

## 👥 Team

Built with ❤️ for the hackathon

---

## 📄 License

This project is developed for educational and hackathon purposes.

---

## 🙏 Acknowledgments

- **Puter.js**: AI-powered document verification and translation
- **Google Cloud Platform**: Maps and OAuth services
- **MongoDB Atlas**: Reliable cloud database
- **FastAPI**: Modern Python web framework
- **React**: Powerful UI library

---

## 📞 Support

For issues or questions, please use the support ticket system within the platform or contact the admin team.

---

**Built for Hackathon 2026** 🚀