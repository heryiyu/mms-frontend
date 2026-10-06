import { createBrowserRouter } from 'react-router'
import GuestLayout from '../layouts/GuestLayout'
import MainLayout from '../layouts/MainLayout'
import GuestPlaceholder from '../pages/GuestPlaceholder'
import Home from '../pages/Home'
import NotFound from '../pages/NotFound'
import Profile from '../pages/Profile'

export const router = createBrowserRouter([
  {
    element: <GuestLayout />,
    children: [
      { path: '/login', element: <GuestPlaceholder title="登入" brand /> },
      { path: '/register', element: <GuestPlaceholder title="創建帳號" /> },
      { path: '/forgot-password', element: <GuestPlaceholder title="忘記密碼" /> },
    ],
  },
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/profile', element: <Profile /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
