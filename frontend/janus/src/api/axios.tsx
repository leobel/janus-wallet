import axios from 'axios'

export default axios.create({
    baseURL: import.meta.env.VITE_SERVER_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
})

export const axiosPublic = axios.create({
    baseURL: import.meta.env.VITE_SERVER_BASE_URL
})

export const axiosExternal = axios.create()