import {Navigate} from "react-router-dom"
import {jwtDecode} from "jwt-decode"
import api from "../api";
import { REFRESH_TOKEN, ACCESS_TOKEN } from "../constants"
import { useState, useEffect } from "react"

function ProtectedRoute({children}) {
    const [isAuthorized, setIsAuthorized] = useState(null)

    useEffect(() => {
        auth ().catch(() => setIsAuthorized(false)) //call auth function
    }, [])

    const  refreshToken = async () => { //refresh access token immediately
        const refreshToken = localStorage.getItem(REFRESH_TOKEN)
        try{
            const res = await api.post("/api/token/refresh/", { 
                refresh: refreshToken,  //payload 
            });//send request to backend with refresh token to get new access token
            if (res.status === 200) { //res 200 means success
                localStorage.setItem(ACCESS_TOKEN, res.data.access) //set new access token in local storage
                setIsAuthorized(true)
            } else {
                setIsAuthorized(false)
            }
        }catch (error){
            console.log(error)
            setIsAuthorized(false)
        }

    }

    const auth = async () => { //check if token need to refresh or alllow to access
        const token = localStorage.getItem(ACCESS_TOKEN)
        if (!token) {
            setIsAuthorized(false)
            return
        }
        const decoded = jwtDecode(token)
        const tokenExpiration = decoded.exp 
        const now = Date.now() / 1000

        if (tokenExpiration < now) {
            await refreshToken()
        } else {
            setIsAuthorized(true) // if token is not yet expired, allow access
        }
        }

    if (isAuthorized === null) {
        return <div>Loading...</div>
    }

    return isAuthorized ? children : <Navigate to="/login" />//if true, reroute to login page
}
export default ProtectedRoute;