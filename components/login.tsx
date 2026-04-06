import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Lock, User, ShieldCheck, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { signInWithPassword, signUp, loginAdmin } = useAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = loginAdmin(username, password);
    if (!success) {
      setError('Credenciais inválidas');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    let success = false;
    
    if (isRegistering) {
      success = await signUp(email, password);
      if (success) {
        setSuccessMessage('Conta criada com sucesso! Você já pode fazer login.');
        setIsRegistering(false);
        setPassword('');
      } else {
        setError('Erro ao criar conta. Verifique os dados ou se o e-mail já existe.');
      }
    } else {
      success = await signInWithPassword(email, password);
      if (!success) {
        setError('E-mail ou senha incorretos.');
      }
    }
    
    setLoading(false);
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
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 text-left">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <p className="text-sm">{successMessage}</p>
              </div>
            )}
            
            <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
              <div>
                <label className="label-text">E-mail do Pesquisador</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-on-surface-variant" />
                  <input 
                    type="email" 
                    className="input-field pl-10" 
                    placeholder="seu.email@instituicao.edu.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    minLength={6}
                  />
                </div>
              </div>

              {error && <p className="text-xs text-error font-bold">{error}</p>}

              <button 
                type="submit" 
                disabled={loading || !email || !password}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>{isRegistering ? 'Criar Conta' : 'Entrar'} <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
              
              <div className="text-center mt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-outline-variant">
              <button 
                onClick={() => setShowAdminLogin(true)}
                className="text-xs text-primary font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
              >
                <ShieldCheck className="w-3 h-3" /> Acesso Administrativo
              </button>
            </div>
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
          <p className="text-xs text-on-surface-variant">
            Plataforma de gestão de dossiês institucionais e projetos de pesquisa.
          </p>
        </div>
      </div>
    </div>
  );
}
