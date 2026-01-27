import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { DashboardPage } from './pages/Dashboard.page';
import ExamPage from './pages/Exam.page';
import ExaminerPage from './pages/Examiner.page';
import ExamTypePage from './pages/ExamType.page';
import ForgotPassword from './pages/ForgotPassword.page';
import { HomePage } from './pages/Home.page';
import InstitutionPage from './pages/Institution.page';
import { LoginPage } from './pages/Login.page';
import ProfessionPage from './pages/Profession.page';
import OperatorPage from './pages/Operator.page';
import { SettingsPage } from './pages/Settings.page';
import BackupPage from './pages/Backup.page';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot',
    element: <ForgotPassword />,
  },
  {
    path: '/exams',
    element: <ExamPage />,
  },
  {
    path: '/examiners',
    element: <ExaminerPage />,
  },
  {
    path: '/exam-types',
    element: <ExamTypePage />,
  },
  {
    path: '/institutions',
    element: <InstitutionPage />,
  },
  {
    path: '/professions',
    element: <ProfessionPage />,
  },
  {
    path: '/operators',
    element: <OperatorPage />,
  },
  {
    path: '/backups',
    element: <BackupPage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
