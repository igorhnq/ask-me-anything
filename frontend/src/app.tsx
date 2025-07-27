import { Toaster } from 'sonner'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import CreateRoom from './pages/create-room'
import Room from './pages/room'

const router = createBrowserRouter([
  {
    path: '/',
    element: <CreateRoom />
  },
  {
    path: '/room/:roomId',
    element: <Room />
  }
])

export default function App() {
  return (
    <>
      <Toaster invert richColors />
      <RouterProvider router={router} />
    </>
  )
}