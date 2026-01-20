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

// Refined color palette - soft elegance with professional tones
const COLORS = {
  // Primary - Soft navy for elevated feel
  primary: [30, 58, 95] as [number, number, number],
  primaryLight: [51, 85, 127] as [number, number, number],
  
  // Accent - Warm bronze/gold for elegance
  accent: [166, 134, 89] as [number, number, number],
  accentLight: [201, 177, 140] as [number, number, number],
  
  // Neutrals - Warm grays
  text: [35, 35, 40] as [number, number, number],
  textMuted: [120, 120, 125] as [number, number, number],
  textLight: [160, 160, 165] as [number, number, number],
  
  // Backgrounds - Very subtle warm tones
  background: [249, 249, 247] as [number, number, number],
  backgroundWarm: [252, 250, 245] as [number, number, number],
  cardBg: [255, 255, 253] as [number, number, number],
  
  // Borders and dividers
  border: [230, 228, 222] as [number, number, number],
  borderLight: [240, 238, 232] as [number, number, number],
  
  // Standard colors
  white: [255, 255, 255] as [number, number, number],
  success: [76, 140, 100] as [number, number, number],
  warning: [180, 130, 50] as [number, number, number],
  danger: [180, 70, 70] as [number, number, number],
};

// Default RugBoost logo as base64 PNG (fallback when no custom logo)
const RUGBOOST_LOGO_BASE64 = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgODkwIiBmaWxsPSJub25lIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZCIgeDE9IjAlIiB5MT0iMjAlIiB4Mj0iMTAwJSIgeTI9IjgwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMyMTc0QzYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNkU1NEQxIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cGF0aCBkPSJNMTIwIDQ0NUMxMjAgMzY4IDI2My41NyAyNDMuNTcgMzAwIDE2MCAzNTQuMjMgMjIzLjkgNDc0IDM2MiA0ODAgNDQ1IDQ4MCA1MjAgNDIwIDY5MCAzMDAgNjkwIDE4MCA2OTAgMTIwIDUyMCAxMjAgNDQ1WiIgZmlsbD0idXJsKCNncmFkKSIvPgogIDxwYXRoIGQ9Ik0yMDAgNDYwQzIwMCAzNjAgMzQwIDMwMCAzMDAgMjIwIDI2MCAzMDAgNDAwIDM2MCA0MDAgNDYwIDQwMCA1NjAgMzIwIDYyMCAzMDAgNjIwIDI4MCA2MjAgMjAwIDU2MCAyMDAgNDYwWiIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4zIi8+Cjwvc3ZnPg==`;

// Helper function to compress and convert image to base64
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

// Helper function to load image, compress it, and convert to base64
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
          console.error('Compression failed, using original:', e);
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

// Draw a rounded rectangle
const drawRoundedRect = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean = true,
  stroke: boolean = false
) => {
  doc.roundedRect(x, y, width, height, radius, radius, fill ? 'F' : stroke ? 'S' : '');
};

// Elegant thin divider line
const addDivider = (
  doc: jsPDF,
  y: number,
  margin: number,
  pageWidth: number,
  withOrnament: boolean = false
) => {
  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.3);
  
  if (withOrnament) {
    const centerX = pageWidth / 2;
    const lineWidth = pageWidth - margin * 2;
    const ornamentWidth = 8;
    
    // Left line
    doc.line(margin, y, centerX - ornamentWidth, y);
    // Right line
    doc.line(centerX + ornamentWidth, y, pageWidth - margin, y);
    
    // Small diamond ornament in center
    doc.setFillColor(...COLORS.accent);
    const size = 1.5;
    doc.moveTo(centerX, y - size);
    doc.lineTo(centerX + size, y);
    doc.lineTo(centerX, y + size);
    doc.lineTo(centerX - size, y);
    doc.close();
    doc.fill();
  } else {
    doc.line(margin, y, pageWidth - margin, y);
  }
};

// Professional header - refined and elegant
const addProfessionalHeader = async (
  doc: jsPDF,
  pageWidth: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null
): Promise<{ yPos: number; logoBase64: string | null }> => {
  const margin = 15;
  const headerHeight = 35;
  
  // Clean header background with subtle gradient effect
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  
  // Thin accent line at bottom
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, headerHeight - 1, pageWidth, 1, 'F');
  
  const businessName = branding?.business_name || 'RugBoost';
  let logoBase64 = cachedLogoBase64;
  
  if (!logoBase64 && branding?.logo_url) {
    logoBase64 = await loadImageAsBase64(branding.logo_url);
  }
  if (!logoBase64) {
    logoBase64 = RUGBOOST_LOGO_BASE64;
  }
  
  // Logo
  const logoSize = 20;
  const logoX = margin;
  const logoY = (headerHeight - logoSize) / 2;
  
  try {
    const format = logoBase64.includes('image/png') ? 'PNG' : 
                   logoBase64.includes('image/svg') ? 'SVG' : 'JPEG';
    
    doc.setFillColor(...COLORS.white);
    doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2 + 1, 'F');
    doc.addImage(logoBase64, format, logoX, logoY, logoSize, logoSize);
  } catch (error) {
    console.error('Failed to add logo:', error);
  }
  
  // Company name - elegant font sizing
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(businessName, logoX + logoSize + 8, headerHeight / 2 + 2);
  
  // Contact info on right side - lighter weight
  const rightX = pageWidth - margin;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255, 0.9);
  
  let infoY = 12;
  if (branding?.business_phone) {
    doc.text(branding.business_phone, rightX, infoY, { align: 'right' });
    infoY += 5;
  }
  if (branding?.business_email) {
    doc.text(branding.business_email, rightX, infoY, { align: 'right' });
    infoY += 5;
  }
  if (branding?.business_address) {
    const addressLines = doc.splitTextToSize(branding.business_address, 55);
    addressLines.slice(0, 2).forEach((line: string) => {
      doc.text(line, rightX, infoY, { align: 'right' });
      infoY += 4;
    });
  }
  
  return { yPos: headerHeight + 12, logoBase64 };
};

// Sync version for subsequent pages - minimal header
const addProfessionalHeaderSync = (
  doc: jsPDF,
  pageWidth: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null
): number => {
  const margin = 15;
  const headerHeight = 25;
  
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, headerHeight - 0.5, pageWidth, 0.5, 'F');
  
  const businessName = branding?.business_name || 'RugBoost';
  const logoBase64 = cachedLogoBase64 || RUGBOOST_LOGO_BASE64;
  
  const logoSize = 15;
  const logoX = margin;
  const logoY = (headerHeight - logoSize) / 2;
  
  try {
    const format = logoBase64.includes('image/png') ? 'PNG' : 
                   logoBase64.includes('image/svg') ? 'SVG' : 'JPEG';
    doc.setFillColor(...COLORS.white);
    doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2 + 0.5, 'F');
    doc.addImage(logoBase64, format, logoX, logoY, logoSize, logoSize);
  } catch (error) {
    console.error('Failed to add logo:', error);
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(businessName, logoX + logoSize + 6, headerHeight / 2 + 1.5);
  
  return headerHeight + 8;
};

// Section header - refined styling
const addSectionHeader = (
  doc: jsPDF,
  title: string,
  yPos: number,
  margin: number,
  pageWidth: number = 210
): number => {
  // Accent line
  doc.setFillColor(...COLORS.accent);
  doc.rect(margin, yPos, 3, 7, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(title, margin + 7, yPos + 5);
  
  // Thin underline
  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.2);
  doc.line(margin + 7, yPos + 8, pageWidth - margin, yPos + 8);
  
  return yPos + 14;
};

// Executive Summary Card - displays short appraisal and cost estimate
const addExecutiveSummary = (
  doc: jsPDF,
  inspection: Inspection,
  yPos: number,
  margin: number,
  pageWidth: number
): number => {
  const cardWidth = pageWidth - margin * 2;
  
  // Parse short appraisal from analysis
  const analysis = inspection.analysis_report || '';
  const shortAppraisal = extractShortAppraisal(analysis);
  const estimatedCost = extractTotalCost(analysis);
  
  // Calculate card height based on appraisal
  const maxAppraisalWidth = cardWidth - 70;
  const appraisalLines = doc.splitTextToSize(shortAppraisal, maxAppraisalWidth);
  const cardHeight = 35 + Math.max(appraisalLines.length * 4, 10);
  
  // Card background
  doc.setFillColor(...COLORS.cardBg);
  drawRoundedRect(doc, margin, yPos, cardWidth, cardHeight, 4);
  
  // Subtle border
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, cardWidth, cardHeight, 4, 4, 'S');
  
  // Card header with accent
  doc.setFillColor(...COLORS.accent);
  doc.rect(margin, yPos, cardWidth, 0.8, 'F');
  
  // "At a Glance" label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.accent);
  doc.text('AT A GLANCE', margin + 6, yPos + 7);
  
  // Left column - Rug info with type and dimensions
  let innerY = yPos + 14;
  const col1X = margin + 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(`${inspection.rug_type}`, col1X, innerY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  const size = inspection.length && inspection.width 
    ? `${inspection.length}' × ${inspection.width}'`
    : 'Size not specified';
  doc.text(`Rug #${inspection.rug_number} • ${size}`, col1X, innerY + 5);
  
  // Short appraisal below rug info
  innerY += 14;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  appraisalLines.forEach((line: string, idx: number) => {
    doc.text(line, col1X, innerY + (idx * 4));
  });
  
  // Cost estimate - prominent at right
  if (estimatedCost) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(estimatedCost, pageWidth - margin - 6, yPos + 16, { align: 'right' });
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text('Estimated Total', pageWidth - margin - 6, yPos + 21, { align: 'right' });
  }
  
  return yPos + cardHeight + 8;
};

// Helper to extract a short appraisal (first meaningful sentence about the rug)
const extractShortAppraisal = (analysis: string): string => {
  const lines = analysis.split('\n');
  
  // Skip generic phrases
  const genericPhrases = [
    'dear ', 'professional inspection', 'inspected by', 'based on my assessment',
    'we recommend', 'please note', 'thank you', 'following services'
  ];
  
  for (const line of lines) {
    const trimmed = line.trim();
    const lowerTrimmed = trimmed.toLowerCase();
    
    // Skip empty, header-like lines, lines with costs, or generic phrases
    if (!trimmed || 
        trimmed.length < 30 || 
        trimmed.startsWith('**') || 
        trimmed.startsWith('#') ||
        /^[A-Z][A-Z\s]+:?$/.test(trimmed) ||
        trimmed.includes('$') ||
        genericPhrases.some(p => lowerTrimmed.includes(p))) {
      continue;
    }
    
    // Look for descriptive sentences about the rug
    if (lowerTrimmed.includes('rug') || lowerTrimmed.includes('carpet') || 
        lowerTrimmed.includes('hand-knotted') || lowerTrimmed.includes('wool') ||
        lowerTrimmed.includes('tribal') || lowerTrimmed.includes('piece')) {
      // Return first 2 sentences max
      const sentences = trimmed.split(/[.!]/).filter(s => s.trim().length > 10);
      return sentences.slice(0, 2).join('. ').trim() + (sentences.length > 0 ? '.' : '');
    }
  }
  
  return '';
};

// Helper to extract key findings from analysis - looks for actual observations
const extractKeyFindings = (analysis: string): string[] => {
  const findings: string[] = [];
  const lines = analysis.split('\n');
  
  // Skip generic phrases
  const genericPhrases = [
    'professional inspection', 'inspected by', 'carpet is', 'rug is', 
    'based on', 'we recommend', 'please note', 'thank you'
  ];
  
  for (const line of lines) {
    const trimmed = line.trim();
    const lowerTrimmed = trimmed.toLowerCase();
    
    // Skip lines with costs or generic phrases
    if (trimmed.includes('$') || genericPhrases.some(p => lowerTrimmed.includes(p))) {
      continue;
    }
    
    if ((trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) && 
        findings.length < 5) {
      const cleaned = trimmed.replace(/^[•\-*]\s*/, '').trim();
      // Look for substantive findings (conditions, issues, materials)
      if (cleaned.length > 15 && cleaned.length < 100) {
        findings.push(cleaned);
      }
    }
  }
  
  // Also look for condition-related sentences in paragraphs
  if (findings.length < 3) {
    const conditionKeywords = ['wear', 'stain', 'fringe', 'edge', 'moth', 'damage', 'fading', 'discoloration', 'pile', 'fiber', 'foundation', 'binding'];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('•') && !trimmed.startsWith('-') && trimmed.length > 20 && trimmed.length < 100) {
        const lowerLine = trimmed.toLowerCase();
        if (conditionKeywords.some(kw => lowerLine.includes(kw)) && !trimmed.includes('$')) {
          // Extract a meaningful portion
          const sentences = trimmed.split(/[.!]/);
          for (const sentence of sentences) {
            const s = sentence.trim();
            if (s.length > 15 && s.length < 80 && conditionKeywords.some(kw => s.toLowerCase().includes(kw))) {
              if (!findings.includes(s) && findings.length < 5) {
                findings.push(s);
              }
            }
          }
        }
      }
    }
  }
  
  return findings.length > 0 ? findings : [];
};

// Helper to extract total cost from analysis
const extractTotalCost = (analysis: string): string | null => {
  const totalMatch = analysis.match(/(?:grand\s*)?total[:\s]+\$[\d,]+(?:\.\d{2})?|\$[\d,]+(?:\.\d{2})?\s*(?:total|grand)/i);
  if (totalMatch) {
    const costMatch = totalMatch[0].match(/\$[\d,]+(?:\.\d{2})?/);
    return costMatch ? costMatch[0] : null;
  }
  
  // Try to find the last dollar amount which is often the total
  const allCosts = analysis.match(/\$[\d,]+(?:\.\d{2})?/g);
  if (allCosts && allCosts.length > 0) {
    return allCosts[allCosts.length - 1];
  }
  
  return null;
};

// Helper to assess condition from analysis (kept for internal use but not displayed as badge)
const assessCondition = (analysis: string): string => {
  const lowerAnalysis = analysis.toLowerCase();
  
  if (lowerAnalysis.includes('excellent condition') || lowerAnalysis.includes('very good condition')) {
    return 'Excellent';
  }
  if (lowerAnalysis.includes('good condition') || lowerAnalysis.includes('minor')) {
    return 'Good';
  }
  if (lowerAnalysis.includes('fair condition') || lowerAnalysis.includes('moderate')) {
    return 'Fair';
  }
  if (lowerAnalysis.includes('poor') || lowerAnalysis.includes('significant') || lowerAnalysis.includes('extensive')) {
    return 'Needs Attention';
  }
  
  return 'Fair';
};

// Info card with refined styling
const addInfoCard = (
  doc: jsPDF,
  data: [string, string][],
  yPos: number,
  margin: number,
  width: number
): number => {
  doc.setFillColor(...COLORS.background);
  const cardHeight = data.length * 7 + 8;
  drawRoundedRect(doc, margin, yPos, width, cardHeight, 2);
  
  let innerY = yPos + 6;
  data.forEach(([label, value]) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(label, margin + 5, innerY);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    const valueX = margin + 40;
    const maxWidth = width - 48;
    const displayValue = value && value.length > maxWidth / 2 ? value.substring(0, Math.floor(maxWidth / 2)) + '...' : (value || '—');
    doc.text(displayValue, valueX, innerY);
    
    innerY += 7;
  });
  
  return yPos + cardHeight + 5;
};

// Professional footer - refined
const addProfessionalFooter = (
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  pageNum: number,
  totalPages: number,
  businessName: string,
  jobNumber?: string
) => {
  const footerY = pageHeight - 12;
  const margin = 15;
  
  // Thin divider line
  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textLight);
  
  // Left: Generated by
  doc.text(`Generated by ${businessName}`, margin, footerY);
  
  // Center: Page number
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
  
  // Right: Job number or date
  if (jobNumber) {
    doc.text(`Job #${jobNumber}`, pageWidth - margin, footerY, { align: 'right' });
  } else {
    doc.text(format(new Date(), 'MMM d, yyyy'), pageWidth - margin, footerY, { align: 'right' });
  }
};

// Cost breakdown table - NEW structured format
const addCostBreakdown = (
  doc: jsPDF,
  analysis: string,
  yPos: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null
): number => {
  const costLines = extractCostLines(analysis);
  if (costLines.length === 0) return yPos;
  
  // Check for page break
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
  }
  
  yPos = addSectionHeader(doc, 'Detailed Breakdown', yPos, margin, pageWidth);
  yPos += 2;
  
  // Build table data
  const tableData: string[][] = [];
  let currentOption: string | null = null;
  
  for (const line of costLines) {
    const isOption = /^(option\s+[a-z]|priority\s+\d)/i.test(line.text);
    const isTotal = /total|subtotal/i.test(line.text);
    
    if (isOption) {
      currentOption = line.text;
      tableData.push([line.text, '', '']);
    } else if (isTotal) {
      tableData.push([line.text.replace(/[:.]?\s*\$.*$/, ''), '', line.cost]);
    } else {
      tableData.push([line.text.replace(/[:.]?\s*\$.*$/, ''), '', line.cost]);
    }
  }
  
  autoTable(doc, {
    startY: yPos,
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { cellWidth: pageWidth - margin * 2 - 45 },
      1: { cellWidth: 5 },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      const text = data.row.raw?.[0] as string || '';
      const isOption = /^(option\s+[a-z]|priority\s+\d)/i.test(text);
      const isTotal = /total|subtotal/i.test(text);
      
      if (isOption) {
        data.cell.styles.fillColor = COLORS.background;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = COLORS.primary;
      } else if (isTotal) {
        data.cell.styles.fillColor = [245, 243, 238];
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 2) {
          data.cell.styles.textColor = COLORS.primary;
          data.cell.styles.fontSize = 10;
        }
      }
    },
    margin: { left: margin, right: margin },
  });
  
  return (doc as any).lastAutoTable.finalY + 8;
};

// Helper to extract cost lines from analysis
interface CostLine {
  text: string;
  cost: string;
}

const extractCostLines = (analysis: string): CostLine[] => {
  const lines = analysis.split('\n');
  const costLines: CostLine[] = [];
  let foundTotal = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    const lowerTrimmed = trimmed.toLowerCase();
    const costMatch = trimmed.match(/\$[\d,]+(?:\.\d{2})?/);
    
    if (costMatch) {
      costLines.push({
        text: trimmed,
        cost: costMatch[0],
      });
      
      // Stop after finding the TOTAL line to avoid including additional/optional services below it
      if (lowerTrimmed.includes('total estimate') || 
          (lowerTrimmed.includes('total') && !lowerTrimmed.includes('subtotal'))) {
        foundTotal = true;
        break;
      }
    }
  }
  
  return costLines;
};

// Parse analysis into logical sections for proper ordering
interface AnalysisSections {
  professionalAnalysis: string;
  serviceDescriptions: string;
  additionalServices: string;
  otherContent: string;
}

const parseAnalysisSections = (analysis: string): AnalysisSections => {
  const lines = analysis.split('\n');
  const sections: AnalysisSections = {
    professionalAnalysis: '',
    serviceDescriptions: '',
    additionalServices: '',
    otherContent: '',
  };
  
  let currentSection: keyof AnalysisSections = 'otherContent';
  const sectionLines: Record<keyof AnalysisSections, string[]> = {
    professionalAnalysis: [],
    serviceDescriptions: [],
    additionalServices: [],
    otherContent: [],
  };
  
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    const originalLine = line;
    
    // Detect section headers
    if (trimmed.includes('professional analysis') || trimmed.includes('inspection summary') || 
        trimmed.includes('condition assessment') || trimmed.includes('rug assessment')) {
      currentSection = 'professionalAnalysis';
      sectionLines[currentSection].push(originalLine);
      continue;
    }
    
    if (trimmed.includes('service description') || trimmed.includes('recommended service') ||
        trimmed.includes('cleaning service') || (trimmed.includes('service') && trimmed.includes('detail'))) {
      currentSection = 'serviceDescriptions';
      sectionLines[currentSection].push(originalLine);
      continue;
    }
    
    if (trimmed.includes('additional') || trimmed.includes('optional') || 
        trimmed.includes('moth proof') || trimmed.includes('fiber protection') || 
        trimmed.includes('custom pad')) {
      currentSection = 'additionalServices';
      sectionLines[currentSection].push(originalLine);
      continue;
    }
    
    // Skip cost lines from these sections (they go in the cost table)
    if (/\$[\d,]+/.test(originalLine) && currentSection !== 'additionalServices') {
      continue;
    }
    
    sectionLines[currentSection].push(originalLine);
  }
  
  sections.professionalAnalysis = sectionLines.professionalAnalysis.join('\n');
  sections.serviceDescriptions = sectionLines.serviceDescriptions.join('\n');
  sections.additionalServices = sectionLines.additionalServices.join('\n');
  sections.otherContent = sectionLines.otherContent.join('\n');
  
  return sections;
};

// Render a specific section content (no header - content only)
const addAnalysisSectionContent = (
  doc: jsPDF,
  content: string,
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null
): number => {
  if (!content.trim()) return startY;
  
  let yPos = startY;
  const maxWidth = pageWidth - margin * 2;
  const lines = content.split('\n');
  
  // Skip phrases to filter out (including rug descriptions already in summary)
  const skipPhrases = [
    'dear ', 'professional analysis', 'comprehensive service', 'service description',
    'additional recommended', 'to further protect', 'we also recommend considering'
  ];
  
  // Rug description phrases that appear in the executive summary - skip these
  const rugDescriptionPhrases = [
    'your rug is', 'this rug is', 'the rug is', 'hand-knotted', 'handknotted',
    'tribal piece', 'repeating octagonal', 'guls', 'primary fiber', 'shows signs of use',
    'restore its beauty', 'ensure its longevity', 'professional attention'
  ];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    const lowerLine = trimmedLine.toLowerCase();
    
    if (!trimmedLine) {
      yPos += 2;
      continue;
    }
    
    // Skip section headers and intro phrases
    if (trimmedLine.startsWith('**') || trimmedLine.startsWith('###') || trimmedLine.startsWith('##') ||
        /^[A-Z][A-Z\s]+:?$/.test(trimmedLine) ||
        skipPhrases.some(p => lowerLine.includes(p))) {
      continue;
    }
    
    // Skip rug description paragraphs (already shown in executive summary)
    const hasMultipleRugDescPhrases = rugDescriptionPhrases.filter(p => lowerLine.includes(p)).length >= 2;
    if (hasMultipleRugDescPhrases) {
      continue;
    }
    
    // Check for page break
    if (yPos > pageHeight - 35) {
      doc.addPage();
      yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    }
    
    const isSubHeader = /^[A-Z][A-Za-z\s&]+:$/.test(trimmedLine) && trimmedLine.length < 40;
    const isBullet = trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.startsWith('*');
    
    if (isSubHeader) {
      const headerText = trimmedLine.replace(/:$/, '').trim();
      yPos += 4;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text(headerText, margin, yPos);
      yPos += 6;
    } else if (isBullet) {
      const bulletText = trimmedLine.replace(/^[-•*]\s*/, '');
      const wrappedLines = doc.splitTextToSize(bulletText, maxWidth - 8);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      doc.setFillColor(...COLORS.accent);
      doc.circle(margin + 4, yPos - 0.5, 1, 'F');
      
      wrappedLines.forEach((wLine: string) => {
        if (yPos > pageHeight - 25) {
          doc.addPage();
          yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
        }
        doc.text(wLine, margin + 10, yPos);
        yPos += 4.5;
      });
      yPos += 1;
    } else {
      // Regular paragraph - no indentation
      const wrappedLines = doc.splitTextToSize(trimmedLine, maxWidth);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      
      wrappedLines.forEach((wLine: string) => {
        if (yPos > pageHeight - 25) {
          doc.addPage();
          yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
        }
        doc.text(wLine, margin, yPos);
        yPos += 4.5;
      });
      yPos += 1.5;
    }
  }
  
  return yPos + 4;
};

// Render a specific section with header (kept for backwards compatibility)
const addAnalysisSection = (
  doc: jsPDF,
  content: string,
  sectionTitle: string,
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null
): number => {
  if (!content.trim()) return startY;
  
  let yPos = startY;
  
  // Check for page break
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
  }
  
  yPos = addSectionHeader(doc, sectionTitle, yPos, margin, pageWidth);
  yPos += 3;
  
  return addAnalysisSectionContent(doc, content, yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64);
};

// Format analysis report - improved readability
const addFormattedAnalysis = (
  doc: jsPDF,
  analysis: string,
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null,
  skipCosts: boolean = false
): number => {
  let yPos = startY;
  const maxWidth = pageWidth - margin * 2 - 8;
  
  const lines = analysis.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      yPos += 2;
      continue;
    }
    
    // Skip cost lines if we're showing them in a table
    if (skipCosts && /\$[\d,]+/.test(trimmedLine)) {
      continue;
    }
    
    // Check for page break
    if (yPos > pageHeight - 35) {
      doc.addPage();
      yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    }
    
    const isHeader = trimmedLine.startsWith('**') || trimmedLine.startsWith('###') || trimmedLine.startsWith('##') ||
                     (/^[A-Z][A-Z\s&]+:?$/.test(trimmedLine) && trimmedLine.length > 3);
    const isBullet = trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.startsWith('*');
    const isNumbered = /^\d+\./.test(trimmedLine);
    
    if (isHeader) {
      const headerText = trimmedLine.replace(/[#*]/g, '').replace(/:$/, '').trim();
      
      yPos += 6;
      
      // Section header with accent
      doc.setFillColor(...COLORS.accent);
      doc.rect(margin, yPos - 3, 2.5, 6, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(headerText, margin + 6, yPos + 1);
      
      yPos += 10;
    } else if (isBullet || isNumbered) {
      const bulletText = trimmedLine.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '');
      const wrappedLines = doc.splitTextToSize(bulletText, maxWidth - 8);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      
      // Bullet or number
      if (isBullet) {
        doc.setFillColor(...COLORS.accent);
        doc.circle(margin + 4, yPos - 0.5, 1, 'F');
      } else {
        const num = trimmedLine.match(/^(\d+)\./)?.[1] || '';
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.accent);
        doc.text(num + '.', margin + 2, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text);
      }
      
      wrappedLines.forEach((wLine: string, idx: number) => {
        if (yPos > pageHeight - 25) {
          doc.addPage();
          yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
        }
        doc.text(wLine, margin + 10, yPos);
        yPos += 4.5;
      });
      
      yPos += 1;
    } else {
      const wrappedLines = doc.splitTextToSize(trimmedLine, maxWidth);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      
      wrappedLines.forEach((wLine: string) => {
        if (yPos > pageHeight - 25) {
          doc.addPage();
          yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
        }
        doc.text(wLine, margin + 2, yPos);
        yPos += 4.5;
      });
      
      yPos += 1.5;
    }
  }
  
  return yPos;
};

// Photo labels for guided capture
const PHOTO_LABELS = [
  'Overall Front',
  'Overall Back', 
  'Detail - Fringe',
  'Detail - Edge',
  'Issue Area'
];

// Photos in 2-up layout with legends below - IMPROVED
const addPhotosToPDF = async (
  doc: jsPDF,
  photoUrls: string[],
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null,
  imageAnnotations?: PhotoAnnotations[] | unknown | null,
  forEmail: boolean = false
): Promise<number> => {
  let yPos = startY;
  
  const annotations: PhotoAnnotations[] = Array.isArray(imageAnnotations) ? imageAnnotations : [];
  
  yPos = addSectionHeader(doc, 'Inspection Photos', yPos, margin, pageWidth);
  yPos += 4;
  
  // 2-up layout dimensions
  const photoWidth = (pageWidth - margin * 2 - 10) / 2;
  const photoHeight = photoWidth * 0.75; // 4:3 aspect ratio
  const spacing = 10;
  
  for (let i = 0; i < photoUrls.length; i += 2) {
    // Calculate space needed for this row (photos + legends)
    const maxLegendHeight = 25;
    const rowHeight = photoHeight + maxLegendHeight + 8;
    
    if (yPos + rowHeight > pageHeight - 25) {
      doc.addPage();
      yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    }
    
    // Process up to 2 photos per row
    for (let j = 0; j < 2 && (i + j) < photoUrls.length; j++) {
      const photoIndex = i + j;
      const url = photoUrls[photoIndex];
      const xPos = margin + j * (photoWidth + spacing);
      
      const photoAnnotation = annotations.find(a => a.photoIndex === photoIndex);
      const photoMarkers = photoAnnotation?.annotations || [];
      
      try {
        const base64 = await loadImageAsBase64(url, forEmail);
        if (base64) {
          // Photo label
          const photoLabel = PHOTO_LABELS[photoIndex] || `Photo ${photoIndex + 1}`;
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.textMuted);
          doc.text(photoLabel, xPos, yPos);
          
          const photoY = yPos + 3;
          
          // Photo frame with subtle shadow effect
          doc.setFillColor(...COLORS.border);
          doc.rect(xPos + 1, photoY + 1, photoWidth, photoHeight, 'F');
          
          // Photo
          doc.addImage(base64, 'JPEG', xPos, photoY, photoWidth, photoHeight);
          
          // Frame border
          doc.setDrawColor(...COLORS.border);
          doc.setLineWidth(0.3);
          doc.rect(xPos, photoY, photoWidth, photoHeight, 'S');
          
          // Draw markers on the photo
          if (photoMarkers.length > 0) {
            for (let k = 0; k < photoMarkers.length; k++) {
              const marker = photoMarkers[k];
              const markerX = xPos + (marker.x / 100) * photoWidth;
              const markerY = photoY + (marker.y / 100) * photoHeight;
              
              // Marker with white outline for visibility
              doc.setFillColor(...COLORS.danger);
              doc.circle(markerX, markerY, 2.5, 'F');
              doc.setDrawColor(...COLORS.white);
              doc.setLineWidth(0.6);
              doc.circle(markerX, markerY, 2.5, 'S');
              
              // Number
              doc.setFontSize(6);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...COLORS.white);
              doc.text((k + 1).toString(), markerX, markerY + 0.7, { align: 'center' });
            }
          }
          
          // Legend below photo - show FULL text for each marker
          if (photoMarkers.length > 0) {
            let legendY = photoY + photoHeight + 4;
            
            doc.setFontSize(7);
            const maxLabelWidth = photoWidth - 14;
            
            // Calculate total height needed for all markers with wrapped text
            let totalLegendHeight = 4;
            const markerLineInfo: { lines: string[]; lineCount: number }[] = [];
            for (const marker of photoMarkers) {
              const labelLines = doc.splitTextToSize(marker.label, maxLabelWidth);
              markerLineInfo.push({ lines: labelLines, lineCount: labelLines.length });
              totalLegendHeight += labelLines.length * 3.5 + 2;
            }
            
            doc.setFillColor(...COLORS.background);
            drawRoundedRect(doc, xPos, legendY - 2, photoWidth, totalLegendHeight, 2);
            
            for (let k = 0; k < photoMarkers.length; k++) {
              const marker = photoMarkers[k];
              const labelLines = markerLineInfo[k].lines;
              
              // Number badge
              doc.setFillColor(...COLORS.danger);
              doc.circle(xPos + 5, legendY + 1, 2, 'F');
              doc.setTextColor(...COLORS.white);
              doc.setFont('helvetica', 'bold');
              doc.text((k + 1).toString(), xPos + 5, legendY + 1.7, { align: 'center' });
              
              // Label - show ALL lines (full text)
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

export const generatePDF = async (
  inspection: Inspection,
  branding?: BusinessBranding | null
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  const { yPos: headerEndY, logoBase64: cachedLogoBase64 } = await addProfessionalHeader(doc, pageWidth, branding);
  let yPos = headerEndY;
  
  // Title - elegant centered
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Rug Inspection Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  // Date - subtle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text(format(new Date(inspection.created_at), 'MMMM d, yyyy'), pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // Ornament divider
  addDivider(doc, yPos, margin, pageWidth, true);
  yPos += 10;
  
  // Executive Summary - NEW
  if (inspection.analysis_report) {
    yPos = addExecutiveSummary(doc, inspection, yPos, margin, pageWidth);
  }
  
  // Client and Rug info side by side
  const cardWidth = (pageWidth - margin * 2 - 10) / 2;
  
  yPos = addSectionHeader(doc, 'Client Information', yPos, margin, pageWidth);
  const clientCardY = yPos;
  yPos = addInfoCard(doc, [
    ['Name', inspection.client_name],
    ['Email', inspection.client_email || '—'],
    ['Phone', inspection.client_phone || '—'],
  ], yPos, margin, cardWidth);
  
  // Rug details - positioned alongside
  addSectionHeader(doc, 'Rug Details', clientCardY - 14, margin + cardWidth + 10, pageWidth);
  addInfoCard(doc, [
    ['Rug #', inspection.rug_number],
    ['Type', inspection.rug_type],
    ['Size', inspection.length && inspection.width ? `${inspection.length}' × ${inspection.width}'` : '—'],
  ], clientCardY, margin + cardWidth + 10, cardWidth);
  
  yPos += 5;
  
  // Notes if present
  if (inspection.notes) {
    yPos = addSectionHeader(doc, 'Notes', yPos, margin, pageWidth);
    
    doc.setFillColor(...COLORS.background);
    const noteLines = doc.splitTextToSize(inspection.notes, pageWidth - margin * 2 - 12);
    const noteHeight = noteLines.length * 4.5 + 8;
    drawRoundedRect(doc, margin, yPos, pageWidth - margin * 2, noteHeight, 2);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    
    let noteY = yPos + 5;
    noteLines.forEach((line: string) => {
      doc.text(line, margin + 6, noteY);
      noteY += 4.5;
    });
    
    yPos += noteHeight + 8;
  }
  
  // Photos - 2-up layout
  if (inspection.photo_urls && inspection.photo_urls.length > 0) {
    yPos = await addPhotosToPDF(doc, inspection.photo_urls, yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64, inspection.image_annotations);
  }
  
  // Cost breakdown table
  if (inspection.analysis_report) {
    yPos = addCostBreakdown(doc, inspection.analysis_report, yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64);
  }
  
  // Full analysis
  if (inspection.analysis_report) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    }
    
    yPos = addSectionHeader(doc, 'Professional Analysis & Recommendations', yPos, margin, pageWidth);
    yPos += 3;
    
    yPos = addFormattedAnalysis(
      doc, 
      inspection.analysis_report, 
      yPos, 
      margin, 
      pageWidth, 
      pageHeight,
      branding,
      cachedLogoBase64,
      true // Skip costs since we showed them in table
    );
  }
  
  // Add footers
  const totalPages = doc.getNumberOfPages();
  const businessName = branding?.business_name || 'RugBoost';
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addProfessionalFooter(doc, pageWidth, pageHeight, i, totalPages, businessName);
  }
  
  const fileName = `rug-inspection-${inspection.rug_number}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};

export const generateJobPDF = async (
  job: Job,
  rugs: Inspection[],
  branding?: BusinessBranding | null
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  const { yPos: headerEndY, logoBase64: cachedLogoBase64 } = await addProfessionalHeader(doc, pageWidth, branding);
  let yPos = headerEndY;
  
  const businessName = branding?.business_name || 'RugBoost';
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Comprehensive Inspection Report and Estimate', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  // Job number badge
  doc.setFillColor(...COLORS.primary);
  const jobText = `Job #${job.job_number}`;
  const jobWidth = doc.getTextWidth(jobText) * 1.5 + 16;
  drawRoundedRect(doc, (pageWidth - jobWidth) / 2, yPos - 4, jobWidth, 10, 3);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(jobText, pageWidth / 2, yPos + 2, { align: 'center' });
  yPos += 14;
  
  // Ornament divider
  addDivider(doc, yPos, margin, pageWidth, true);
  yPos += 10;
  
  // Two-column layout for info cards
  const cardWidth = (pageWidth - margin * 2 - 10) / 2;
  
  yPos = addSectionHeader(doc, 'Job Information', yPos, margin, pageWidth);
  const statusDisplay = job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('-', ' ');
  const jobCardY = yPos;
  yPos = addInfoCard(doc, [
    ['Status', statusDisplay],
    ['Date', format(new Date(job.created_at), 'MMM d, yyyy')],
    ['Total Rugs', rugs.length.toString()],
  ], yPos, margin, cardWidth);
  
  // Client info card - only show Notes if present
  const clientInfoData: [string, string][] = [
    ['Name', job.client_name],
    ['Email', job.client_email || '—'],
    ['Phone', job.client_phone || '—'],
  ];
  if (job.notes && job.notes.trim()) {
    clientInfoData.push(['Notes', job.notes.length > 25 ? job.notes.substring(0, 22) + '...' : job.notes]);
  }
  
  addSectionHeader(doc, 'Client Information', jobCardY - 14, margin + cardWidth + 10, pageWidth);
  addInfoCard(doc, clientInfoData, jobCardY, margin + cardWidth + 10, cardWidth);
  
  yPos += 5;
  
  // Rugs summary table - with thumbnail column
  yPos = addSectionHeader(doc, 'Rugs Summary', yPos, margin, pageWidth);
  
  // Pre-load thumbnails before rendering table
  const thumbnails: (string | null)[] = await Promise.all(
    rugs.map(async (rug) => {
      if (rug.photo_urls && rug.photo_urls.length > 0) {
        try {
          return await loadImageAsBase64(rug.photo_urls[0], true);
        } catch {
          return null;
        }
      }
      return null;
    })
  );
  
  // Prepare rug data
  const rugsSummary = rugs.map((rug) => [
    '', // Thumbnail placeholder
    rug.rug_number,
    rug.rug_type,
    rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—',
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['', 'Rug Number', 'Type', 'Dimensions']],
    body: rugsSummary,
    theme: 'plain',
    styles: { 
      fontSize: 8,
      cellPadding: 3,
      textColor: COLORS.text,
      minCellHeight: 12,
    },
    headStyles: { 
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: COLORS.background,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
    },
    margin: { left: margin, right: margin },
    didDrawCell: (data) => {
      // Add thumbnail in first column for body rows
      if (data.column.index === 0 && data.section === 'body') {
        const thumbBase64 = thumbnails[data.row.index];
        if (thumbBase64) {
          try {
            const thumbSize = 10;
            const cellX = data.cell.x + (data.cell.width - thumbSize) / 2;
            const cellY = data.cell.y + (data.cell.height - thumbSize) / 2;
            doc.addImage(thumbBase64, 'JPEG', cellX, cellY, thumbSize, thumbSize);
          } catch {
            // Thumbnail failed, leave empty
          }
        }
      }
    },
  });
  
  // Individual rug reports
  for (const rug of rugs) {
    doc.addPage();
    yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    
    // Rug title with badge
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(`Rug: ${rug.rug_number}`, margin, yPos);
    
    // Status badge
    if (rug.analysis_report) {
      doc.setFillColor(...COLORS.success);
      doc.roundedRect(pageWidth - margin - 22, yPos - 5, 22, 7, 2, 2, 'F');
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.white);
      doc.text('ANALYZED', pageWidth - margin - 11, yPos - 0.5, { align: 'center' });
    }
    
    yPos += 10;
    
    // Executive summary for this rug (includes type, dimensions, short appraisal, cost)
    if (rug.analysis_report) {
      yPos = addExecutiveSummary(doc, rug, yPos, margin, pageWidth);
    }
    
    yPos += 3;
    
    // SECTION ORDER (per reference PDF):
    // 1. Comprehensive Service Descriptions (detailed service explanations)
    // 2. Detailed Breakdown (cost table)
    // 3. Strongly Recommended Additional Protection
    
    if (rug.analysis_report) {
      const sections = parseAnalysisSections(rug.analysis_report);
      
      // 1. Comprehensive Service Descriptions (professional analysis + service details)
      const serviceContent = [
        sections.professionalAnalysis,
        sections.serviceDescriptions,
        sections.otherContent
      ].filter(s => s.trim()).join('\n\n');
      
      if (serviceContent.trim()) {
        yPos = addAnalysisSection(doc, serviceContent, 'Comprehensive Service Descriptions', yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64);
      }
      
      // 2. Detailed Breakdown (cost table)
      yPos = addCostBreakdown(doc, rug.analysis_report, yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64);
      
      // 3. Strongly Recommended Additional Protection
      if (sections.additionalServices.trim()) {
        yPos = addAnalysisSection(doc, sections.additionalServices, 'Strongly Recommended Additional Protection', yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64);
      }
    }
    
    // Inspection Photos - 2-up layout (after all text sections)
    if (rug.photo_urls && rug.photo_urls.length > 0) {
      yPos = await addPhotosToPDF(doc, rug.photo_urls, yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64, rug.image_annotations);
    }
  }
  
  // Add footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addProfessionalFooter(doc, pageWidth, pageHeight, i, totalPages, businessName, job.job_number);
  }
  
  const fileName = `job-report-${job.job_number}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};

// Generate PDF and return as base64 string (for email attachments)
export const generateJobPDFBase64 = async (
  job: Job,
  rugs: Inspection[],
  branding?: BusinessBranding | null
): Promise<string> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  const { yPos: headerEndY, logoBase64: cachedLogoBase64 } = await addProfessionalHeader(doc, pageWidth, branding);
  let yPos = headerEndY;
  
  const businessName = branding?.business_name || 'RugBoost';
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Comprehensive Inspection Report and Estimate', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  // Job number badge
  doc.setFillColor(...COLORS.primary);
  const jobText = `Job #${job.job_number}`;
  const jobWidth = doc.getTextWidth(jobText) * 1.5 + 16;
  drawRoundedRect(doc, (pageWidth - jobWidth) / 2, yPos - 4, jobWidth, 10, 3);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(jobText, pageWidth / 2, yPos + 2, { align: 'center' });
  yPos += 14;
  
  addDivider(doc, yPos, margin, pageWidth, true);
  yPos += 10;
  
  // Two-column layout
  const cardWidth = (pageWidth - margin * 2 - 10) / 2;
  
  yPos = addSectionHeader(doc, 'Job Information', yPos, margin, pageWidth);
  const statusDisplay2 = job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('-', ' ');
  const jobCardY2 = yPos;
  yPos = addInfoCard(doc, [
    ['Status', statusDisplay2],
    ['Date', format(new Date(job.created_at), 'MMM d, yyyy')],
    ['Total Rugs', rugs.length.toString()],
  ], yPos, margin, cardWidth);
  
  // Client info card - only show Notes if present
  const clientInfoData2: [string, string][] = [
    ['Name', job.client_name],
    ['Email', job.client_email || '—'],
    ['Phone', job.client_phone || '—'],
  ];
  if (job.notes && job.notes.trim()) {
    clientInfoData2.push(['Notes', job.notes.length > 25 ? job.notes.substring(0, 22) + '...' : job.notes]);
  }
  
  addSectionHeader(doc, 'Client Information', jobCardY2 - 14, margin + cardWidth + 10, pageWidth);
  addInfoCard(doc, clientInfoData2, jobCardY2, margin + cardWidth + 10, cardWidth);
  
  yPos += 5;
  
  // Rugs summary - with thumbnail column
  yPos = addSectionHeader(doc, 'Rugs Summary', yPos, margin, pageWidth);
  
  // Pre-load thumbnails before rendering table
  const thumbnails2: (string | null)[] = await Promise.all(
    rugs.map(async (rug) => {
      if (rug.photo_urls && rug.photo_urls.length > 0) {
        try {
          return await loadImageAsBase64(rug.photo_urls[0], true);
        } catch {
          return null;
        }
      }
      return null;
    })
  );
  
  const rugsSummary2 = rugs.map((rug) => [
    '', // Thumbnail placeholder
    rug.rug_number,
    rug.rug_type,
    rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—',
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['', 'Rug Number', 'Type', 'Dimensions']],
    body: rugsSummary2,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.text, minCellHeight: 12 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: COLORS.background },
    columnStyles: { 0: { cellWidth: 16, halign: 'center' } },
    margin: { left: margin, right: margin },
    didDrawCell: (data) => {
      if (data.column.index === 0 && data.section === 'body') {
        const thumbBase64 = thumbnails2[data.row.index];
        if (thumbBase64) {
          try {
            const thumbSize = 10;
            const cellX = data.cell.x + (data.cell.width - thumbSize) / 2;
            const cellY = data.cell.y + (data.cell.height - thumbSize) / 2;
            doc.addImage(thumbBase64, 'JPEG', cellX, cellY, thumbSize, thumbSize);
          } catch {
            // Thumbnail failed
          }
        }
      }
    },
  });
  
  // Individual rug reports
  for (const rug of rugs) {
    doc.addPage();
    yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(`Rug: ${rug.rug_number}`, margin, yPos);
    
    if (rug.analysis_report) {
      doc.setFillColor(...COLORS.success);
      doc.roundedRect(pageWidth - margin - 22, yPos - 5, 22, 7, 2, 2, 'F');
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.white);
      doc.text('ANALYZED', pageWidth - margin - 11, yPos - 0.5, { align: 'center' });
    }
    
    yPos += 10;
    
    // Executive summary (includes type, dimensions, short appraisal, cost)
    if (rug.analysis_report) {
      yPos = addExecutiveSummary(doc, rug, yPos, margin, pageWidth);
    }
    
    yPos += 3;
    
    // SECTION ORDER (per reference PDF):
    // 1. Comprehensive Service Descriptions (detailed service explanations)
    // 2. Detailed Breakdown (cost table)
    // 3. Strongly Recommended Additional Protection
    
    if (rug.analysis_report) {
      const sections = parseAnalysisSections(rug.analysis_report);
      
      // 1. Comprehensive Service Descriptions (professional analysis + service details)
      const serviceContent = [
        sections.professionalAnalysis,
        sections.serviceDescriptions,
        sections.otherContent
      ].filter(s => s.trim()).join('\n\n');
      
      if (serviceContent.trim()) {
        yPos = addAnalysisSection(doc, serviceContent, 'Comprehensive Service Descriptions', yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64);
      }
      
      // 2. Detailed Breakdown (cost table)
      yPos = addCostBreakdown(doc, rug.analysis_report, yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64);
      
      // 3. Strongly Recommended Additional Protection
      if (sections.additionalServices.trim()) {
        yPos = addAnalysisSection(doc, sections.additionalServices, 'Strongly Recommended Additional Protection', yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64);
      }
    }
    
    // Inspection Photos - 2-up layout (after all text sections)
    if (rug.photo_urls && rug.photo_urls.length > 0) {
      yPos = await addPhotosToPDF(doc, rug.photo_urls, yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64, rug.image_annotations, true);
    }
  }
  
  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addProfessionalFooter(doc, pageWidth, pageHeight, i, totalPages, businessName, job.job_number);
  }
  
  return doc.output('datauristring').split(',')[1];
};
