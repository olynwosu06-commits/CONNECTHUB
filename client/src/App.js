import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Status from './pages/Status';
import Groups from './pages/Groups';
import Loading from './pages/Loading';
import RootLayout from './layout/Layout';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard'; // ✅ NEW
import NotificationsPage from './pages/NotificationsPage';

// ✅ Check token fresh every time a route renders
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
};

// ✅ NEW: Only lets the request through if BOTH logged in AND role is admin
const AdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/login" />;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') return <Navigate to="/home" />;

    return children;
};

function App() {
    const router = createBrowserRouter(
        createRoutesFromElements(
            <Route path="/">
                {/* AUTH ROUTES */}
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />

                {/* PROTECTED ROUTES */}
                <Route element={<RootLayout />}>
                    <Route
                        index
                        element={<ProtectedRoute><Home /></ProtectedRoute>}
                    />
                    <Route path="loading" element={<Loading />} />
                    <Route
                        path="home"
                        element={<ProtectedRoute><Home /></ProtectedRoute>}
                    />
                    <Route
                        path="profile"
                        element={<ProtectedRoute><Profile /></ProtectedRoute>}
                    />
                    <Route
                        path="status"
                        element={<ProtectedRoute><Status /></ProtectedRoute>}
                    />
                    <Route
                        path="groups"
                        element={<ProtectedRoute><Groups /></ProtectedRoute>}
                    />
                    <Route
                        path="settings"
                        element={<ProtectedRoute><Settings /></ProtectedRoute>}
                    />
                    {/* ✅ NEW: Admin dashboard — only reachable if role === 'admin' */}
                    <Route
                        path="admin"
                        element={<AdminRoute><AdminDashboard /></AdminRoute>}
                    />
                    <Route
                        path="notifications"
                        element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>}
                    />
                </Route>
            </Route>
        )
    );

    return <RouterProvider router={router} />;
}

export default App;