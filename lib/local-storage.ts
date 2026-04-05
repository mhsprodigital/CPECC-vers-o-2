export const saveToLocal = (collectionName: string, data: any) => {
  const existing = JSON.parse(localStorage.getItem(collectionName) || '[]');
  
  // If it's a profile update (has uid), update or insert
  if (data.uid) {
    const index = existing.findIndex((item: any) => item.uid === data.uid);
    if (index >= 0) {
      existing[index] = { ...existing[index], ...data };
    } else {
      existing.push({ ...data, id: data.uid });
    }
  } else {
    // Normal insert
    existing.push({ ...data, id: Date.now().toString() });
  }
  
  localStorage.setItem(collectionName, JSON.stringify(existing));
  return data;
};

export const getFromLocal = (collectionName: string, queryField?: string, queryValue?: string) => {
  const existing = JSON.parse(localStorage.getItem(collectionName) || '[]');
  if (queryField && queryValue) {
    return existing.filter((item: any) => item[queryField] === queryValue);
  }
  return existing;
};

export const getOneFromLocal = (collectionName: string, id: string) => {
  const existing = JSON.parse(localStorage.getItem(collectionName) || '[]');
  return existing.find((item: any) => item.id === id || item.uid === id);
};

export const removeFromLocal = (collectionName: string, id: string) => {
  const existing = JSON.parse(localStorage.getItem(collectionName) || '[]');
  const updated = existing.filter((item: any) => item.id !== id && item.uid !== id);
  localStorage.setItem(collectionName, JSON.stringify(updated));
  return updated;
};

export const mockUploadFile = async (file: File): Promise<string> => {
  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 800));
  // Return a fake URL
  return `https://mock-storage.local/${encodeURIComponent(file.name)}`;
};

// Seed mock data for testing
export const seedMockData = (uid?: string) => {
  // Initialize Admin Users if not exists
  const hasAdmins = localStorage.getItem('admins');
  if (!hasAdmins) {
    const defaultAdmins = [
      { id: 'admin-1', username: 'admin', password: 'admin', name: 'Administrador Global', role: 'admin' }
    ];
    localStorage.setItem('admins', JSON.stringify(defaultAdmins));
  }

  if (!uid) return;

  const hasData = localStorage.getItem('fomento_pesquisa');
  if (hasData) return; // Already seeded

  const mockPesquisa = [
    {
      id: 'mock-1',
      authorUid: uid,
      titulo: 'Estudo Clínico sobre Novos Biomarcadores',
      status: 'Aprovado',
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: 'mock-2',
      authorUid: uid,
      titulo: 'Análise Epidemiológica 2026',
      status: 'Em Análise',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    }
  ];

  const mockPublicacao = [
    {
      id: 'mock-3',
      authorUid: uid,
      titulo: 'Impacto da Inteligência Artificial na Saúde Pública',
      revista: 'Nature Medicine',
      status: 'Pendente',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    }
  ];

  const mockPicite = [
    {
      id: 'mock-4',
      authorUid: uid,
      titulo_projeto: 'Iniciação Científica em Genética',
      nome_estudante: 'Ana Silva',
      status: 'Aprovado',
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    }
  ];

  localStorage.setItem('fomento_pesquisa', JSON.stringify(mockPesquisa));
  localStorage.setItem('fomento_publicacao', JSON.stringify(mockPublicacao));
  localStorage.setItem('picite', JSON.stringify(mockPicite));
};
