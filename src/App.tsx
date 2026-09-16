import { AuthProvider } from './context/AuthContext';
import { RoleRouter } from './components/auth/RoleRouter';

export default function App() {
  return (
    <AuthProvider>
      <RoleRouter />
    </AuthProvider>
  );
}

