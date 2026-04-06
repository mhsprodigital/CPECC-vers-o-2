export const uploadToGoogleDrive = async (
  file: File,
  researcherName: string,
  researcherCpf: string,
  scriptUrl: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        
        const payload = {
          fileName: file.name,
          mimeType: file.type,
          fileData: base64Data,
          researcherName: researcherName,
          researcherCpf: researcherCpf
        };

        const response = await fetch(scriptUrl, {
          method: 'POST',
          body: JSON.stringify(payload),
          // mode: 'no-cors' // Use no-cors if you don't need to read the response, but we need the URL back
        });

        const result = await response.json();
        
        if (result.success) {
          resolve(result.url);
        } else {
          reject(new Error(result.error || 'Erro ao fazer upload para o Google Drive'));
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = error => reject(error);
  });
};
