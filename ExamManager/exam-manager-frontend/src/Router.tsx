import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/Home.page';
import LoginPage from './pages/Login.page';
import ExamTypePage from './pages/ExamType.page';

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
]);

export function Router() {
  return <RouterProvider router={router} />
}