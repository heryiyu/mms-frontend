import { createBrowserRouter } from 'react-router'
import GuestLayout from '../layouts/GuestLayout'
import MemberLayout from '../layouts/MemberLayout'
import GuestPlaceholder from '../pages/GuestPlaceholder'
import Home from '../pages/Home'
import NotFound from '../pages/NotFound'
import Profile from '../pages/Profile'
import RegisterPrivacy from '../pages/register/RegisterPrivacy'

export const router = createBrowserRouter([
  {
    element: <GuestLayout />,
    children: [
      { path: '/login', element: <GuestPlaceholder title="登入" brand /> },
      { path: '/register', element: <GuestPlaceholder title="創建帳號" /> },
      { path: '/register/privacy', element: <RegisterPrivacy /> },
      { path: '/forgot-password', element: <GuestPlaceholder title="忘記密碼" /> },
    ],
  },
  {
    element: <MemberLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/profile', element: <Profile /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
