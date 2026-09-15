import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LegacyModulePage } from './pages/LegacyModulePage';
import { CourseAdminPage } from './pages/CourseAdminPage';
import { UserAdminPage } from './pages/UserAdminPage';
import './styles.css';

function ProtectedLayout() { const { user, loading } = useApp(); if (loading) return <div className="boot">Cargando La PolliWeb…</div>; return user ? <AppLayout /> : <Navigate to="/login" replace />; }
const legacy = module => <LegacyModulePage module={module} />;
createRoot(document.getElementById('root')).render(<React.StrictMode><ThemeProvider><AppProvider><BrowserRouter><Routes><Route path="/login" element={<LoginPage />} /><Route path="/app" element={<ProtectedLayout />}><Route path="dashboard" element={<DashboardPage />} /><Route path="students" element={legacy('students')} /><Route path="groups" element={legacy('groups')} /><Route path="assignments" element={legacy('assignments')} /><Route path="partials" element={legacy('partials')} /><Route path="finals" element={legacy('finals')} /><Route path="attendance" element={legacy('attendance')} /><Route path="planning" element={legacy('planning')} /><Route path="reports" element={legacy('reports')} /><Route path="admin/courses" element={<CourseAdminPage />} /><Route path="admin/users" element={<UserAdminPage />} /></Route><Route path="*" element={<Navigate to="/app/dashboard" replace />} /></Routes></BrowserRouter></AppProvider></ThemeProvider></React.StrictMode>);
