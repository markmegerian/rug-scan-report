import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface ImageAnnotation {
  label: string;
  location: string;
  x: number;
  y: number;
}

interface PhotoAnnotations {
  photoIndex: number;
  annotations: ImageAnnotation[];
}

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
  image_annotations?: PhotoAnnotations[] | unknown;
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

export interface BusinessBranding {
  business_name: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  logo_url: string | null;
}

// Color palette
const COLORS = {
  primary: [30, 64, 175] as [number, number, number],     // Deep blue
  primaryLight: [59, 130, 246] as [number, number, number], // Light blue
  secondary: [100, 116, 139] as [number, number, number],  // Slate
  accent: [245, 158, 11] as [number, number, number],      // Amber
  text: [15, 23, 42] as [number, number, number],          // Slate 900
  textMuted: [100, 116, 139] as [number, number, number],  // Slate 500
  border: [226, 232, 240] as [number, number, number],     // Slate 200
  background: [248, 250, 252] as [number, number, number], // Slate 50
  white: [255, 255, 255] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],      // Green
};

// Default RugBoost logo as base64 PNG (fallback when no custom logo)
const RUGBOOST_LOGO_BASE64 = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgODkwIiBmaWxsPSJub25lIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZCIgeDE9IjAlIiB5MT0iMjAlIiB4Mj0iMTAwJSIgeTI9IjgwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMyMTc0QzYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNkU1NEQxIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cGF0aCBkPSJNMTIwIDQ0NUMxMjAgMzY4IDI2My41NyAyNDMuNTcgMzAwIDE2MCAzNTQuMjMgMjIzLjkgNDc0IDM2MiA0ODAgNDQ1IDQ4MCA1MjAgNDIwIDY5MCAzMDAgNjkwIDE4MCA2OTAgMTIwIDUyMCAxMjAgNDQ1WiIgZmlsbD0idXJsKCNncmFkKSIvPgogIDxwYXRoIGQ9Ik0yMDAgNDYwQzIwMCAzNjAgMzQwIDMwMCAzMDAgMjIwIDI2MCAzMDAgNDAwIDM2MCA0MDAgNDYwIDQwMCA1NjAgMzIwIDYyMCAzMDAgNjIwIDI4MCA2MjAgMjAwIDU2MCAyMDAgNDYwWiIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4zIi8+Cjwvc3ZnPg==`;

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

// Professional header with logo
const addProfessionalHeader = async (
  doc: jsPDF,
  pageWidth: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null
): Promise<{ yPos: number; logoBase64: string | null }> => {
  const margin = 15;
  const headerHeight = 45;
  
  // Header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  
  // Add subtle gradient effect with lighter strip
  doc.setFillColor(...COLORS.primaryLight);
  doc.rect(0, headerHeight - 3, pageWidth, 3, 'F');
  
  const businessName = branding?.business_name || 'RugBoost';
  let logoBase64 = cachedLogoBase64;
  
  if (!logoBase64 && branding?.logo_url) {
    logoBase64 = await loadImageAsBase64(branding.logo_url);
  }
  if (!logoBase64) {
    logoBase64 = RUGBOOST_LOGO_BASE64;
  }
  
  // Logo
  const logoSize = 25;
  const logoX = margin;
  const logoY = (headerHeight - logoSize) / 2;
  
  try {
    const format = logoBase64.includes('image/png') ? 'PNG' : 
                   logoBase64.includes('image/svg') ? 'SVG' : 'JPEG';
    
    // White background circle for logo
    doc.setFillColor(...COLORS.white);
    doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2 + 2, 'F');
    
    doc.addImage(logoBase64, format, logoX, logoY, logoSize, logoSize);
  } catch (error) {
    console.error('Failed to add logo:', error);
  }
  
  // Company name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(businessName, logoX + logoSize + 10, headerHeight / 2 + 2);
  
  // Contact info on right side
  const rightX = pageWidth - margin;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  let infoY = 15;
  if (branding?.business_phone) {
    doc.text(branding.business_phone, rightX, infoY, { align: 'right' });
    infoY += 5;
  }
  if (branding?.business_email) {
    doc.text(branding.business_email, rightX, infoY, { align: 'right' });
    infoY += 5;
  }
  if (branding?.business_address) {
    const addressLines = doc.splitTextToSize(branding.business_address, 60);
    addressLines.forEach((line: string) => {
      doc.text(line, rightX, infoY, { align: 'right' });
      infoY += 4;
    });
  }
  
  return { yPos: headerHeight + 15, logoBase64 };
};

// Sync version for subsequent pages
const addProfessionalHeaderSync = (
  doc: jsPDF,
  pageWidth: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null
): number => {
  const margin = 15;
  const headerHeight = 35;
  
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  
  doc.setFillColor(...COLORS.primaryLight);
  doc.rect(0, headerHeight - 2, pageWidth, 2, 'F');
  
  const businessName = branding?.business_name || 'RugBoost';
  const logoBase64 = cachedLogoBase64 || RUGBOOST_LOGO_BASE64;
  
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
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(businessName, logoX + logoSize + 8, headerHeight / 2 + 2);
  
  return headerHeight + 10;
};

// Section header with accent bar
const addSectionHeader = (
  doc: jsPDF,
  title: string,
  yPos: number,
  margin: number
): number => {
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, yPos, 4, 8, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(title, margin + 8, yPos + 6);
  
  return yPos + 14;
};

// Info card with background
const addInfoCard = (
  doc: jsPDF,
  data: [string, string][],
  yPos: number,
  margin: number,
  width: number
): number => {
  doc.setFillColor(...COLORS.background);
  const cardHeight = data.length * 8 + 10;
  drawRoundedRect(doc, margin, yPos, width, cardHeight, 3);
  
  let innerY = yPos + 8;
  data.forEach(([label, value]) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(label.toUpperCase(), margin + 8, innerY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(value || '—', margin + 50, innerY);
    
    innerY += 8;
  });
  
  return yPos + cardHeight + 8;
};

// Professional footer
const addProfessionalFooter = (
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  pageNum: number,
  totalPages: number,
  businessName: string,
  jobNumber?: string
) => {
  const footerY = pageHeight - 15;
  const margin = 15;
  
  // Footer line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  
  // Left: Company name
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

// Format analysis report with proper sections
const addFormattedAnalysis = (
  doc: jsPDF,
  analysis: string,
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null
): number => {
  let yPos = startY;
  const maxWidth = pageWidth - margin * 2 - 10;
  
  // Parse analysis into sections
  const lines = analysis.split('\n');
  let currentSection = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      yPos += 3;
      continue;
    }
    
    // Check for page break
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    }
    
    // Check if this is a section header (starts with ** or ###)
    const isHeader = trimmedLine.startsWith('**') || trimmedLine.startsWith('###') || trimmedLine.startsWith('##');
    const isBullet = trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.startsWith('*');
    const isNumbered = /^\d+\./.test(trimmedLine);
    
    if (isHeader) {
      // Clean the header text
      const headerText = trimmedLine.replace(/[#*]/g, '').trim();
      
      yPos += 4;
      
      // Section header with colored background
      doc.setFillColor(...COLORS.background);
      doc.rect(margin, yPos - 4, pageWidth - margin * 2, 10, 'F');
      
      doc.setFillColor(...COLORS.primary);
      doc.rect(margin, yPos - 4, 3, 10, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(headerText, margin + 6, yPos + 2);
      
      yPos += 12;
      currentSection = headerText;
    } else if (isBullet || isNumbered) {
      // Bullet or numbered item
      const bulletText = trimmedLine.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '');
      const wrappedLines = doc.splitTextToSize(bulletText, maxWidth - 10);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      
      // Draw bullet point
      if (isBullet) {
        doc.setFillColor(...COLORS.primary);
        doc.circle(margin + 5, yPos - 1, 1.5, 'F');
      } else {
        const num = trimmedLine.match(/^(\d+)\./)?.[1] || '';
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text(num + '.', margin + 2, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text);
      }
      
      wrappedLines.forEach((wLine: string, idx: number) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
        }
        doc.text(wLine, margin + 12, yPos);
        yPos += 5;
      });
      
      yPos += 1;
    } else {
      // Regular paragraph text
      const wrappedLines = doc.splitTextToSize(trimmedLine, maxWidth);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      
      wrappedLines.forEach((wLine: string) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
        }
        doc.text(wLine, margin + 2, yPos);
        yPos += 5;
      });
      
      yPos += 2;
    }
  }
  
  return yPos;
};

// Helper to add photos with markers to PDF
const addPhotosToPDF = async (
  doc: jsPDF,
  photoUrls: string[],
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null,
  imageAnnotations?: PhotoAnnotations[]
): Promise<number> => {
  let yPos = startY;
  
  yPos = addSectionHeader(doc, 'Inspection Photos', yPos, margin);
  yPos += 5;
  
  const photoWidth = 85;
  const photoHeight = 65;
  const photosPerRow = 2;
  const spacing = 10;
  
  let currentX = margin;
  let photosInRow = 0;
  
  for (let photoIndex = 0; photoIndex < photoUrls.length; photoIndex++) {
    const url = photoUrls[photoIndex];
    
    if (yPos + photoHeight + 25 > pageHeight - 30) {
      doc.addPage();
      yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
      currentX = margin;
      photosInRow = 0;
    }
    
    try {
      const base64 = await loadImageAsBase64(url);
      if (base64) {
        // Photo frame
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.5);
        doc.rect(currentX - 1, yPos - 1, photoWidth + 2, photoHeight + 2);
        
        doc.addImage(base64, 'JPEG', currentX, yPos, photoWidth, photoHeight);
        
        // Draw markers on photo if annotations exist
        const photoAnnotation = imageAnnotations?.find(a => a.photoIndex === photoIndex);
        if (photoAnnotation && photoAnnotation.annotations.length > 0) {
          photoAnnotation.annotations.forEach((annotation, annIndex) => {
            // Calculate marker position on the PDF photo
            const markerX = currentX + (annotation.x / 100) * photoWidth;
            const markerY = yPos + (annotation.y / 100) * photoHeight;
            
            // Draw marker circle
            doc.setFillColor(239, 68, 68); // Red color for markers
            doc.circle(markerX, markerY, 3, 'F');
            
            // Draw marker number
            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text((annIndex + 1).toString(), markerX, markerY + 1, { align: 'center' });
          });
        }
        
        // Add annotation legend below photo if there are annotations
        let legendHeight = 0;
        if (photoAnnotation && photoAnnotation.annotations.length > 0) {
          legendHeight = Math.min(photoAnnotation.annotations.length * 4 + 2, 20);
          let legendY = yPos + photoHeight + 3;
          
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.text);
          
          photoAnnotation.annotations.slice(0, 4).forEach((annotation, annIndex) => {
            // Marker number
            doc.setFillColor(239, 68, 68);
            doc.circle(currentX + 2, legendY - 1, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(5);
            doc.text((annIndex + 1).toString(), currentX + 2, legendY, { align: 'center' });
            
            // Label text
            doc.setTextColor(...COLORS.text);
            doc.setFontSize(6);
            const labelText = annotation.label.length > 35 ? annotation.label.substring(0, 35) + '...' : annotation.label;
            doc.text(labelText, currentX + 6, legendY);
            legendY += 4;
          });
          
          if (photoAnnotation.annotations.length > 4) {
            doc.setTextColor(...COLORS.textMuted);
            doc.text(`+${photoAnnotation.annotations.length - 4} more issues`, currentX + 6, legendY);
          }
        }
        
        photosInRow++;
        if (photosInRow >= photosPerRow) {
          yPos += photoHeight + legendHeight + spacing;
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
  
  if (photosInRow > 0) {
    yPos += photoHeight + spacing;
  }
  
  return yPos;
};

// Add dedicated annotation pages with large photos and full marker details
const addAnnotationPages = async (
  doc: jsPDF,
  photoUrls: string[],
  imageAnnotations: PhotoAnnotations[],
  pageWidth: number,
  pageHeight: number,
  margin: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null,
  rugNumber?: string
): Promise<void> => {
  // Only add annotation pages if there are photos with annotations
  const photosWithAnnotations = photoUrls.map((url, index) => ({
    url,
    photoIndex: index,
    annotations: imageAnnotations.find(a => a.photoIndex === index)?.annotations || []
  })).filter(p => p.annotations.length > 0);

  if (photosWithAnnotations.length === 0) return;

  for (const photo of photosWithAnnotations) {
    doc.addPage();
    let yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    
    // Page title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    const titleText = rugNumber 
      ? `Photo Analysis: ${rugNumber} - Photo ${photo.photoIndex + 1}`
      : `Photo Analysis: Photo ${photo.photoIndex + 1}`;
    doc.text(titleText, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    
    // Issues count badge
    doc.setFillColor(...COLORS.primary);
    const badgeText = `${photo.annotations.length} Issue${photo.annotations.length > 1 ? 's' : ''} Identified`;
    const badgeWidth = doc.getTextWidth(badgeText) + 16;
    drawRoundedRect(doc, (pageWidth - badgeWidth) / 2, yPos - 5, badgeWidth, 10, 2);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text(badgeText, pageWidth / 2, yPos + 1, { align: 'center' });
    yPos += 15;
    
    // Large photo with markers
    const photoMaxWidth = pageWidth - margin * 2;
    const photoMaxHeight = 120; // Larger photo
    
    try {
      const base64 = await loadImageAsBase64(photo.url);
      if (base64) {
        // Photo container with shadow effect
        doc.setFillColor(240, 240, 240);
        doc.rect(margin - 2, yPos - 2, photoMaxWidth + 4, photoMaxHeight + 4, 'F');
        
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(1);
        doc.rect(margin, yPos, photoMaxWidth, photoMaxHeight);
        
        doc.addImage(base64, 'JPEG', margin, yPos, photoMaxWidth, photoMaxHeight);
        
        // Draw larger markers on the photo
        photo.annotations.forEach((annotation, annIndex) => {
          const markerX = margin + (annotation.x / 100) * photoMaxWidth;
          const markerY = yPos + (annotation.y / 100) * photoMaxHeight;
          
          // Outer ring for visibility
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(1.5);
          doc.circle(markerX, markerY, 5, 'S');
          
          // Filled circle
          doc.setFillColor(239, 68, 68);
          doc.circle(markerX, markerY, 4, 'F');
          
          // Number
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text((annIndex + 1).toString(), markerX, markerY + 2, { align: 'center' });
        });
        
        yPos += photoMaxHeight + 10;
      }
    } catch (error) {
      console.error('Error adding annotation page image:', error);
      yPos += 10;
    }
    
    // Detailed annotations list
    yPos = addSectionHeader(doc, 'Issue Details', yPos, margin);
    yPos += 5;
    
    // Create a card for each annotation
    for (let i = 0; i < photo.annotations.length; i++) {
      const annotation = photo.annotations[i];
      
      // Check if we need a new page
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
        yPos = addSectionHeader(doc, 'Issue Details (continued)', yPos, margin);
        yPos += 5;
      }
      
      // Annotation card
      const cardHeight = 22;
      doc.setFillColor(...COLORS.background);
      drawRoundedRect(doc, margin, yPos, pageWidth - margin * 2, cardHeight, 3);
      
      // Number badge
      doc.setFillColor(239, 68, 68);
      doc.circle(margin + 12, yPos + cardHeight / 2, 6, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text((i + 1).toString(), margin + 12, yPos + cardHeight / 2 + 2.5, { align: 'center' });
      
      // Issue label
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text(annotation.label, margin + 24, yPos + 9);
      
      // Location info
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textMuted);
      const locationText = `Location: ${annotation.location || 'On rug'} (${Math.round(annotation.x)}%, ${Math.round(annotation.y)}%)`;
      doc.text(locationText, margin + 24, yPos + 17);
      
      yPos += cardHeight + 5;
    }
  }
};

export const generatePDF = async (
  inspection: Inspection,
  branding?: BusinessBranding | null
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  // Add header
  const { yPos: headerEndY, logoBase64: cachedLogoBase64 } = await addProfessionalHeader(doc, pageWidth, branding);
  let yPos = headerEndY;
  
  // Title section
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Rug Inspection Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // Date badge
  doc.setFillColor(...COLORS.background);
  const dateText = format(new Date(inspection.created_at), 'MMMM d, yyyy');
  const dateWidth = doc.getTextWidth(dateText) + 20;
  drawRoundedRect(doc, (pageWidth - dateWidth) / 2, yPos - 4, dateWidth, 10, 2);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text(dateText, pageWidth / 2, yPos + 2, { align: 'center' });
  yPos += 18;
  
  // Two column layout for info cards
  const cardWidth = (pageWidth - margin * 2 - 10) / 2;
  
  // Client Information
  yPos = addSectionHeader(doc, 'Client Information', yPos, margin);
  yPos = addInfoCard(doc, [
    ['Name', inspection.client_name],
    ['Email', inspection.client_email || '—'],
    ['Phone', inspection.client_phone || '—'],
  ], yPos, margin, cardWidth);
  
  // Rug Details (positioned next to client info on same row)
  const rugYStart = yPos - (3 * 8 + 10 + 8 + 14);
  addSectionHeader(doc, 'Rug Details', rugYStart, margin + cardWidth + 10);
  addInfoCard(doc, [
    ['Rug #', inspection.rug_number],
    ['Type', inspection.rug_type],
    ['Size', inspection.length && inspection.width ? `${inspection.length}' × ${inspection.width}'` : '—'],
  ], rugYStart + 14, margin + cardWidth + 10, cardWidth);
  
  yPos += 5;
  
  // Notes if present
  if (inspection.notes) {
    yPos = addSectionHeader(doc, 'Notes', yPos, margin);
    
    doc.setFillColor(...COLORS.background);
    const noteLines = doc.splitTextToSize(inspection.notes, pageWidth - margin * 2 - 16);
    const noteHeight = noteLines.length * 5 + 10;
    drawRoundedRect(doc, margin, yPos, pageWidth - margin * 2, noteHeight, 3);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    
    let noteY = yPos + 7;
    noteLines.forEach((line: string) => {
      doc.text(line, margin + 8, noteY);
      noteY += 5;
    });
    
    yPos += noteHeight + 10;
  }
  
  // Photos with markers
  if (inspection.photo_urls && inspection.photo_urls.length > 0) {
    const annotations = Array.isArray(inspection.image_annotations) 
      ? inspection.image_annotations as PhotoAnnotations[]
      : [];
    yPos = await addPhotosToPDF(doc, inspection.photo_urls, yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64, annotations);
  }
  
  // AI Analysis
  if (inspection.analysis_report) {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    }
    
    yPos = addSectionHeader(doc, 'Professional Analysis & Recommendations', yPos, margin);
    yPos += 5;
    
    yPos = addFormattedAnalysis(
      doc, 
      inspection.analysis_report, 
      yPos, 
      margin, 
      pageWidth, 
      pageHeight,
      branding,
      cachedLogoBase64
    );
  }
  
  // Add dedicated annotation pages with large photos
  if (inspection.photo_urls && inspection.photo_urls.length > 0) {
    const annotations = Array.isArray(inspection.image_annotations) 
      ? inspection.image_annotations as PhotoAnnotations[]
      : [];
    await addAnnotationPages(
      doc, 
      inspection.photo_urls, 
      annotations, 
      pageWidth, 
      pageHeight, 
      margin, 
      branding, 
      cachedLogoBase64,
      inspection.rug_number
    );
  }
  
  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  const businessName = branding?.business_name || 'RugBoost';
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addProfessionalFooter(doc, pageWidth, pageHeight, i, totalPages, businessName);
  }
  
  // Save
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
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Complete Job Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;
  
  // Job number badge
  doc.setFillColor(...COLORS.primary);
  const jobText = `Job #${job.job_number}`;
  const jobWidth = doc.getTextWidth(jobText) + 24;
  drawRoundedRect(doc, (pageWidth - jobWidth) / 2, yPos - 5, jobWidth, 12, 3);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(jobText, pageWidth / 2, yPos + 3, { align: 'center' });
  yPos += 20;
  
  // Job and Client info in two columns
  const cardWidth = (pageWidth - margin * 2 - 10) / 2;
  
  yPos = addSectionHeader(doc, 'Job Information', yPos, margin);
  const statusDisplay = job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('-', ' ');
  yPos = addInfoCard(doc, [
    ['Status', statusDisplay],
    ['Date', format(new Date(job.created_at), 'MMM d, yyyy')],
    ['Total Rugs', rugs.length.toString()],
    ['Analyzed', rugs.filter(r => r.analysis_report).length.toString()],
  ], yPos, margin, cardWidth);
  
  const clientYStart = yPos - (4 * 8 + 10 + 8 + 14);
  addSectionHeader(doc, 'Client Information', clientYStart, margin + cardWidth + 10);
  addInfoCard(doc, [
    ['Name', job.client_name],
    ['Email', job.client_email || '—'],
    ['Phone', job.client_phone || '—'],
    ['Notes', job.notes ? (job.notes.length > 30 ? job.notes.substring(0, 30) + '...' : job.notes) : '—'],
  ], clientYStart + 14, margin + cardWidth + 10, cardWidth);
  
  yPos += 5;
  
  // Rugs summary table
  yPos = addSectionHeader(doc, 'Rugs Summary', yPos, margin);
  
  const rugsSummary = rugs.map((rug, index) => [
    (index + 1).toString(),
    rug.rug_number,
    rug.rug_type,
    rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—',
    rug.analysis_report ? '✓ Analyzed' : 'Pending',
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Rug Number', 'Type', 'Dimensions', 'Status']],
    body: rugsSummary,
    theme: 'striped',
    styles: { 
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: { 
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: COLORS.background,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      4: { halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });
  
  // Individual rug reports
  for (const rug of rugs) {
    doc.addPage();
    yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    
    // Rug title with badge
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(`Rug: ${rug.rug_number}`, margin, yPos);
    
    // Status badge
    if (rug.analysis_report) {
      doc.setFillColor(...COLORS.success);
      doc.roundedRect(pageWidth - margin - 25, yPos - 6, 25, 8, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.white);
      doc.text('ANALYZED', pageWidth - margin - 12.5, yPos - 1, { align: 'center' });
    }
    
    yPos += 12;
    
    // Rug details card
    yPos = addInfoCard(doc, [
      ['Type', rug.rug_type],
      ['Dimensions', rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—'],
      ['Notes', rug.notes || '—'],
    ], yPos, margin, pageWidth - margin * 2);
    
    yPos += 5;
    
    // Photos with markers
    if (rug.photo_urls && rug.photo_urls.length > 0) {
      const annotations = Array.isArray(rug.image_annotations) 
        ? rug.image_annotations as PhotoAnnotations[]
        : [];
      yPos = await addPhotosToPDF(doc, rug.photo_urls, yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64, annotations);
    }
    
    // Analysis
    if (rug.analysis_report) {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
      }
      
      yPos = addSectionHeader(doc, 'Professional Analysis', yPos, margin);
      yPos += 5;
      
      yPos = addFormattedAnalysis(
        doc,
        rug.analysis_report,
        yPos,
        margin,
        pageWidth,
        pageHeight,
        branding,
        cachedLogoBase64
      );
    }
    
    // Add dedicated annotation pages for this rug
    if (rug.photo_urls && rug.photo_urls.length > 0) {
      const annotations = Array.isArray(rug.image_annotations) 
        ? rug.image_annotations as PhotoAnnotations[]
        : [];
      await addAnnotationPages(
        doc, 
        rug.photo_urls, 
        annotations, 
        pageWidth, 
        pageHeight, 
        margin, 
        branding, 
        cachedLogoBase64,
        rug.rug_number
      );
    }
  }
  
  // Add footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addProfessionalFooter(doc, pageWidth, pageHeight, i, totalPages, businessName, job.job_number);
  }
  
  // Save
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
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Complete Job Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;
  
  // Job number badge
  doc.setFillColor(...COLORS.primary);
  const jobText = `Job #${job.job_number}`;
  const jobWidth = doc.getTextWidth(jobText) + 24;
  drawRoundedRect(doc, (pageWidth - jobWidth) / 2, yPos - 5, jobWidth, 12, 3);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(jobText, pageWidth / 2, yPos + 3, { align: 'center' });
  yPos += 20;
  
  // Job and Client info
  const cardWidth = (pageWidth - margin * 2 - 10) / 2;
  
  yPos = addSectionHeader(doc, 'Job Information', yPos, margin);
  const statusDisplay = job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('-', ' ');
  yPos = addInfoCard(doc, [
    ['Status', statusDisplay],
    ['Date', format(new Date(job.created_at), 'MMM d, yyyy')],
    ['Total Rugs', rugs.length.toString()],
    ['Analyzed', rugs.filter(r => r.analysis_report).length.toString()],
  ], yPos, margin, cardWidth);
  
  const clientYStart = yPos - (4 * 8 + 10 + 8 + 14);
  addSectionHeader(doc, 'Client Information', clientYStart, margin + cardWidth + 10);
  addInfoCard(doc, [
    ['Name', job.client_name],
    ['Email', job.client_email || '—'],
    ['Phone', job.client_phone || '—'],
    ['Notes', job.notes ? (job.notes.length > 30 ? job.notes.substring(0, 30) + '...' : job.notes) : '—'],
  ], clientYStart + 14, margin + cardWidth + 10, cardWidth);
  
  yPos += 5;
  
  // Rugs summary
  yPos = addSectionHeader(doc, 'Rugs Summary', yPos, margin);
  
  const rugsSummary = rugs.map((rug, index) => [
    (index + 1).toString(),
    rug.rug_number,
    rug.rug_type,
    rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—',
    rug.analysis_report ? '✓ Analyzed' : 'Pending',
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Rug Number', 'Type', 'Dimensions', 'Status']],
    body: rugsSummary,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLORS.background },
    columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 4: { halign: 'center' } },
    margin: { left: margin, right: margin },
  });
  
  // Individual rug reports
  for (const rug of rugs) {
    doc.addPage();
    yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(`Rug: ${rug.rug_number}`, margin, yPos);
    
    if (rug.analysis_report) {
      doc.setFillColor(...COLORS.success);
      doc.roundedRect(pageWidth - margin - 25, yPos - 6, 25, 8, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.white);
      doc.text('ANALYZED', pageWidth - margin - 12.5, yPos - 1, { align: 'center' });
    }
    
    yPos += 12;
    
    yPos = addInfoCard(doc, [
      ['Type', rug.rug_type],
      ['Dimensions', rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—'],
      ['Notes', rug.notes || '—'],
    ], yPos, margin, pageWidth - margin * 2);
    
    yPos += 5;
    
    if (rug.photo_urls && rug.photo_urls.length > 0) {
      const annotations = Array.isArray(rug.image_annotations) 
        ? rug.image_annotations as PhotoAnnotations[]
        : [];
      yPos = await addPhotosToPDF(doc, rug.photo_urls, yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64, annotations);
    }
    
    if (rug.analysis_report) {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = addProfessionalHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
      }
      
      yPos = addSectionHeader(doc, 'Professional Analysis', yPos, margin);
      yPos += 5;
      
      yPos = addFormattedAnalysis(doc, rug.analysis_report, yPos, margin, pageWidth, pageHeight, branding, cachedLogoBase64);
    }
    
    // Add dedicated annotation pages for this rug
    if (rug.photo_urls && rug.photo_urls.length > 0) {
      const annotations = Array.isArray(rug.image_annotations) 
        ? rug.image_annotations as PhotoAnnotations[]
        : [];
      await addAnnotationPages(
        doc, 
        rug.photo_urls, 
        annotations, 
        pageWidth, 
        pageHeight, 
        margin, 
        branding, 
        cachedLogoBase64,
        rug.rug_number
      );
    }
  }
  
  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addProfessionalFooter(doc, pageWidth, pageHeight, i, totalPages, businessName, job.job_number);
  }
  
  // Return as base64
  const pdfOutput = doc.output('datauristring');
  const base64 = pdfOutput.split(',')[1];
  return base64;
};
