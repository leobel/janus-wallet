import axios from './axios';

export default function setupAxiosInterceptors(router: any) {
    axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        // Redirect to login page
        // window.location.href = '/login';
        router.navigate('/login')
      }
      return Promise.reject(error);
    }
  );
};
