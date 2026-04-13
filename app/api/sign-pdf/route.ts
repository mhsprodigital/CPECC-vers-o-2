import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { fileUrl, signerName, documentName } = await request.json();

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    // Extract file ID from Google Drive URL
    const fileIdMatch = fileUrl.match(/\/d\/(.+?)\/|id=(.+?)(&|$)|file\/d\/(.+?)(\/|$)/);
    
    let arrayBuffer: ArrayBuffer;
    let contentType: string = '';

    if (fileIdMatch) {
      const fileId = fileIdMatch[1] || fileIdMatch[2] || fileIdMatch[4];
      // Download the PDF from Google Drive
      let downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      let response = await fetch(downloadUrl);
      
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to download file from Google Drive' }, { status: 500 });
      }

      arrayBuffer = await response.arrayBuffer();
      contentType = response.headers.get('content-type') || '';

      // If Google Drive returns an HTML page, it's likely a virus scan warning for large files
      if (contentType.includes('text/html')) {
        const html = new TextDecoder().decode(arrayBuffer);
        const confirmMatch = html.match(/confirm=([a-zA-Z0-9_]+)/);
        if (confirmMatch) {
          const confirmToken = confirmMatch[1];
          downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
          response = await fetch(downloadUrl);
          if (response.ok) {
            arrayBuffer = await response.arrayBuffer();
            contentType = response.headers.get('content-type') || '';
          }
        }
      }
    } else {
      // Try direct download if not a Google Drive URL
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          return NextResponse.json({ error: 'Failed to download file from provided URL' }, { status: 500 });
        }
        arrayBuffer = await response.arrayBuffer();
        contentType = response.headers.get('content-type') || '';
      } catch (err) {
        return NextResponse.json({ error: 'Invalid URL or failed to fetch file' }, { status: 400 });
      }
    }

    // Double check content type by inspecting the first few bytes if it's still text/html
    if (contentType.includes('text/html')) {
      const firstBytes = new Uint8Array(arrayBuffer.slice(0, 5));
      const preview = new TextDecoder().decode(firstBytes);
      if (preview === '%PDF-') {
        contentType = 'application/pdf';
      } else {
        return NextResponse.json({ error: 'O arquivo baixado não é um PDF válido (recebido HTML).' }, { status: 400 });
      }
    }

    let pdfDoc: PDFDocument;
    
    // Check if it's an image and convert to PDF if necessary
    if (contentType.includes('image/')) {
      pdfDoc = await PDFDocument.create();
      let image;
      try {
        if (contentType.includes('png')) {
          image = await pdfDoc.embedPng(arrayBuffer);
        } else {
          image = await pdfDoc.embedJpg(arrayBuffer);
        }
        
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        
        // Calculate aspect ratio to fit image on page
        const imgDims = image.scale(1);
        const ratio = Math.min(width / imgDims.width, height / imgDims.height) * 0.9;
        const finalWidth = imgDims.width * ratio;
        const finalHeight = imgDims.height * ratio;
        
        page.drawImage(image, {
          x: (width - finalWidth) / 2,
          y: (height - finalHeight) / 2,
          width: finalWidth,
          height: finalHeight,
        });
      } catch (imgErr) {
        console.error('Error embedding image:', imgErr);
        return NextResponse.json({ error: 'Falha ao processar imagem para o PDF.' }, { status: 400 });
      }
    } else {
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer);
      } catch (e) {
        console.error('Failed to parse PDF:', e);
        // Log the first few bytes to see what we actually got
        const firstBytes = new Uint8Array(arrayBuffer.slice(0, 50));
        const preview = new TextDecoder().decode(firstBytes);
        console.log('File Header Preview:', preview);
        
        return NextResponse.json({ 
          error: 'O arquivo não é um PDF válido ou imagem suportada.',
          details: `O servidor recebeu um arquivo que começa com: "${preview.substring(0, 20)}...".`
        }, { status: 400 });
      }
    }
    
    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Get all pages
    const pages = pdfDoc.getPages();
    
    // Generate signature data
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const signatureId = crypto.randomUUID();
    const hash = crypto.createHash('sha256').update(Buffer.from(arrayBuffer)).digest('hex').substring(0, 16);
    
    const signatureText = `Documento assinado eletronicamente por ${signerName}, Gestor(a) CPECC/ESPDF, em ${timestamp}.\nID: ${signatureId} | Hash: ${hash}`;

    // Add signature to the bottom of every page
    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText(signatureText, {
        x: 50,
        y: 30,
        size: 8,
        font: font,
        color: rgb(0, 0, 0.5),
      });
    }

    // Save the modified PDF
    const pdfBytes = await pdfDoc.save();
    const base64Pdf = Buffer.from(pdfBytes).toString('base64');

    return NextResponse.json({ 
      success: true, 
      base64: base64Pdf,
      signatureData: {
        id: signatureId,
        hash,
        timestamp,
        signerName
      }
    });

  } catch (error: any) {
    console.error('Error signing PDF:', error);
    return NextResponse.json({ error: error.message || 'Failed to sign PDF' }, { status: 500 });
  }
}
