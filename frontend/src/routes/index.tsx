import { createBrowserRouter } from 'react-router'
import MemberLayout from '../layouts/MemberLayout'
import Home from '../pages/Home'
import NotFound from '../pages/NotFound'
import Profile from '../pages/Profile'

export const router = createBrowserRouter([
  {
    element: <MemberLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/profile', element: <Profile /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
