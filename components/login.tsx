import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const success = await loginWithGoogle();
    if (!success) {
      setError('Erro ao fazer login com o Google.');
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-surface to-surface-container-low p-4">
      <div className="glass-panel max-w-md w-full p-12 rounded-xl text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Portal SIEPES</h1>
          <p className="text-sm text-on-surface-variant">
            Acesse seu painel de pesquisador ou inicie um novo dossiê institucional.
          </p>
        </div>

        <div className="space-y-6">
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com o Google
              </>
            )}
          </button>
          
          {error && <p className="text-xs text-error font-bold">{error}</p>}
        </div>

        <div className="mt-8 pt-6 border-t border-outline-variant">
          <p className="text-xs text-on-surface-variant flex items-center justify-center gap-1">
            <ShieldCheck className="w-4 h-4 text-primary" /> Login seguro para Pesquisadores e Gestores
          </p>
        </div>
      </div>
    </div>
  );
}
