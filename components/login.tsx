import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Lock, User, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle, loginAdmin } = useAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = loginAdmin(username, password);
    if (!success) {
      setError('Credenciais inválidas');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-surface to-surface-container-low p-4">
      <div className="glass-panel max-w-md w-full p-12 rounded-xl text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Portal CPECC</h1>
          <p className="text-sm text-on-surface-variant">
            Acesse seu painel de pesquisador ou inicie um novo dossiê institucional.
          </p>
        </div>

        {!showAdminLogin ? (
          <div className="space-y-6">
            <button
              onClick={signInWithGoogle}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Entrar com Google
            </button>

            <button 
              onClick={() => setShowAdminLogin(true)}
              className="text-xs text-primary font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <ShieldCheck className="w-3 h-3" /> Acesso Administrativo
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-4 text-left">
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Login Administrativo
            </h2>
            
            <div>
              <label className="label-text">Usuário</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-on-surface-variant" />
                <input 
                  type="text" 
                  className="input-field pl-10" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div>
              <label className="label-text">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-on-surface-variant" />
                <input 
                  type="password" 
                  className="input-field pl-10" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            {error && <p className="text-xs text-error font-bold">{error}</p>}

            <button type="submit" className="btn-primary w-full">Entrar no Painel</button>
            
            <button 
              type="button"
              onClick={() => setShowAdminLogin(false)}
              className="text-xs text-on-surface-variant hover:underline w-full text-center"
            >
              Voltar para login de pesquisador
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-outline-variant">
          <p className="text-sm text-on-surface-variant mb-4">Primeiro acesso?</p>
          <p className="text-xs text-on-surface-variant">
            Faça login com sua conta Google para criar seu dossiê institucional.
          </p>
        </div>
      </div>
    </div>
  );
}
