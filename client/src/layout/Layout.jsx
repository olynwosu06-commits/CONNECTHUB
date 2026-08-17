import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';

function Layout() {
    const location = useLocation();
    
    // Pages where Navbar should NOT appear
    const hideNavbarPages = [ '/profile', '/loading'];
    const hideNavbar = hideNavbarPages.includes(location.pathname);

    return (
        <div className="layout-container">
            <div className="page-content">
                <Outlet />
            </div>
            {!hideNavbar && <Navbar />}
        </div>
    );
}

export default Layout;