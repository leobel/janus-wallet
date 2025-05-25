import axios from './axios';

// authHandler.js
let signOutFunction: VoidFunction;

export const setSignOutFunction = (fn: VoidFunction) => {
  signOutFunction = fn;
};

const invokeSignOut = () => {
  if (typeof signOutFunction === 'function') {
    signOutFunction();
  }
};


export default function setupAxiosInterceptors(router: any) {
    axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response && (
        error.response.status === 401 ||
        error.response.status === 403
        )) {
        // Redirect to login page
        // window.location.href = '/login';
        invokeSignOut()
        router.navigate('/login')
      }
      return Promise.reject(error);
    }
  );
};
