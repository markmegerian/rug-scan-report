import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface Inspection {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  notes: string | null;
  photo_urls: string[] | null;
  analysis_report: string | null;
  created_at: string;
}

interface Job {
  job_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

// Helper function to load image and convert to base64
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load image:', url, error);
    return null;
  }
};

// Helper to add photos to PDF
const addPhotosToPDF = async (
  doc: jsPDF, 
  photoUrls: string[], 
  startY: number, 
  margin: number,
  pageWidth: number,
  pageHeight: number
): Promise<number> => {
  let yPos = startY;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Inspection Photos', margin, yPos);
  yPos += 10;

  const photoWidth = 80;
  const photoHeight = 60;
  const photosPerRow = 2;
  const spacing = 10;
  
  let currentX = margin;
  let photosInRow = 0;

  for (const url of photoUrls) {
    // Check if we need a new page
    if (yPos + photoHeight > pageHeight - margin - 20) {
      doc.addPage();
      yPos = margin;
      currentX = margin;
      photosInRow = 0;
    }

    try {
      const base64 = await loadImageAsBase64(url);
      if (base64) {
        doc.addImage(base64, 'JPEG', currentX, yPos, photoWidth, photoHeight);
        
        photosInRow++;
        if (photosInRow >= photosPerRow) {
          yPos += photoHeight + spacing;
          currentX = margin;
          photosInRow = 0;
        } else {
          currentX += photoWidth + spacing;
        }
      }
    } catch (error) {
      console.error('Error adding image to PDF:', error);
    }
  }

  // If we ended mid-row, move yPos down
  if (photosInRow > 0) {
    yPos += photoHeight + spacing;
  }

  return yPos + 5;
};

export const generatePDF = async (inspection: Inspection): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = 20;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Rug Inspection Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Report Date: ${format(new Date(inspection.created_at), 'MMMM d, yyyy')}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );
  yPos += 20;

  // Client Information Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Information', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const clientInfo = [
    ['Name', inspection.client_name],
    ['Email', inspection.client_email || 'N/A'],
    ['Phone', inspection.client_phone || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: clientInfo,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Rug Details Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Rug Details', margin, yPos);
  yPos += 8;

  const rugDetails = [
    ['Rug Number', inspection.rug_number],
    ['Type', inspection.rug_type],
    [
      'Dimensions',
      inspection.length && inspection.width
        ? `${inspection.length}' × ${inspection.width}'`
        : 'N/A',
    ],
    ['Notes', inspection.notes || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: rugDetails,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Photos Section
  if (inspection.photo_urls && inspection.photo_urls.length > 0) {
    yPos = await addPhotosToPDF(doc, inspection.photo_urls, yPos, margin, pageWidth, pageHeight);
  }

  // AI Analysis Section
  if (inspection.analysis_report) {
    // Check if we need a new page
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Analysis & Recommendations', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Split the report into lines that fit the page width
    const maxWidth = pageWidth - margin * 2;
    const lines = doc.splitTextToSize(inspection.analysis_report, maxWidth);

    // Check if we need a new page
    const lineHeight = 5;

    for (let i = 0; i < lines.length; i++) {
      if (yPos + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(lines[i], margin, yPos);
      yPos += lineHeight;
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'Generated by RugInspect',
      margin,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save the PDF
  const fileName = `rug-inspection-${inspection.rug_number}-${format(
    new Date(inspection.created_at),
    'yyyy-MM-dd'
  )}.pdf`;
  doc.save(fileName);
};

export const generateJobPDF = async (job: Job, rugs: Inspection[]): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = 20;

  // Title Page
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Complete Job Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(`Job #${job.job_number}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 25;

  // Job Details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Information', margin, yPos);
  yPos += 8;

  const jobInfo = [
    ['Job Number', job.job_number],
    ['Status', job.status.charAt(0).toUpperCase() + job.status.slice(1)],
    ['Date Created', format(new Date(job.created_at), 'MMMM d, yyyy')],
    ['Total Rugs', rugs.length.toString()],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: jobInfo,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Client Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Information', margin, yPos);
  yPos += 8;

  const clientInfo = [
    ['Name', job.client_name],
    ['Email', job.client_email || 'N/A'],
    ['Phone', job.client_phone || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: clientInfo,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  if (job.notes) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Job Notes', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(job.notes, pageWidth - margin * 2);
    doc.text(notesLines, margin, yPos);
    yPos += notesLines.length * 5 + 10;
  }

  // Rugs Summary Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Rugs Summary', margin, yPos);
  yPos += 8;

  const rugsSummary = rugs.map((rug, index) => [
    (index + 1).toString(),
    rug.rug_number,
    rug.rug_type,
    rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : 'N/A',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Rug Number', 'Type', 'Dimensions']],
    body: rugsSummary,
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [139, 90, 43] },
    margin: { left: margin, right: margin },
  });

  // Individual Rug Reports
  for (let i = 0; i < rugs.length; i++) {
    const rug = rugs[i];
    doc.addPage();
    yPos = 20;

    // Rug Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rug ${i + 1}: ${rug.rug_number}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Rug Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Rug Details', margin, yPos);
    yPos += 8;

    const rugDetails = [
      ['Rug Number', rug.rug_number],
      ['Type', rug.rug_type],
      ['Dimensions', rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : 'N/A'],
      ['Inspected', format(new Date(rug.created_at), 'MMMM d, yyyy')],
    ];

    if (rug.notes) {
      rugDetails.push(['Notes', rug.notes]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: rugDetails,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Photos Section for this rug
    if (rug.photo_urls && rug.photo_urls.length > 0) {
      yPos = await addPhotosToPDF(doc, rug.photo_urls, yPos, margin, pageWidth, pageHeight);
    }

    // AI Analysis
    if (rug.analysis_report) {
      // Check if we need a new page
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Analysis & Recommendations', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const maxWidth = pageWidth - margin * 2;
      const lines = doc.splitTextToSize(rug.analysis_report, maxWidth);
      const lineHeight = 5;

      for (let j = 0; j < lines.length; j++) {
        if (yPos + lineHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(lines[j], margin, yPos);
        yPos += lineHeight;
      }
    }
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text('Generated by RugInspect', margin, pageHeight - 10);
    doc.text(`Job #${job.job_number}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // Save
  const fileName = `job-report-${job.job_number}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};
