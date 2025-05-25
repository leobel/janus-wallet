import axios from 'axios'
const BASE_URL = 'http://localhost:3001'

export default axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
})

export const axiosPublic = axios.create({
    baseURL: BASE_URL
})

export const axiosExternal = axios.create()