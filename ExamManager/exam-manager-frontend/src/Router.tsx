import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/Home.page';
import LoginPage from './pages/Login.page';
import ExamTypePage from './pages/ExamType.page';
import ProfessionPage from './pages/Profession.page';
import InstitutionPage from './pages/Institution.page';
import ExaminerPage from './pages/Examiner.page';
import ExamPage from './pages/Exam.page';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path:'/login',
    element: <LoginPage />
  },
  {
    path: '/exams',
    element: <ExamPage />
  },
  {
    path: '/examiners',
    element: <ExaminerPage />
  },
  {
    path: '/exam-types',
    element: <ExamTypePage />
  },
  {
    path:'/institutions',
    element: <InstitutionPage />
  },
  {
    path: '/professions',
    element: <ProfessionPage />
  }
]);

export function Router() {
  return <RouterProvider router={router} />
}