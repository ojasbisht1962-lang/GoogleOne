import React from 'react';
import AddressManagement from '../../components/AddressManagement/AddressManagement';
import './AddressesPage.css';

export default function AddressesPage() {
  return (
    <div className="addresses-page">
      <div className="addresses-page-header">
        <div className="breadcrumb">
          <span>Home</span> / <span>My Addresses</span>
        </div>
      </div>
      
      <AddressManagement selectionMode={false} />
    </div>
  );
}
