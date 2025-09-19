import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/Home.page';
import LoginPage from './pages/Login.page';
import ExamTypePage from './pages/ExamType.page';
import ProfessionPage from './pages/Profession.page';

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
    path: '/exam-types',
    element: <ExamTypePage />
  },
  {
    path: '/professions',
    element: <ProfessionPage />
  }
]);

export function Router() {
  return <RouterProvider router={router} />
}