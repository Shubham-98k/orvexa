import { useSelector, useDispatch } from 'react-redux';
import { loginUser, registerUser, logoutUser, checkAuth, clearAuthError } from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, loading, error } = useSelector((state) => state.auth);

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user,
    login: (emailOrUsername, password) => dispatch(loginUser({ emailOrUsername, password })).unwrap(),
    register: (formData) => dispatch(registerUser(formData)).unwrap(),
    logout: () => dispatch(logoutUser()),
    checkAuth: () => dispatch(checkAuth()),
    clearError: () => dispatch(clearAuthError()),
  };
};
