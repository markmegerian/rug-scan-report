import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface ImageAnnotation {
  label: string;
  location: string;
  x: number;
  y: number;
}

export interface PhotoAnnotations {
  photoIndex: number;
  annotations: ImageAnnotation[];
}

export interface Inspection {
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
  image_annotations?: PhotoAnnotations[] | unknown | null;
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

export interface BusinessBranding {
  business_name: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  logo_url: string | null;
}

export interface UpsellService {
  name: string;
  unitPrice: number;
  description?: string;
}

// ========================
// LUXURY MEGERIAN COLOR PALETTE
// ========================
const COLORS = {
  // Primary - Navy for headers and text
  navy: [26, 61, 92] as [number, number, number],
  
  // Accent - Teal for secondary elements
  teal: [44, 95, 124] as [number, number, number],
  
  // Decorative - Gold/Bronze for accents
  gold: [139, 115, 85] as [number, number, number],
  goldLight: [178, 156, 121] as [number, number, number],
  
  // Backgrounds
  cream: [250, 248, 245] as [number, number, number],
  lightBlue: [232, 241, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  
  // Text
  text: [45, 45, 50] as [number, number, number],
  textMuted: [100, 100, 105] as [number, number, number],
  
  // Borders
  border: [200, 200, 195] as [number, number, number],
  borderLight: [220, 220, 215] as [number, number, number],
};

// ========================
// HELPER FUNCTIONS
// ========================

const compressImage = (
  img: HTMLImageElement,
  maxWidth: number = 600,
  maxHeight: number = 450,
  quality: number = 0.5
): string => {
  const canvas = document.createElement('canvas');
  let { width, height } = img;
  
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }
  
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
};

const loadImageAsBase64 = async (url: string, forEmail: boolean = false): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxW = forEmail ? 400 : 600;
          const maxH = forEmail ? 300 : 450;
          const quality = forEmail ? 0.35 : 0.5;
          const compressed = compressImage(img, maxW, maxH, quality);
          resolve(compressed || null);
        } catch (e) {
          console.error('Compression failed:', e);
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        }
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error('Failed to load image:', url, error);
    return null;
  }
};

// ========================
// ELEGANT BORDER SYSTEM
// ========================

const drawElegantBorder = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
  const outerMargin = 12;
  const innerMargin = 15;
  const cornerSize = 20;
  
  // Outer border line (light)
  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.5);
  doc.rect(outerMargin, outerMargin, pageWidth - outerMargin * 2, pageHeight - outerMargin * 2);
  
  // Inner border line (teal)
  doc.setDrawColor(...COLORS.teal);
  doc.setLineWidth(0.3);
  doc.rect(innerMargin, innerMargin, pageWidth - innerMargin * 2, pageHeight - innerMargin * 2);
  
  // Gold corner accents - Top Left
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(1.5);
  doc.line(outerMargin - 2, outerMargin + cornerSize, outerMargin - 2, outerMargin - 2);
  doc.line(outerMargin - 2, outerMargin - 2, outerMargin + cornerSize, outerMargin - 2);
  
  // Top Right
  doc.line(pageWidth - outerMargin - cornerSize, outerMargin - 2, pageWidth - outerMargin + 2, outerMargin - 2);
  doc.line(pageWidth - outerMargin + 2, outerMargin - 2, pageWidth - outerMargin + 2, outerMargin + cornerSize);
  
  // Bottom Left
  doc.line(outerMargin - 2, pageHeight - outerMargin - cornerSize, outerMargin - 2, pageHeight - outerMargin + 2);
  doc.line(outerMargin - 2, pageHeight - outerMargin + 2, outerMargin + cornerSize, pageHeight - outerMargin + 2);
  
  // Bottom Right
  doc.line(pageWidth - outerMargin - cornerSize, pageHeight - outerMargin + 2, pageWidth - outerMargin + 2, pageHeight - outerMargin + 2);
  doc.line(pageWidth - outerMargin + 2, pageHeight - outerMargin - cornerSize, pageWidth - outerMargin + 2, pageHeight - outerMargin + 2);
};

// Section header with gold underline
const drawSectionHeader = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number
): number => {
  // Light blue background
  doc.setFillColor(...COLORS.lightBlue);
  doc.rect(x, y - 6, width, 14, 'F');
  
  // Left teal bar
  doc.setFillColor(...COLORS.teal);
  doc.rect(x, y - 6, 4, 14, 'F');
  
  // Section title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text(text, x + 10, y + 2);
  
  // Gold underline
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.8);
  doc.line(x + 10, y + 5, x + 10 + doc.getTextWidth(text), y + 5);
  
  return y + 16;
};

// Rug entry box with cream background and teal border
const drawRugEntryHeader = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number
): number => {
  // Cream background with teal border
  doc.setFillColor(...COLORS.cream);
  doc.setDrawColor(...COLORS.teal);
  doc.setLineWidth(0.5);
  doc.rect(x, y - 4, width, 12, 'FD');
  
  // Rug title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text(text, x + 6, y + 3);
  
  return y + 14;
};

// Gold horizontal rule
const drawGoldRule = (doc: jsPDF, x: number, y: number, width: number): void => {
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(x, y, x + width, y);
};

// Thin divider line
const drawThinDivider = (doc: jsPDF, x: number, y: number, width: number): void => {
  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.2);
  doc.line(x, y, x + width, y);
};

// ========================
// SERVICE DESCRIPTION EXTRACTION
// ========================

interface ServiceDescription {
  name: string;
  description: string;
}

const extractAllServiceDescriptions = (rugs: Inspection[]): ServiceDescription[] => {
  const serviceMap = new Map<string, ServiceDescription>();
  
  for (const rug of rugs) {
    if (!rug.analysis_report) continue;
    
    const report = rug.analysis_report;
    const servicesSectionMatch = report.match(
      /(?:COMPREHENSIVE\s+SERVICE\s+DESCRIPTIONS?|RECOMMENDED\s+SERVICES?|SERVICE\s+DESCRIPTIONS?)\s*\n+([\s\S]*?)(?=\n\s*(?:RUG\s+BREAKDOWN|ESTIMATED\s+SERVICES|RUG\s+#|TOTAL\s+ESTIMATE|ADDITIONAL\s+RECOMMENDED|NEXT\s+STEPS|Sincerely)|$)/i
    );
    
    if (servicesSectionMatch) {
      const servicesText = servicesSectionMatch[1].trim();
      const serviceParagraphs = servicesText.split(/\n\n+/).filter(p => p.trim());
      
      for (const para of serviceParagraphs) {
        const trimmedPara = para.trim();
        if (!trimmedPara || trimmedPara.length < 20) continue;
        
        const colonMatch = trimmedPara.match(/^([A-Z][A-Za-z\s&\/\-]+?):\s*(.+)/s);
        
        if (colonMatch) {
          const name = colonMatch[1].trim();
          const description = colonMatch[2].trim().replace(/\s+/g, ' ');
          
          if (name.length > 3 && description.length > 30) {
            const key = name.toLowerCase();
            if (!serviceMap.has(key)) {
              serviceMap.set(key, { name, description });
            }
          }
        }
      }
    }
  }
  
  return Array.from(serviceMap.values());
};

// ========================
// COST EXTRACTION
// ========================

interface CostLine {
  service: string;
  cost: number;
}

interface RugCostBreakdown {
  rugNumber: string;
  rugType: string;
  dimensions: string;
  items: CostLine[];
  subtotal: number;
  specialNote?: string;
}

const extractRugCosts = (rug: Inspection): RugCostBreakdown | null => {
  if (!rug.analysis_report) return null;
  
  const lines = rug.analysis_report.split('\n');
  const items: CostLine[] = [];
  let subtotal = 0;
  let specialNote = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    const costMatch = trimmed.match(/\$[\d,]+(?:\.\d{2})?/);
    
    if (costMatch) {
      const cost = parseFloat(costMatch[0].replace(/[$,]/g, ''));
      const lowerLine = trimmed.toLowerCase();
      
      if (lowerLine.includes('total estimate') || 
          (lowerLine.includes('total') && !lowerLine.includes('subtotal'))) {
        subtotal = cost;
        break;
      }
      
      let serviceName = trimmed.replace(/[:.]?\s*\$[\d,]+(?:\.\d{2})?.*$/, '').trim();
      serviceName = serviceName.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim();
      
      if (serviceName && cost > 0) {
        items.push({ service: serviceName, cost });
      }
    }
    
    if (trimmed.toLowerCase().startsWith('note:') || trimmed.toLowerCase().startsWith('special note:')) {
      specialNote = trimmed.replace(/^(?:special\s+)?note:\s*/i, '');
    }
  }
  
  if (subtotal === 0 && items.length > 0) {
    subtotal = items.reduce((sum, item) => sum + item.cost, 0);
  }
  
  const dimensions = rug.length && rug.width 
    ? `${rug.length}' × ${rug.width}'`
    : '';
  
  return {
    rugNumber: rug.rug_number,
    rugType: rug.rug_type,
    dimensions,
    items,
    subtotal,
    specialNote: specialNote || undefined
  };
};

// Photo labels
const PHOTO_LABELS = [
  'Overall Front',
  'Overall Back', 
  'Detail - Fringe',
  'Detail - Edge',
  'Issue Area'
];

// ========================
// PHOTO SECTION
// ========================

const addPhotosToPDF = async (
  doc: jsPDF,
  photoUrls: string[],
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  branding?: BusinessBranding | null,
  imageAnnotations?: PhotoAnnotations[] | unknown | null,
  forEmail: boolean = false,
  skipHeader: boolean = false
): Promise<number> => {
  let yPos = startY;
  
  const annotations: PhotoAnnotations[] = Array.isArray(imageAnnotations) ? imageAnnotations : [];
  
  if (!skipHeader) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.navy);
    doc.text('Inspection Photos', margin, yPos);
    yPos += 8;
  }
  
  const photoWidth = (pageWidth - margin * 2 - 10) / 2;
  const photoHeight = photoWidth * 0.75;
  const spacing = 10;
  
  for (let i = 0; i < photoUrls.length; i += 2) {
    const maxLegendHeight = 25;
    const rowHeight = photoHeight + maxLegendHeight + 8;
    
    if (yPos + rowHeight > pageHeight - 30) {
      doc.addPage();
      drawElegantBorder(doc, pageWidth, pageHeight);
      yPos = 30;
    }
    
    for (let j = 0; j < 2 && (i + j) < photoUrls.length; j++) {
      const photoIndex = i + j;
      const url = photoUrls[photoIndex];
      const xPos = margin + j * (photoWidth + spacing);
      
      const photoAnnotation = annotations.find(a => a.photoIndex === photoIndex);
      const photoMarkers = photoAnnotation?.annotations || [];
      
      try {
        const base64 = await loadImageAsBase64(url, forEmail);
        if (base64) {
          const photoLabel = PHOTO_LABELS[photoIndex] || `Photo ${photoIndex + 1}`;
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.textMuted);
          doc.text(photoLabel, xPos, yPos);
          
          const photoY = yPos + 3;
          
          // Shadow effect
          doc.setFillColor(...COLORS.border);
          doc.rect(xPos + 1, photoY + 1, photoWidth, photoHeight, 'F');
          
          doc.addImage(base64, 'JPEG', xPos, photoY, photoWidth, photoHeight);
          
          // Teal border
          doc.setDrawColor(...COLORS.teal);
          doc.setLineWidth(0.5);
          doc.rect(xPos, photoY, photoWidth, photoHeight, 'S');
          
          // Markers
          if (photoMarkers.length > 0) {
            for (let k = 0; k < photoMarkers.length; k++) {
              const marker = photoMarkers[k];
              const markerX = xPos + (marker.x / 100) * photoWidth;
              const markerY = photoY + (marker.y / 100) * photoHeight;
              
              doc.setFillColor(...COLORS.gold);
              doc.circle(markerX, markerY, 2.5, 'F');
              doc.setDrawColor(...COLORS.white);
              doc.setLineWidth(0.6);
              doc.circle(markerX, markerY, 2.5, 'S');
              
              doc.setFontSize(6);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...COLORS.white);
              doc.text((k + 1).toString(), markerX, markerY + 0.7, { align: 'center' });
            }
          }
          
          // Legend
          if (photoMarkers.length > 0) {
            let legendY = photoY + photoHeight + 4;
            doc.setFontSize(7);
            const maxLabelWidth = photoWidth - 14;
            
            let totalLegendHeight = 4;
            const markerLineInfo: { lines: string[]; lineCount: number }[] = [];
            for (const marker of photoMarkers) {
              const labelLines = doc.splitTextToSize(marker.label, maxLabelWidth);
              markerLineInfo.push({ lines: labelLines, lineCount: labelLines.length });
              totalLegendHeight += labelLines.length * 3.5 + 2;
            }
            
            doc.setFillColor(...COLORS.cream);
            doc.roundedRect(xPos, legendY - 2, photoWidth, totalLegendHeight, 2, 2, 'F');
            
            for (let k = 0; k < photoMarkers.length; k++) {
              const labelLines = markerLineInfo[k].lines;
              
              doc.setFillColor(...COLORS.gold);
              doc.circle(xPos + 5, legendY + 1, 2, 'F');
              doc.setTextColor(...COLORS.white);
              doc.setFont('helvetica', 'bold');
              doc.text((k + 1).toString(), xPos + 5, legendY + 1.7, { align: 'center' });
              
              doc.setTextColor(...COLORS.text);
              doc.setFont('helvetica', 'normal');
              labelLines.forEach((labelLine: string, lineIdx: number) => {
                doc.text(labelLine, xPos + 9, legendY + 2 + (lineIdx * 3.5));
              });
              
              legendY += labelLines.length * 3.5 + 2;
            }
          }
        }
      } catch (error) {
        console.error('Error adding image to PDF:', error);
      }
    }
    
    yPos += photoHeight + 28;
  }
  
  return yPos;
};

// ========================
// MAIN PDF GENERATION - LUXURY MEGERIAN FORMAT
// ========================

export const generateJobPDF = async (
  job: Job,
  rugs: Inspection[],
  branding?: BusinessBranding | null,
  upsellServices?: UpsellService[]
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  
  const businessName = branding?.business_name || 'RugBoost';
  
  // ============ PAGE 1: COVER PAGE ============
  
  drawElegantBorder(doc, pageWidth, pageHeight);
  
  let yPos = 45;
  
  // Business name - large, centered, navy with letter spacing
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text(businessName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  // Subtitle
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.teal);
  doc.text('RUGS & CARPET CLEANERS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  // Gold underline under business name
  const businessNameWidth = 80;
  drawGoldRule(doc, (pageWidth - businessNameWidth) / 2, yPos, businessNameWidth);
  yPos += 10;
  
  // Address with dot separator
  if (branding?.business_address || branding?.business_phone) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    
    const addressParts = [];
    if (branding?.business_address) addressParts.push(branding.business_address);
    const addressLine = addressParts.join(' · ');
    doc.text(addressLine, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    
    if (branding?.business_phone) {
      doc.text(`Telephone ${branding.business_phone}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
  }
  
  yPos += 5;
  
  // Thin divider
  drawThinDivider(doc, margin, yPos, contentWidth);
  yPos += 15;
  
  // RESTORATION ESTIMATE header box
  yPos = drawSectionHeader(doc, 'RESTORATION ESTIMATE', margin, yPos, contentWidth);
  yPos += 10;
  
  // Two-column layout: Estimate Number | Date Prepared
  const colWidth = contentWidth / 2;
  
  // Left column - Estimate Number
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text('ESTIMATE NUMBER', margin, yPos);
  yPos += 6;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(job.job_number, margin, yPos);
  
  // Right column - Date Prepared
  const rightCol = margin + colWidth;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text('DATE PREPARED', rightCol, yPos - 6);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(format(new Date(job.created_at), 'MMMM d, yyyy'), rightCol, yPos);
  
  yPos += 15;
  
  // Prepared For section
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text('PREPARED FOR', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(job.client_name, margin, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  if (job.client_phone) {
    doc.text(`Telephone: ${job.client_phone}`, margin, yPos);
    yPos += 5;
  }
  if (job.client_email) {
    doc.text(`Email: ${job.client_email}`, margin, yPos);
    yPos += 5;
  }
  
  yPos += 12;
  
  // Introduction letter
  const firstName = job.client_name.split(' ')[0];
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.text);
  doc.text(`Dear ${firstName},`, margin, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  const introText = `We are honored to present this comprehensive estimate for the restoration and preservation of your distinguished collection of Oriental rugs. Our meticulous assessment has identified specialized treatments designed to restore the beauty, structural integrity, and longevity of each treasured piece.`;
  
  const introLines = doc.splitTextToSize(introText, contentWidth);
  introLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });
  
  yPos += 5;
  drawThinDivider(doc, margin, yPos, contentWidth);
  
  // ============ PAGE 2+: COMPREHENSIVE SERVICE DESCRIPTIONS ============
  
  doc.addPage();
  drawElegantBorder(doc, pageWidth, pageHeight);
  yPos = 30;
  
  yPos = drawSectionHeader(doc, 'COMPREHENSIVE SERVICE DESCRIPTIONS', margin, yPos, contentWidth);
  yPos += 8;
  
  const serviceDescriptions = extractAllServiceDescriptions(rugs);
  
  const defaultServices: ServiceDescription[] = [
    { name: 'Professional Hand Cleaning', description: 'Our specialized hand cleaning process utilizes an immersion method specifically designed for delicate Oriental rugs, safely removing embedded soil, allergens, and contaminants that accumulate over time. We carefully assess each rug\'s unique fiber composition, dye stability, and construction to determine the most appropriate cleaning agents and techniques.' },
    { name: 'Overnight Soaking', description: 'This intensive deep-cleaning treatment involves submerging your rug in a specially formulated solution for an extended period under careful monitoring. The process allows cleaning agents to penetrate deep into the foundation, dissolving contaminants, allergens, and odors that standard cleaning cannot reach.' },
    { name: 'Blocking & Stretching', description: 'This essential restoration process corrects dimensional distortion in handwoven rugs by carefully realigning warp and weft threads to restore proper shape. Using specialized equipment, we gradually stretch the rug to its correct dimensions while damp, then secure it until completely dry.' },
    { name: 'Custom Padding', description: 'Our premium custom padding provides crucial support between your rug and floor surface using high-density, non-slip materials precisely cut to your rug\'s dimensions. This specialized padding extends your rug\'s lifespan by reducing fiber compression while allowing proper airflow.' }
  ];
  
  const servicesToShow = serviceDescriptions.length > 0 ? serviceDescriptions : defaultServices;
  
  for (const service of servicesToShow) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      drawElegantBorder(doc, pageWidth, pageHeight);
      yPos = 30;
    }
    
    // Service name in teal with dash bullet
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.teal);
    doc.text(`- ${service.name}`, margin, yPos);
    yPos += 7;
    
    // Description
    if (service.description) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      const descLines = doc.splitTextToSize(service.description, contentWidth - 5);
      descLines.forEach((line: string) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          drawElegantBorder(doc, pageWidth, pageHeight);
          yPos = 30;
        }
        doc.text(line, margin + 5, yPos);
        yPos += 4.5;
      });
    }
    
    yPos += 8;
  }
  
  // ============ RUG BREAKDOWN & SERVICES ============
  
  doc.addPage();
  drawElegantBorder(doc, pageWidth, pageHeight);
  yPos = 30;
  
  yPos = drawSectionHeader(doc, 'RUG BREAKDOWN & SERVICES', margin, yPos, contentWidth);
  yPos += 8;
  
  let grandTotal = 0;
  
  for (const rug of rugs) {
    const costs = extractRugCosts(rug);
    if (!costs || costs.items.length === 0) continue;
    
    if (yPos > pageHeight - 80) {
      doc.addPage();
      drawElegantBorder(doc, pageWidth, pageHeight);
      yPos = 30;
    }
    
    // Rug header in cream box
    const dimensionStr = costs.dimensions ? ` (${costs.dimensions})` : '';
    yPos = drawRugEntryHeader(doc, `Rug #${costs.rugNumber}: ${costs.rugType}${dimensionStr}`, margin, yPos, contentWidth);
    yPos += 4;
    
    // Service items with dash and price
    for (const item of costs.items) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      doc.text(`- ${item.service}`, margin + 8, yPos);
      
      // Price in gold, italic, right-aligned
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.gold);
      doc.text(`$${item.cost.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 5;
    }
    
    // Subtotal with gold accent line
    yPos += 2;
    drawGoldRule(doc, margin + 8, yPos, contentWidth - 16);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.navy);
    doc.text('Subtotal', margin + 8, yPos);
    
    doc.setTextColor(...COLORS.gold);
    doc.text(`$${costs.subtotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;
    
    // Special note if present
    if (costs.specialNote) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.textMuted);
      const noteLines = doc.splitTextToSize(`* ${costs.specialNote}`, contentWidth - 16);
      noteLines.forEach((line: string) => {
        doc.text(line, margin + 8, yPos);
        yPos += 4;
      });
    }
    
    grandTotal += costs.subtotal;
    yPos += 10;
  }
  
  // ============ TOTAL INVESTMENT ============
  
  if (yPos > pageHeight - 50) {
    doc.addPage();
    drawElegantBorder(doc, pageWidth, pageHeight);
    yPos = 30;
  }
  
  yPos += 10;
  
  // Gold-bordered total box
  doc.setFillColor(...COLORS.cream);
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(1.5);
  doc.roundedRect(margin, yPos - 4, contentWidth, 20, 3, 3, 'FD');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text('TOTAL INVESTMENT', margin + 10, yPos + 8);
  
  doc.setTextColor(...COLORS.gold);
  doc.text(`$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 10, yPos + 8, { align: 'right' });
  
  yPos += 30;
  
  // ============ NEXT STEPS ============
  
  if (yPos > pageHeight - 80) {
    doc.addPage();
    drawElegantBorder(doc, pageWidth, pageHeight);
    yPos = 30;
  }
  
  yPos = drawSectionHeader(doc, 'NEXT STEPS', margin, yPos, contentWidth);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  
  const nextStepsText = `These recommendations reflect our thorough professional assessment of your collection's condition. We understand the significant investment these distinguished pieces represent and remain committed to providing the highest caliber of care.

We invite you to proceed with all recommended services, or we would be pleased to discuss a prioritized approach. Our team is prepared to work with you to develop a preservation plan that aligns with your specific preferences and requirements.`;
  
  const nextStepsLines = doc.splitTextToSize(nextStepsText, contentWidth);
  nextStepsLines.forEach((line: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      drawElegantBorder(doc, pageWidth, pageHeight);
      yPos = 30;
    }
    doc.text(line, margin, yPos);
    yPos += 5;
  });
  
  yPos += 8;
  
  // Contact information
  if (branding?.business_phone) {
    doc.text(`Please contact us at ${branding.business_phone} to discuss these recommendations or to arrange a consultation.`, margin, yPos);
    yPos += 10;
  }
  
  yPos += 10;
  
  // Gold divider before closing
  drawGoldRule(doc, pageWidth / 2 - 30, yPos, 60);
  yPos += 15;
  
  // Distinguished closing
  doc.setFont('helvetica', 'italic');
  doc.text('With distinguished regards,', margin, yPos);
  yPos += 12;
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text(businessName.toUpperCase(), margin, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  if (branding?.business_address) {
    doc.text(branding.business_address, margin, yPos);
    yPos += 5;
  }
  if (branding?.business_phone) {
    doc.text(`Telephone ${branding.business_phone}`, margin, yPos);
    yPos += 10;
  }
  
  // Heritage tagline
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Heritage restoration specialists', pageWidth / 2, yPos, { align: 'center' });
  
  // ============ INSPECTION PHOTOS ============
  
  const hasAnyPhotos = rugs.some(r => r.photo_urls && r.photo_urls.length > 0);
  
  if (hasAnyPhotos) {
    doc.addPage();
    drawElegantBorder(doc, pageWidth, pageHeight);
    yPos = 30;
    
    yPos = drawSectionHeader(doc, 'INSPECTION PHOTOS', margin, yPos, contentWidth);
    yPos += 8;
    
    for (const rug of rugs) {
      if (!rug.photo_urls || rug.photo_urls.length === 0) continue;
      
      if (yPos > pageHeight - 100) {
        doc.addPage();
        drawElegantBorder(doc, pageWidth, pageHeight);
        yPos = 30;
      }
      
      // Rug photo section header
      const sizeStr = rug.length && rug.width ? ` (${rug.length}' × ${rug.width}')` : '';
      yPos = drawRugEntryHeader(doc, `Rug #${rug.rug_number}: ${rug.rug_type}${sizeStr}`, margin, yPos, contentWidth);
      yPos += 4;
      
      yPos = await addPhotosToPDF(
        doc,
        rug.photo_urls,
        yPos,
        margin,
        pageWidth,
        pageHeight,
        branding,
        rug.image_annotations,
        false,
        true
      );
      
      yPos += 10;
    }
  }
  
  // Add elegant borders to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Page number in footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }
  
  const fileName = `restoration-estimate-${job.job_number}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};

// ========================
// PDF BASE64 GENERATION (for email)
// ========================

export const generateJobPDFBase64 = async (
  job: Job,
  rugs: Inspection[],
  branding?: BusinessBranding | null,
  upsellServices?: UpsellService[]
): Promise<string> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  
  const businessName = branding?.business_name || 'RugBoost';
  
  // Same structure as generateJobPDF but returns base64
  drawElegantBorder(doc, pageWidth, pageHeight);
  
  let yPos = 45;
  
  // Business header
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text(businessName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.teal);
  doc.text('RUGS & CARPET CLEANERS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  const businessNameWidth = 80;
  drawGoldRule(doc, (pageWidth - businessNameWidth) / 2, yPos, businessNameWidth);
  yPos += 10;
  
  if (branding?.business_address || branding?.business_phone) {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    if (branding?.business_address) {
      doc.text(branding.business_address, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    if (branding?.business_phone) {
      doc.text(`Telephone ${branding.business_phone}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
  }
  
  yPos += 5;
  drawThinDivider(doc, margin, yPos, contentWidth);
  yPos += 15;
  
  yPos = drawSectionHeader(doc, 'RESTORATION ESTIMATE', margin, yPos, contentWidth);
  yPos += 10;
  
  // Estimate info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text('ESTIMATE NUMBER', margin, yPos);
  doc.text('DATE PREPARED', margin + contentWidth / 2, yPos);
  yPos += 6;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(job.job_number, margin, yPos);
  doc.text(format(new Date(job.created_at), 'MMMM d, yyyy'), margin + contentWidth / 2, yPos);
  yPos += 15;
  
  // Client info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text('PREPARED FOR', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(job.client_name, margin, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'normal');
  if (job.client_phone) {
    doc.text(`Telephone: ${job.client_phone}`, margin, yPos);
    yPos += 5;
  }
  
  yPos += 12;
  
  // Intro
  const firstName = job.client_name.split(' ')[0];
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(`Dear ${firstName},`, margin, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  const introText = `We are honored to present this comprehensive estimate for the restoration and preservation of your distinguished collection of Oriental rugs.`;
  const introLines = doc.splitTextToSize(introText, contentWidth);
  introLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });
  
  // Service descriptions
  doc.addPage();
  drawElegantBorder(doc, pageWidth, pageHeight);
  yPos = 30;
  
  yPos = drawSectionHeader(doc, 'COMPREHENSIVE SERVICE DESCRIPTIONS', margin, yPos, contentWidth);
  yPos += 8;
  
  const serviceDescriptions = extractAllServiceDescriptions(rugs);
  const defaultServices: ServiceDescription[] = [
    { name: 'Professional Hand Cleaning', description: 'Our specialized hand cleaning process utilizes an immersion method specifically designed for delicate Oriental rugs.' },
    { name: 'Overnight Soaking', description: 'This intensive deep-cleaning treatment involves submerging your rug in a specially formulated solution.' },
    { name: 'Blocking & Stretching', description: 'This essential restoration process corrects dimensional distortion in handwoven rugs.' },
    { name: 'Custom Padding', description: 'Our premium custom padding provides crucial support between your rug and floor surface.' }
  ];
  
  const servicesToShow = serviceDescriptions.length > 0 ? serviceDescriptions : defaultServices;
  
  for (const service of servicesToShow) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      drawElegantBorder(doc, pageWidth, pageHeight);
      yPos = 30;
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.teal);
    doc.text(`- ${service.name}`, margin, yPos);
    yPos += 7;
    
    if (service.description) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      const descLines = doc.splitTextToSize(service.description, contentWidth - 5);
      descLines.forEach((line: string) => {
        doc.text(line, margin + 5, yPos);
        yPos += 4.5;
      });
    }
    yPos += 8;
  }
  
  // Rug breakdown
  doc.addPage();
  drawElegantBorder(doc, pageWidth, pageHeight);
  yPos = 30;
  
  yPos = drawSectionHeader(doc, 'RUG BREAKDOWN & SERVICES', margin, yPos, contentWidth);
  yPos += 8;
  
  let grandTotal = 0;
  
  for (const rug of rugs) {
    const costs = extractRugCosts(rug);
    if (!costs || costs.items.length === 0) continue;
    
    if (yPos > pageHeight - 70) {
      doc.addPage();
      drawElegantBorder(doc, pageWidth, pageHeight);
      yPos = 30;
    }
    
    const dimensionStr = costs.dimensions ? ` (${costs.dimensions})` : '';
    yPos = drawRugEntryHeader(doc, `Rug #${costs.rugNumber}: ${costs.rugType}${dimensionStr}`, margin, yPos, contentWidth);
    yPos += 4;
    
    for (const item of costs.items) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      doc.text(`- ${item.service}`, margin + 8, yPos);
      
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.gold);
      doc.text(`$${item.cost.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 5;
    }
    
    yPos += 2;
    drawGoldRule(doc, margin + 8, yPos, contentWidth - 16);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.navy);
    doc.text('Subtotal', margin + 8, yPos);
    doc.setTextColor(...COLORS.gold);
    doc.text(`$${costs.subtotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;
    
    if (costs.specialNote) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.textMuted);
      doc.text(`* ${costs.specialNote}`, margin + 8, yPos);
      yPos += 4;
    }
    
    grandTotal += costs.subtotal;
    yPos += 10;
  }
  
  // Total
  if (yPos > pageHeight - 50) {
    doc.addPage();
    drawElegantBorder(doc, pageWidth, pageHeight);
    yPos = 30;
  }
  
  yPos += 10;
  
  doc.setFillColor(...COLORS.cream);
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(1.5);
  doc.roundedRect(margin, yPos - 4, contentWidth, 20, 3, 3, 'FD');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text('TOTAL INVESTMENT', margin + 10, yPos + 8);
  doc.setTextColor(...COLORS.gold);
  doc.text(`$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 10, yPos + 8, { align: 'right' });
  
  yPos += 30;
  
  // Closing
  drawGoldRule(doc, pageWidth / 2 - 30, yPos, 60);
  yPos += 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.text);
  doc.text('With distinguished regards,', margin, yPos);
  yPos += 12;
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text(businessName.toUpperCase(), margin, yPos);
  
  // Photos
  const hasAnyPhotos = rugs.some(r => r.photo_urls && r.photo_urls.length > 0);
  
  if (hasAnyPhotos) {
    doc.addPage();
    drawElegantBorder(doc, pageWidth, pageHeight);
    yPos = 30;
    
    yPos = drawSectionHeader(doc, 'INSPECTION PHOTOS', margin, yPos, contentWidth);
    yPos += 8;
    
    for (const rug of rugs) {
      if (!rug.photo_urls || rug.photo_urls.length === 0) continue;
      
      if (yPos > pageHeight - 100) {
        doc.addPage();
        drawElegantBorder(doc, pageWidth, pageHeight);
        yPos = 30;
      }
      
      const sizeStr = rug.length && rug.width ? ` (${rug.length}' × ${rug.width}')` : '';
      yPos = drawRugEntryHeader(doc, `Rug #${rug.rug_number}: ${rug.rug_type}${sizeStr}`, margin, yPos, contentWidth);
      yPos += 4;
      
      yPos = await addPhotosToPDF(
        doc, rug.photo_urls, yPos, margin, pageWidth, pageHeight,
        branding, rug.image_annotations, true, true
      );
      
      yPos += 10;
    }
  }
  
  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }
  
  return doc.output('datauristring').split(',')[1];
};

// ========================
// SINGLE RUG PDF (Legacy support)
// ========================

export const generatePDF = async (
  rug: Inspection,
  branding?: BusinessBranding | null
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  
  const businessName = branding?.business_name || 'RugBoost';
  
  drawElegantBorder(doc, pageWidth, pageHeight);
  
  let yPos = 45;
  
  // Header
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text(businessName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.teal);
  doc.text('RUGS & CARPET CLEANERS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  drawGoldRule(doc, (pageWidth - 80) / 2, yPos, 80);
  yPos += 15;
  
  yPos = drawSectionHeader(doc, 'INSPECTION REPORT', margin, yPos, contentWidth);
  yPos += 10;
  
  // Rug info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.navy);
  doc.text(`Rug #${rug.rug_number}: ${rug.rug_type}`, margin, yPos);
  yPos += 6;
  
  if (rug.length && rug.width) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(`Dimensions: ${rug.length}' × ${rug.width}'`, margin, yPos);
    yPos += 10;
  }
  
  // Report content
  if (rug.analysis_report) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const reportLines = doc.splitTextToSize(rug.analysis_report, contentWidth);
    
    for (const line of reportLines) {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        drawElegantBorder(doc, pageWidth, pageHeight);
        yPos = 30;
      }
      doc.text(line, margin, yPos);
      yPos += 4.5;
    }
  }
  
  // Photos
  if (rug.photo_urls && rug.photo_urls.length > 0) {
    doc.addPage();
    drawElegantBorder(doc, pageWidth, pageHeight);
    yPos = 30;
    
    yPos = drawSectionHeader(doc, 'INSPECTION PHOTOS', margin, yPos, contentWidth);
    yPos += 8;
    
    await addPhotosToPDF(doc, rug.photo_urls, yPos, margin, pageWidth, pageHeight, branding, rug.image_annotations, false, true);
  }
  
  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }
  
  const fileName = `inspection-report-${rug.rug_number}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};
