'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-4 text-center">
      <h2 className="text-4xl font-bold text-error mb-4">Algo deu errado!</h2>
      <p className="text-on-surface-variant mb-8">Ocorreu um erro inesperado. Por favor, tente novamente.</p>
      <button
        onClick={() => reset()}
        className="btn-primary"
      >
        Tentar Novamente
      </button>
    </div>
  );
}
