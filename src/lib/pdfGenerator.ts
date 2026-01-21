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

// Simple page header for subsequent pages
const addSimplePageHeader = (
  doc: jsPDF,
  pageWidth: number,
  branding?: BusinessBranding | null
): number => {
  const margin = 15;
  const headerY = 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(branding?.business_name || 'RugBoost', margin, headerY);
  
  // Thin line
  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.3);
  doc.line(margin, headerY + 4, pageWidth - margin, headerY + 4);
  
  return headerY + 12;
};

// Photo labels for guided capture
const PHOTO_LABELS = [
  'Overall Front',
  'Overall Back', 
  'Detail - Fringe',
  'Detail - Edge',
  'Issue Area'
];

// Photos in 2-up layout with legends below
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
    doc.setTextColor(...COLORS.primary);
    doc.text('Inspection Photos', margin, yPos);
    yPos += 8;
  }
  
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
      yPos = addSimplePageHeader(doc, pageWidth, branding);
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
          
          // Legend below photo
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
              const labelLines = markerLineInfo[k].lines;
              
              // Number badge
              doc.setFillColor(...COLORS.danger);
              doc.circle(xPos + 5, legendY + 1, 2, 'F');
              doc.setTextColor(...COLORS.white);
              doc.setFont('helvetica', 'bold');
              doc.text((k + 1).toString(), xPos + 5, legendY + 1.7, { align: 'center' });
              
              // Label
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
// SERVICE DESCRIPTION EXTRACTION
// ========================

interface ServiceDescription {
  name: string;
  description: string;
}

/**
 * Extract service descriptions from the "COMPREHENSIVE SERVICE DESCRIPTIONS" section
 * of each rug's analysis report. The AI generates these as paragraphs with:
 * "Service Name: Description text..."
 */
const extractAllServiceDescriptions = (rugs: Inspection[]): ServiceDescription[] => {
  const serviceMap = new Map<string, ServiceDescription>();
  
  for (const rug of rugs) {
    if (!rug.analysis_report) continue;
    
    const report = rug.analysis_report;
    
    // Find the COMPREHENSIVE SERVICE DESCRIPTIONS section
    // It ends at RUG BREAKDOWN, ESTIMATED SERVICES, or similar section headers
    const servicesSectionMatch = report.match(
      /(?:COMPREHENSIVE\s+SERVICE\s+DESCRIPTIONS?|RECOMMENDED\s+SERVICES?|SERVICE\s+DESCRIPTIONS?)\s*\n+([\s\S]*?)(?=\n\s*(?:RUG\s+BREAKDOWN|ESTIMATED\s+SERVICES|RUG\s+#|TOTAL\s+ESTIMATE|ADDITIONAL\s+RECOMMENDED|NEXT\s+STEPS|Sincerely)|$)/i
    );
    
    if (servicesSectionMatch) {
      const servicesText = servicesSectionMatch[1].trim();
      
      // Parse service paragraphs - format is "Service Name: Description text"
      // Services are typically separated by double newlines
      const serviceParagraphs = servicesText.split(/\n\n+/).filter(p => p.trim());
      
      for (const para of serviceParagraphs) {
        const trimmedPara = para.trim();
        if (!trimmedPara || trimmedPara.length < 20) continue;
        
        // Pattern 1: "Service Name: Description..."
        const colonMatch = trimmedPara.match(/^([A-Z][A-Za-z\s&\/\-]+?):\s*(.+)/s);
        
        if (colonMatch) {
          const name = colonMatch[1].trim();
          const description = colonMatch[2].trim().replace(/\s+/g, ' ');
          
          // Skip if it's just a header or too short
          if (name.length > 3 && description.length > 30) {
            const key = name.toLowerCase();
            if (!serviceMap.has(key)) {
              serviceMap.set(key, { name, description });
            }
          }
        } else {
          // Pattern 2: First sentence is the title, rest is description
          // Look for a capitalized phrase at the start followed by description
          const firstSentenceMatch = trimmedPara.match(/^([A-Z][A-Za-z\s&\/\-]{3,40})[.:]?\s+(.{50,})/s);
          
          if (firstSentenceMatch) {
            const potentialName = firstSentenceMatch[1].trim();
            const potentialDesc = firstSentenceMatch[2].trim().replace(/\s+/g, ' ');
            
            // Check if it looks like a service name (not a full sentence)
            if (potentialName.split(' ').length <= 6 && !potentialName.includes('.')) {
              const key = potentialName.toLowerCase();
              if (!serviceMap.has(key)) {
                serviceMap.set(key, { 
                  name: potentialName, 
                  description: potentialDesc 
                });
              }
            }
          }
        }
      }
    }
    
    // Also try to extract from intro paragraph if it describes the rug/services
    // Look for sentences that describe specific services
    const introMatch = report.match(/^([\s\S]*?)(?=COMPREHENSIVE|RECOMMENDED\s+SERVICES|RUG\s+BREAKDOWN|ESTIMATED\s+SERVICES)/i);
    if (introMatch && introMatch[1].length > 100) {
      // Extract service mentions from intro (these often have inline descriptions)
      const introText = introMatch[1];
      
      // Pattern for inline service descriptions: "Service Name" or "service name" followed by description
      const inlineServices = [
        { pattern: /professional\s+(?:hand\s+)?clean(?:ing)?[^.]*(?:involves?|includes?|provides?|is\s+)[^.]+\./gi, name: 'Professional Cleaning' },
        { pattern: /blocking\s+(?:&|and)\s+stretching[^.]*(?:involves?|corrects?|restores?|is\s+)[^.]+\./gi, name: 'Blocking & Stretching' },
        { pattern: /overnight\s+soak(?:ing)?[^.]*(?:involves?|allows?|provides?|is\s+)[^.]+\./gi, name: 'Overnight Soaking' },
        { pattern: /custom\s+pad(?:ding)?[^.]*(?:provides?|offers?|is\s+)[^.]+\./gi, name: 'Custom Padding' },
        { pattern: /moth\s+proof(?:ing)?[^.]*(?:protects?|prevents?|is\s+)[^.]+\./gi, name: 'Moth Proofing Treatment' },
        { pattern: /fiber\s+protection[^.]*(?:protects?|repels?|is\s+)[^.]+\./gi, name: 'Fiber Protection Treatment' },
        { pattern: /stain\s+(?:removal|treatment)[^.]*(?:removes?|treats?|is\s+)[^.]+\./gi, name: 'Stain Treatment' },
        { pattern: /edge\s+(?:repair|restoration|binding)[^.]*(?:repairs?|restores?|secures?|is\s+)[^.]+\./gi, name: 'Edge Repair' },
        { pattern: /fringe\s+(?:repair|restoration|securing)[^.]*(?:repairs?|secures?|is\s+)[^.]+\./gi, name: 'Fringe Repair' },
      ];
      
      for (const { pattern, name } of inlineServices) {
        const matches = introText.match(pattern);
        if (matches && matches.length > 0) {
          const key = name.toLowerCase();
          if (!serviceMap.has(key)) {
            serviceMap.set(key, {
              name,
              description: matches[0].replace(/\s+/g, ' ').trim()
            });
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

// Extract cost breakdown from a single rug's analysis
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
      
      // Check if this is a total line
      if (lowerLine.includes('total estimate') || 
          (lowerLine.includes('total') && !lowerLine.includes('subtotal'))) {
        subtotal = cost;
        break; // Stop processing after total
      }
      
      // Extract service name (everything before the price)
      let serviceName = trimmed.replace(/[:.]?\s*\$[\d,]+(?:\.\d{2})?.*$/, '').trim();
      serviceName = serviceName.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim();
      
      if (serviceName && cost > 0) {
        items.push({ service: serviceName, cost });
      }
    }
    
    // Look for special notes
    if (trimmed.toLowerCase().startsWith('note:') || trimmed.toLowerCase().startsWith('special note:')) {
      specialNote = trimmed.replace(/^(?:special\s+)?note:\s*/i, '');
    }
  }
  
  // Calculate subtotal if not found
  if (subtotal === 0 && items.length > 0) {
    subtotal = items.reduce((sum, item) => sum + item.cost, 0);
  }
  
  const dimensions = rug.length && rug.width 
    ? `${rug.length}'${rug.length % 1 !== 0 ? '' : ''} × ${rug.width}'`
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

// ========================
// ADDITIONAL SERVICES EXTRACTION
// ========================

interface AdditionalService {
  name: string;
  estimatedCost?: string;
  description: string;
}

/**
 * Extract additional/recommended services from the "ADDITIONAL RECOMMENDED SERVICES" section
 * of each rug's analysis report. Format is typically:
 * 
 * ADDITIONAL RECOMMENDED SERVICES
 * 
 * Service Name: Description paragraph...
 * 
 * Service Name: $XXX.XX
 */
const extractAdditionalServices = (rugs: Inspection[]): AdditionalService[] => {
  const services: AdditionalService[] = [];
  const seenServices = new Set<string>();
  
  for (const rug of rugs) {
    if (!rug.analysis_report) continue;
    
    const report = rug.analysis_report;
    
    // Find the ADDITIONAL RECOMMENDED SERVICES section
    // It ends at NEXT STEPS or Sincerely
    const additionalMatch = report.match(
      /(?:ADDITIONAL\s+(?:RECOMMENDED\s+)?SERVICES?|STRONGLY\s+RECOMMENDED|OPTIONAL\s+SERVICES?)\s*\n+([\s\S]*?)(?=\n\s*(?:NEXT\s+STEPS|Sincerely|$))/i
    );
    
    if (additionalMatch) {
      const additionalText = additionalMatch[1].trim();
      
      // Parse service paragraphs - services are separated by double newlines
      // or by cost lines that stand alone
      const serviceParagraphs = additionalText.split(/\n\n+/).filter(p => p.trim());
      
      let currentService: { name: string; description: string; cost?: string } | null = null;
      
      for (const para of serviceParagraphs) {
        const trimmedPara = para.trim();
        if (!trimmedPara) continue;
        
        // Check if this is a standalone cost line
        const costOnlyMatch = trimmedPara.match(/^([A-Za-z][A-Za-z\s&\/\-\(\)]+?):\s*\$[\d,]+(?:\.\d{2})?$/);
        if (costOnlyMatch) {
          // This is a cost line for the previous service or a simple service listing
          const costMatch = trimmedPara.match(/\$[\d,]+(?:\.\d{2})?/);
          const name = costOnlyMatch[1].trim();
          
          if (!seenServices.has(name.toLowerCase()) && name.length > 3) {
            seenServices.add(name.toLowerCase());
            services.push({
              name,
              estimatedCost: costMatch ? costMatch[0] : undefined,
              description: ''
            });
          }
          continue;
        }
        
        // Pattern: "Service Name: Description..."
        const colonMatch = trimmedPara.match(/^([A-Z][A-Za-z\s&\/\-]+?):\s*(.+)/s);
        
        if (colonMatch) {
          const name = colonMatch[1].trim();
          let description = colonMatch[2].trim().replace(/\s+/g, ' ');
          
          // Extract cost if present in description
          const costMatch = description.match(/\$[\d,]+(?:\.\d{2})?/);
          
          // Remove cost from description
          description = description.replace(/\$[\d,]+(?:\.\d{2})?/, '').trim();
          
          if (!seenServices.has(name.toLowerCase()) && name.length > 3 && description.length > 20) {
            seenServices.add(name.toLowerCase());
            services.push({
              name,
              estimatedCost: costMatch ? costMatch[0] : undefined,
              description
            });
          }
        }
      }
      
      // Also look for any cost lines that follow a description paragraph
      const costLines = additionalText.match(/^[A-Za-z][A-Za-z\s&\/\-\(\)]+:\s*\$[\d,]+(?:\.\d{2})?$/gm);
      if (costLines) {
        for (const line of costLines) {
          const match = line.match(/^([A-Za-z][A-Za-z\s&\/\-\(\)]+?):\s*(\$[\d,]+(?:\.\d{2})?)$/);
          if (match) {
            const name = match[1].trim();
            const cost = match[2];
            
            // Update existing service with cost or add new one
            const existingService = services.find(s => s.name.toLowerCase() === name.toLowerCase());
            if (existingService && !existingService.estimatedCost) {
              existingService.estimatedCost = cost;
            } else if (!seenServices.has(name.toLowerCase()) && name.length > 3) {
              seenServices.add(name.toLowerCase());
              services.push({
                name,
                estimatedCost: cost,
                description: ''
              });
            }
          }
        }
      }
    }
  }
  
  return services;
};

// ========================
// PDF GENERATION - JOB REPORT (MAIN)
// ========================

export const generateJobPDF = async (
  job: Job,
  rugs: Inspection[],
  branding?: BusinessBranding | null
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  const businessName = branding?.business_name || 'RugBoost';
  
  // ============ PAGE 1: COVER PAGE ============
  
  // Business header
  let yPos = 20;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(businessName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  
  if (branding?.business_address) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(branding.business_address, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  }
  
  if (branding?.business_phone) {
    doc.setFontSize(9);
    doc.text(`Tel: ${branding.business_phone}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
  }
  
  // Thin divider
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  
  // Estimate # and Date
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(`Estimate #: ${job.job_number}`, margin, yPos);
  yPos += 8;
  
  doc.setFontSize(14);
  doc.text(`Date: ${format(new Date(job.created_at), 'MMMM d, yyyy')}`, margin, yPos);
  yPos += 14;
  
  // Prepared For section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Prepared For:', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(job.client_name, margin, yPos);
  yPos += 5;
  
  if (job.client_phone) {
    doc.text(`Phone: ${job.client_phone}`, margin, yPos);
    yPos += 5;
  }
  
  if (job.client_email) {
    doc.text(`Email: ${job.client_email}`, margin, yPos);
    yPos += 5;
  }
  
  yPos += 8;
  
  // Introduction paragraph
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const introText = `Dear ${job.client_name.split(' ')[0]},\n\nI am writing to provide you with a detailed estimate for the cleaning and preservation services recommended for your collection of Oriental rugs. Our thorough assessment has identified specialized treatments to restore the beauty, structural integrity, and longevity of your valuable pieces.`;
  
  const introLines = doc.splitTextToSize(introText, pageWidth - margin * 2);
  introLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });
  yPos += 10;
  
  // ============ COMPREHENSIVE SERVICE DESCRIPTIONS ============
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('COMPREHENSIVE SERVICE DESCRIPTIONS', margin, yPos);
  yPos += 10;
  
  // Get service descriptions from all rugs using improved extraction
  const serviceDescriptions = extractAllServiceDescriptions(rugs);
  
  // Default service descriptions as fallback
  const defaultServices: ServiceDescription[] = [
    {
      name: 'Professional Hand Cleaning',
      description: 'Our specialized hand cleaning process utilizes an immersion method specifically designed for delicate Oriental rugs, safely removing embedded soil, allergens, and contaminants that accumulate over time. We carefully assess each rug\'s unique fiber composition, dye stability, and construction to determine the most appropriate cleaning agents and techniques.'
    },
    {
      name: 'Overnight Soaking',
      description: 'This intensive deep-cleaning treatment involves submerging your rug in a specially formulated solution for an extended period under careful monitoring. The process allows cleaning agents to penetrate deep into the foundation, dissolving contaminants, allergens, and odors that standard cleaning cannot reach.'
    },
    {
      name: 'Blocking & Stretching',
      description: 'This essential restoration process corrects dimensional distortion in handwoven rugs by carefully realigning warp and weft threads to restore proper shape. Using specialized equipment, we gradually stretch the rug to its correct dimensions while damp, then secure it until completely dry.'
    },
    {
      name: 'Custom Padding',
      description: 'Our premium custom padding provides crucial support between your rug and floor surface using high-density, non-slip materials precisely cut to your rug\'s dimensions. This specialized padding extends your rug\'s lifespan by reducing fiber compression while allowing proper airflow.'
    }
  ];
  
  // Use extracted descriptions if we found any, otherwise use defaults
  const servicesToShow = serviceDescriptions.length > 0 ? serviceDescriptions : defaultServices;
  
  for (const service of servicesToShow) {
    // Check for page break
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = addSimplePageHeader(doc, pageWidth, branding);
    }
    
    // Service title (without price - prices are in the breakdown section)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(service.name, margin, yPos);
    yPos += 7;
    
    // Description
    if (service.description) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      const descLines = doc.splitTextToSize(service.description, pageWidth - margin * 2);
      descLines.forEach((line: string) => {
        if (yPos > pageHeight - 25) {
          doc.addPage();
          yPos = addSimplePageHeader(doc, pageWidth, branding);
        }
        doc.text(line, margin, yPos);
        yPos += 4.5;
      });
    }
    
    yPos += 6;
  }
  
  // ============ PAGE BREAK - RUG BREAKDOWN ============
  doc.addPage();
  yPos = addSimplePageHeader(doc, pageWidth, branding);
  
  // ============ RUG BREAKDOWN AND SERVICES ============
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('RUG BREAKDOWN AND SERVICES', margin, yPos);
  yPos += 12;
  
  let grandTotal = 0;
  
  for (const rug of rugs) {
    const costs = extractRugCosts(rug);
    if (!costs || costs.items.length === 0) continue;
    
    // Check for page break
    if (yPos > pageHeight - 70) {
      doc.addPage();
      yPos = addSimplePageHeader(doc, pageWidth, branding);
    }
    
    // Rug header
    const dimensionStr = costs.dimensions ? ` (${costs.dimensions})` : '';
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(`Rug #${costs.rugNumber}: ${costs.rugType}${dimensionStr}`, margin, yPos);
    yPos += 8;
    
    // Cost table for this rug
    const tableData = costs.items.map(item => [
      item.service,
      `$${item.cost.toFixed(2)}`
    ]);
    
    // Add subtotal row
    tableData.push(['Subtotal', `$${costs.subtotal.toFixed(2)}`]);
    
    autoTable(doc, {
      startY: yPos,
      body: tableData,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 2, bottom: 2, left: 4, right: 4 },
        textColor: COLORS.text,
      },
      columnStyles: {
        0: { cellWidth: pageWidth - margin * 2 - 40 },
        1: { cellWidth: 35, halign: 'right' },
      },
      didParseCell: (data) => {
        const text = data.row.raw?.[0] as string || '';
        if (text === 'Subtotal') {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 1) {
            data.cell.styles.textColor = COLORS.primary;
          }
        }
      },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 4;
    grandTotal += costs.subtotal;
    
    // Special note if present
    if (costs.specialNote) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.textMuted);
      const noteLines = doc.splitTextToSize(`Special Note: ${costs.specialNote}`, pageWidth - margin * 2);
      noteLines.forEach((line: string) => {
        doc.text(line, margin, yPos);
        yPos += 4;
      });
    }
    
    yPos += 10;
  }
  
  // ============ TOTAL ESTIMATE ============
  
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = addSimplePageHeader(doc, pageWidth, branding);
  }
  
  // Total estimate box
  doc.setFillColor(...COLORS.background);
  drawRoundedRect(doc, margin, yPos - 2, pageWidth - margin * 2, 16, 3);
  
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('TOTAL ESTIMATE FOR ALL SERVICES', margin + 6, yPos + 8);
  doc.text(`$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 6, yPos + 8, { align: 'right' });
  yPos += 24;
  
  // ============ ADDITIONAL RECOMMENDED SERVICES ============
  
  const additionalServices = extractAdditionalServices(rugs);
  
  if (additionalServices.length > 0 || grandTotal > 0) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = addSimplePageHeader(doc, pageWidth, branding);
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('ADDITIONAL RECOMMENDED SERVICES', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const additionalIntro = 'Based on our professional assessment of your collection, I would like to recommend additional services that would significantly enhance the protection and longevity of your Oriental rugs:';
    const introLinesAdditional = doc.splitTextToSize(additionalIntro, pageWidth - margin * 2);
    introLinesAdditional.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 6;
    
    // Default additional services if none extracted
    const defaultAdditional: AdditionalService[] = [
      {
        name: 'Moth Proofing Treatment',
        estimatedCost: `approximately $${Math.round(grandTotal * 0.1)} for your collection`,
        description: 'This specialized application creates an invisible barrier that protects against moth larvae, which can cause irreversible damage to wool and natural fiber rugs. The treatment is odorless, safe for households with children and pets, and lasts approximately 12-18 months.'
      },
      {
        name: 'Fiber Protection Treatment',
        estimatedCost: `approximately $${Math.round(grandTotal * 0.15)} for your collection`,
        description: 'This advanced treatment creates an invisible shield around each fiber, repelling liquid spills and dry soil before they can penetrate and cause staining. Liquids bead up on the surface rather than being absorbed, allowing time to blot away spills before damage occurs. This treatment typically lasts 2-3 years and makes regular maintenance significantly easier.'
      }
    ];
    
    const servicesForAdditional = additionalServices.length > 0 ? additionalServices : defaultAdditional;
    
    for (const service of servicesForAdditional) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = addSimplePageHeader(doc, pageWidth, branding);
      }
      
      // Service title with cost
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      const costStr = service.estimatedCost ? ` (${service.estimatedCost})` : '';
      doc.text(`${service.name}${costStr}`, margin, yPos);
      yPos += 7;
      
      if (service.description) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text);
        const descLines = doc.splitTextToSize(service.description, pageWidth - margin * 2);
        descLines.forEach((line: string) => {
          if (yPos > pageHeight - 25) {
            doc.addPage();
            yPos = addSimplePageHeader(doc, pageWidth, branding);
          }
          doc.text(line, margin, yPos);
          yPos += 4.5;
        });
      }
      yPos += 6;
    }
  }
  
  // ============ NEXT STEPS / CLOSING ============
  
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = addSimplePageHeader(doc, pageWidth, branding);
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('NEXT STEPS', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  
  const closingText = `These recommendations are based on a thorough professional assessment of your rugs' conditions. We understand the significant investment this collection represents and are committed to providing the highest level of care.

Would you like to proceed with all recommended services, or would you prefer to discuss a prioritized approach? We are happy to work with you to develop a preservation plan that meets your specific needs and budget.

Please contact us${branding?.business_phone ? ` at ${branding.business_phone}` : ''} to discuss these recommendations or to schedule a consultation.`;

  const closingLines = doc.splitTextToSize(closingText, pageWidth - margin * 2);
  closingLines.forEach((line: string) => {
    if (yPos > pageHeight - 25) {
      doc.addPage();
      yPos = addSimplePageHeader(doc, pageWidth, branding);
    }
    doc.text(line, margin, yPos);
    yPos += 5;
  });
  
  yPos += 10;
  
  // Signature
  doc.text('Sincerely,', margin, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, margin, yPos);
  yPos += 5;
  
  if (branding?.business_address) {
    doc.setFont('helvetica', 'normal');
    const addrLines = doc.splitTextToSize(branding.business_address, 80);
    addrLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 4;
    });
  }
  
  if (branding?.business_phone) {
    doc.text(`Tel: ${branding.business_phone}`, margin, yPos);
    yPos += 4;
  }
  
  // ============ INSPECTION PHOTOS ============
  
  const hasAnyPhotos = rugs.some(r => r.photo_urls && r.photo_urls.length > 0);
  
  if (hasAnyPhotos) {
    doc.addPage();
    yPos = addSimplePageHeader(doc, pageWidth, branding);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('INSPECTION PHOTOS', margin, yPos);
    yPos += 12;
    
    for (const rug of rugs) {
      if (!rug.photo_urls || rug.photo_urls.length === 0) continue;
      
      // Check for page break
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = addSimplePageHeader(doc, pageWidth, branding);
      }
      
      // Rug header for photos
      const sizeStr = rug.length && rug.width ? ` (${rug.length}' × ${rug.width}')` : '';
      
      doc.setFillColor(...COLORS.primary);
      const rugLabel = `Rug #${rug.rug_number}: ${rug.rug_type}${sizeStr}`;
      const labelWidth = Math.min(doc.getTextWidth(rugLabel) + 16, pageWidth - margin * 2);
      drawRoundedRect(doc, margin, yPos - 3, labelWidth, 10, 2);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.white);
      doc.text(rugLabel, margin + 6, yPos + 4);
      yPos += 14;
      
      // Photos for this rug
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
        true // skip header
      );
      
      yPos += 8;
    }
  }
  
  // Add footers to all pages
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
  
  const businessName = branding?.business_name || 'RugBoost';
  
  // ============ PAGE 1: COVER PAGE ============
  
  let yPos = 20;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(businessName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  
  if (branding?.business_address) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(branding.business_address, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  }
  
  if (branding?.business_phone) {
    doc.setFontSize(9);
    doc.text(`Tel: ${branding.business_phone}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
  }
  
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(`Estimate #: ${job.job_number}`, margin, yPos);
  yPos += 8;
  
  doc.setFontSize(14);
  doc.text(`Date: ${format(new Date(job.created_at), 'MMMM d, yyyy')}`, margin, yPos);
  yPos += 14;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Prepared For:', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(job.client_name, margin, yPos);
  yPos += 5;
  
  if (job.client_phone) {
    doc.text(`Phone: ${job.client_phone}`, margin, yPos);
    yPos += 5;
  }
  
  if (job.client_email) {
    doc.text(`Email: ${job.client_email}`, margin, yPos);
    yPos += 5;
  }
  
  yPos += 8;
  
  const introText = `Dear ${job.client_name.split(' ')[0]},\n\nI am writing to provide you with a detailed estimate for the cleaning and preservation services recommended for your collection of Oriental rugs. Our thorough assessment has identified specialized treatments to restore the beauty, structural integrity, and longevity of your valuable pieces.`;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const introLines = doc.splitTextToSize(introText, pageWidth - margin * 2);
  introLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });
  yPos += 10;
  
  // Service descriptions
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('COMPREHENSIVE SERVICE DESCRIPTIONS', margin, yPos);
  yPos += 10;
  
  const allDescriptions: { title: string; price: string; text: string }[] = [];
  
  for (const rug of rugs) {
    if (!rug.analysis_report) continue;
    const sections = rug.analysis_report.split(/\n(?=\*\*|(?:[A-Z][a-z]+\s+){1,3}(?:\([^)]+\))?:?\s*\$)/);
    
    for (const section of sections) {
      const lines = section.trim().split('\n');
      if (lines.length === 0) continue;
      
      const firstLine = lines[0].trim();
      const priceMatch = firstLine.match(/\$[\d,]+(?:\.\d{2})?(?:\s*[-–]\s*\$[\d,]+(?:\.\d{2})?)?/);
      
      if (priceMatch) {
        let title = firstLine.replace(/\*\*/g, '').replace(/\([^)]+\)/g, '').replace(/\$[\d,]+(?:\.\d{2})?(?:\s*[-–]\s*\$[\d,]+(?:\.\d{2})?)?/g, '').replace(/[:.]?\s*$/, '').trim();
        
        let description = '';
        for (let i = 1; i < lines.length; i++) {
          const descLine = lines[i].trim();
          if (descLine && !descLine.includes('$') && descLine.length > 20) {
            description = descLine.replace(/^[-•*]\s*/, '');
            break;
          }
        }
        
        if (title && !allDescriptions.find(d => d.title.toLowerCase() === title.toLowerCase())) {
          allDescriptions.push({ title, price: priceMatch[0], text: description });
        }
      }
    }
  }
  
  const defaultServices = [
    { title: 'Professional Hand Cleaning', price: '$100.00-$275.00 per rug', text: 'Our specialized hand cleaning process utilizes an immersion method specifically designed for delicate Oriental rugs.' },
    { title: 'Overnight Soaking', price: '$50.00-$100.00 per rug', text: 'This intensive deep-cleaning treatment involves submerging your rug in a specially formulated solution.' },
    { title: 'Blocking & Stretching', price: 'Complimentary with soaking', text: 'This essential restoration process corrects dimensional distortion in handwoven rugs.' },
    { title: 'Custom Padding', price: '$25.00-$100.00 per rug', text: 'Our premium custom padding provides crucial support between your rug and floor surface.' }
  ];
  
  const servicesToShow = allDescriptions.length > 0 ? allDescriptions : defaultServices;
  
  for (const service of servicesToShow) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = addSimplePageHeader(doc, pageWidth, branding);
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(`${service.title} (${service.price})`, margin, yPos);
    yPos += 7;
    
    if (service.text) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      const descLines = doc.splitTextToSize(service.text, pageWidth - margin * 2);
      descLines.forEach((line: string) => {
        if (yPos > pageHeight - 25) {
          doc.addPage();
          yPos = addSimplePageHeader(doc, pageWidth, branding);
        }
        doc.text(line, margin, yPos);
        yPos += 4.5;
      });
    }
    yPos += 6;
  }
  
  // Rug breakdown
  doc.addPage();
  yPos = addSimplePageHeader(doc, pageWidth, branding);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('RUG BREAKDOWN AND SERVICES', margin, yPos);
  yPos += 12;
  
  let grandTotal = 0;
  
  for (const rug of rugs) {
    const costs = extractRugCosts(rug);
    if (!costs || costs.items.length === 0) continue;
    
    if (yPos > pageHeight - 70) {
      doc.addPage();
      yPos = addSimplePageHeader(doc, pageWidth, branding);
    }
    
    const dimensionStr = costs.dimensions ? ` (${costs.dimensions})` : '';
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(`Rug #${costs.rugNumber}: ${costs.rugType}${dimensionStr}`, margin, yPos);
    yPos += 8;
    
    const tableData = costs.items.map(item => [item.service, `$${item.cost.toFixed(2)}`]);
    tableData.push(['Subtotal', `$${costs.subtotal.toFixed(2)}`]);
    
    autoTable(doc, {
      startY: yPos,
      body: tableData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 }, textColor: COLORS.text },
      columnStyles: { 0: { cellWidth: pageWidth - margin * 2 - 40 }, 1: { cellWidth: 35, halign: 'right' } },
      didParseCell: (data) => {
        const text = data.row.raw?.[0] as string || '';
        if (text === 'Subtotal') {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 1) data.cell.styles.textColor = COLORS.primary;
        }
      },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 4;
    grandTotal += costs.subtotal;
    
    if (costs.specialNote) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.textMuted);
      const noteLines = doc.splitTextToSize(`Special Note: ${costs.specialNote}`, pageWidth - margin * 2);
      noteLines.forEach((line: string) => { doc.text(line, margin, yPos); yPos += 4; });
    }
    yPos += 10;
  }
  
  // Total
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = addSimplePageHeader(doc, pageWidth, branding);
  }
  
  doc.setFillColor(...COLORS.background);
  drawRoundedRect(doc, margin, yPos - 2, pageWidth - margin * 2, 16, 3);
  
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('TOTAL ESTIMATE FOR ALL SERVICES', margin + 6, yPos + 8);
  doc.text(`$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 6, yPos + 8, { align: 'right' });
  yPos += 24;
  
  // Additional services
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = addSimplePageHeader(doc, pageWidth, branding);
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('ADDITIONAL RECOMMENDED SERVICES', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  const additionalIntro = 'Based on our professional assessment, we recommend additional services to enhance protection and longevity:';
  const introLinesAdditional = doc.splitTextToSize(additionalIntro, pageWidth - margin * 2);
  introLinesAdditional.forEach((line: string) => { doc.text(line, margin, yPos); yPos += 5; });
  yPos += 6;
  
  const defaultAdditional = [
    { name: 'Moth Proofing Treatment', estimatedCost: `~$${Math.round(grandTotal * 0.1)}`, description: 'Creates an invisible barrier protecting against moth larvae damage.' },
    { name: 'Fiber Protection Treatment', estimatedCost: `~$${Math.round(grandTotal * 0.15)}`, description: 'Creates an invisible shield repelling liquid spills and dry soil.' }
  ];
  
  for (const service of defaultAdditional) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = addSimplePageHeader(doc, pageWidth, branding);
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(`${service.name} (${service.estimatedCost})`, margin, yPos);
    yPos += 7;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const descLines = doc.splitTextToSize(service.description, pageWidth - margin * 2);
    descLines.forEach((line: string) => { doc.text(line, margin, yPos); yPos += 4.5; });
    yPos += 6;
  }
  
  // Closing
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = addSimplePageHeader(doc, pageWidth, branding);
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('NEXT STEPS', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  const closingText = `Would you like to proceed with all recommended services? Please contact us${branding?.business_phone ? ` at ${branding.business_phone}` : ''} to discuss.\n\nSincerely,\n${businessName}`;
  const closingLines = doc.splitTextToSize(closingText, pageWidth - margin * 2);
  closingLines.forEach((line: string) => { doc.text(line, margin, yPos); yPos += 5; });
  
  // Photos
  const hasAnyPhotos = rugs.some(r => r.photo_urls && r.photo_urls.length > 0);
  
  if (hasAnyPhotos) {
    doc.addPage();
    yPos = addSimplePageHeader(doc, pageWidth, branding);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('INSPECTION PHOTOS', margin, yPos);
    yPos += 12;
    
    for (const rug of rugs) {
      if (!rug.photo_urls || rug.photo_urls.length === 0) continue;
      
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = addSimplePageHeader(doc, pageWidth, branding);
      }
      
      const sizeStr = rug.length && rug.width ? ` (${rug.length}' × ${rug.width}')` : '';
      doc.setFillColor(...COLORS.primary);
      const rugLabel = `Rug #${rug.rug_number}: ${rug.rug_type}${sizeStr}`;
      const labelWidth = Math.min(doc.getTextWidth(rugLabel) + 16, pageWidth - margin * 2);
      drawRoundedRect(doc, margin, yPos - 3, labelWidth, 10, 2);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.white);
      doc.text(rugLabel, margin + 6, yPos + 4);
      yPos += 14;
      
      yPos = await addPhotosToPDF(doc, rug.photo_urls, yPos, margin, pageWidth, pageHeight, branding, rug.image_annotations, true, true);
      yPos += 8;
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

// ========================
// SINGLE RUG PDF (kept for individual reports)
// ========================

export const generatePDF = async (
  inspection: Inspection,
  branding?: BusinessBranding | null
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  const businessName = branding?.business_name || 'RugBoost';
  
  // Header
  let yPos = 20;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(businessName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  
  if (branding?.business_address) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(branding.business_address, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
  }
  
  if (branding?.business_phone) {
    doc.setFontSize(9);
    doc.text(`Tel: ${branding.business_phone}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
  }
  
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Rug Inspection Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text(format(new Date(inspection.created_at), 'MMMM d, yyyy'), pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;
  
  // Client & Rug info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('Client Information', margin, yPos);
  yPos += 7;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(`Name: ${inspection.client_name}`, margin, yPos);
  yPos += 5;
  if (inspection.client_email) {
    doc.text(`Email: ${inspection.client_email}`, margin, yPos);
    yPos += 5;
  }
  if (inspection.client_phone) {
    doc.text(`Phone: ${inspection.client_phone}`, margin, yPos);
    yPos += 5;
  }
  yPos += 5;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('Rug Details', margin, yPos);
  yPos += 7;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(`Rug Number: ${inspection.rug_number}`, margin, yPos);
  yPos += 5;
  doc.text(`Type: ${inspection.rug_type}`, margin, yPos);
  yPos += 5;
  if (inspection.length && inspection.width) {
    doc.text(`Dimensions: ${inspection.length}' × ${inspection.width}'`, margin, yPos);
    yPos += 5;
  }
  if (inspection.notes) {
    yPos += 3;
    doc.text(`Notes: ${inspection.notes}`, margin, yPos);
    yPos += 5;
  }
  yPos += 8;
  
  // Analysis
  if (inspection.analysis_report) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Professional Analysis', margin, yPos);
    yPos += 7;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    
    const analysisLines = doc.splitTextToSize(inspection.analysis_report, pageWidth - margin * 2);
    for (const line of analysisLines) {
      if (yPos > pageHeight - 25) {
        doc.addPage();
        yPos = addSimplePageHeader(doc, pageWidth, branding);
      }
      doc.text(line, margin, yPos);
      yPos += 4.5;
    }
    yPos += 8;
  }
  
  // Photos
  if (inspection.photo_urls && inspection.photo_urls.length > 0) {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = addSimplePageHeader(doc, pageWidth, branding);
    }
    
    yPos = await addPhotosToPDF(
      doc,
      inspection.photo_urls,
      yPos,
      margin,
      pageWidth,
      pageHeight,
      branding,
      inspection.image_annotations,
      false,
      false
    );
  }
  
  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addProfessionalFooter(doc, pageWidth, pageHeight, i, totalPages, businessName);
  }
  
  const fileName = `rug-inspection-${inspection.rug_number}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};
