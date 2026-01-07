import react from "react"
import {BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Home from "./pages/Home"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoutes"

function Logout() {
  localStorage.clear(); //clear access and refresh token 
  return <Navigate to="/login" />; //redirect to login page
}

function RegisterAndLogout() {
  localStorage.clear();
  return <Register />;
}

function App() { 
  return (
    <BrowserRouter>
      <Routes> 
        <Route
            path="/"
            element={
              <ProtectedRoute> {/* cannot access routes inside without the access token and validity */}
                <Home />
              </ProtectedRoute>
            }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<RegisterAndLogout />} />
        <Route path="*" element={<NotFound />}></Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
