import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ModulePage } from './pages/ModulePage';
import { CourseAdminPage } from './pages/CourseAdminPage';
import { UserAdminPage } from './pages/UserAdminPage';
import { ProfilePage } from './pages/ProfilePage';
import './styles.css';

function ProtectedLayout() { const { user, loading } = useApp(); if (loading) return <div className="boot">Cargando La PolliWeb…</div>; return user ? <AppLayout /> : <Navigate to="/login" replace />; }
const modulePage = module => <ModulePage module={module} />;
createRoot(document.getElementById('root')).render(<React.StrictMode><ThemeProvider><AppProvider><BrowserRouter><Routes><Route path="/login" element={<LoginPage />} /><Route path="/app" element={<ProtectedLayout />}><Route path="dashboard" element={<DashboardPage />} /><Route path="students" element={modulePage('students')} /><Route path="groups" element={modulePage('groups')} /><Route path="assignments" element={modulePage('assignments')} /><Route path="partials" element={modulePage('partials')} /><Route path="finals" element={modulePage('finals')} /><Route path="attendance" element={modulePage('attendance')} /><Route path="planning" element={modulePage('planning')} /><Route path="reports" element={modulePage('reports')} /><Route path="profile" element={<ProfilePage />} /><Route path="admin/courses" element={<CourseAdminPage />} /><Route path="admin/users" element={<UserAdminPage />} /></Route><Route path="*" element={<Navigate to="/app/dashboard" replace />} /></Routes></BrowserRouter></AppProvider></ThemeProvider></React.StrictMode>);
