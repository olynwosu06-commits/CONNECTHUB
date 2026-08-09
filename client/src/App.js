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

// ✅ Check token fresh every time a route renders
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
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
                </Route>
            </Route>
        )
    );

    return <RouterProvider router={router} />;
}

export default App;