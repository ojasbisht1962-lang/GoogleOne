import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children, showFooter = true }) {
  return (
    <>
      <Navbar />
      <main className="main-content">
        {children}
      </main>
      {showFooter && <Footer />}
    </>
  );
}
