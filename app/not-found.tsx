import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-4 text-center">
      <h2 className="text-4xl font-bold text-primary mb-4">404 - Página Não Encontrada</h2>
      <p className="text-on-surface-variant mb-8">Desculpe, a página que você está procurando não existe.</p>
      <Link href="/" className="btn-primary">
        Voltar para o Início
      </Link>
    </div>
  );
}
