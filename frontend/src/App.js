import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import config from './config';
import './styles/App.css';
import LoadingScreen from './components/LoadingScreen';
import BharosaChatbot from './components/BharosaChatbot';
import Layout from './components/Layout';
import Login from './pages/Common/Login';
import Home from './pages/Common/Home';
import About from './pages/Common/About';
import FAQ from './pages/Common/FAQ';
import Contact from './pages/Common/Contact';
import PrivacyPolicy from './pages/Common/PrivacyPolicy';
import TermsOfService from './pages/Common/TermsOfService';
import CustomerDashboard from './pages/Customer/Dashboard';
import CustomerProfile from './pages/Customer/CustomerProfile';
import GenderPreferenceSettings from './pages/Customer/GenderPreferenceSettings';
import Services from './pages/Customer/Services';
import ServiceDetails from './pages/Customer/ServiceDetails';
import BookingPage from './pages/Customer/BookingPage';
import PaymentPage from './pages/Customer/PaymentPage';
import MyBookings from './pages/Customer/MyBookings';
import AddressesPage from './pages/Customer/AddressesPage';
import Chat from './pages/Customer/Chat';
import AMCRequest from './pages/Customer/AMCRequest';
import CustomerSupport from './pages/Customer/CustomerSupport';
import CustomerWallet from './pages/Customer/Wallet';
import TaskerDashboard from './pages/Tasker/Dashboard';
import TaskerProfile from './pages/Tasker/Profile';
import TaskerOnboarding from './pages/Tasker/Onboarding';
import MyServices from './pages/Tasker/MyServices';
import TaskerBookings from './pages/Tasker/Bookings';
import TaskerChat from './pages/Tasker/Chat';
import Badges from './pages/Tasker/Badges';
import TaskerWallet from './pages/Tasker/Wallet';
import DocumentVerification from './pages/Tasker/DocumentVerification';
import TaskerSupport from './pages/Tasker/Support';
import AdminDashboard from './pages/SuperAdmin/AdminDashboard';
import SuperAdminProfile from './pages/SuperAdmin/SuperAdminProfile';
import UserManagement from './pages/SuperAdmin/UserManagement';
import VerificationManagement from './pages/SuperAdmin/VerificationManagement';
import PriceRangeManagement from './pages/SuperAdmin/PriceRangeManagement';
import AMCManagement from './pages/SuperAdmin/AMCManagement';
import BookingManagement from './pages/SuperAdmin/BookingManagement';
import ContactMessages from './pages/SuperAdmin/ContactMessages';
import PaymentSettings from './pages/SuperAdmin/PaymentSettings';
import SupportTickets from './pages/SuperAdmin/SupportTickets';
import BadgeManagement from './pages/SuperAdmin/BadgeManagement';
import ProviderSelectionPage from './components/ProviderSelection/ProviderSelectionPage';
import TaskerDetails from './pages/Customer/TaskerDetails';

const PageTransition = ({ children }) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  return (
    <div className={`page-transition ${isTransitioning ? 'page-transition-enter' : ''}`}>
      {children}
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();


  if (loading) {
    return <LoadingScreen message="🔐 Authenticating..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <PageTransition>{children}</PageTransition>
    </Layout>
  );
};

function AppRoutes() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />

        {/* Customer Routes */}
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/services"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <Services />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/providers"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <ProviderSelectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/tasker/:taskerId"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <TaskerDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/services/:serviceId"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <ServiceDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/book/:serviceId"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/payment"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/bookings"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/addresses"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <AddressesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/chat"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/chat/:chatId"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/amc"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <AMCRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/support"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerSupport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/gender-preference-settings"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <GenderPreferenceSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/wallet"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerWallet />
            </ProtectedRoute>
          }
        />

        {/* Tasker Routes */}
        {/* Tasker Routes */}
        <Route
          path="/tasker/onboarding"
          element={
            <ProtectedRoute allowedRoles={['tasker']}>
              <TaskerOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasker/dashboard"
          element={
            <ProtectedRoute allowedRoles={['tasker']}>
              <TaskerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasker/profile"
          element={
            <ProtectedRoute allowedRoles={['tasker']}>
              <TaskerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasker/services"
          element={
            <ProtectedRoute allowedRoles={['tasker']}>
              <MyServices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasker/bookings"
          element={
            <ProtectedRoute allowedRoles={['tasker']}>
              <TaskerBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasker/chat"
          element={
            <ProtectedRoute allowedRoles={['tasker']}>
              <TaskerChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasker/chat/:chatId"
          element={
            <ProtectedRoute allowedRoles={['tasker']}>
              <TaskerChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasker/badges"
          element={
            <ProtectedRoute allowedRoles={['tasker']}>
              <Badges />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasker/wallet"
          element={
            <ProtectedRoute allowedRoles={['tasker']}>
              <TaskerWallet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasker/support"
          element={
            <ProtectedRoute allowedRoles={['tasker']}>
              <TaskerSupport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasker/verification"
          element={
            <ProtectedRoute allowedRoles={['tasker']}>
              <DocumentVerification />
            </ProtectedRoute>
          }
        />

        {/* SuperAdmin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/verifications"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <VerificationManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/price-ranges"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <PriceRangeManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payment-settings"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <PaymentSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support-tickets"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SupportTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <BookingManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/amc"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <AMCManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/contact-messages"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <ContactMessages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/badges"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <BadgeManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/profile"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminProfile />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={config.GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <BharosaChatbot />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
