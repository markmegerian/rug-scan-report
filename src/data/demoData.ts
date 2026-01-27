// Demo data fixtures for App Store screenshots
// Provides realistic sample data to showcase the app's features

export interface DemoJob {
  id: string;
  job_number: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  status: 'active' | 'in-progress' | 'completed';
  created_at: string;
  rug_count: number;
  notes?: string;
}

export interface DemoRug {
  id: string;
  rug_number: string;
  rug_type: string;
  width: number;
  length: number;
  photo_urls: string[];
  analysis_report: string;
  notes?: string;
}

export interface DemoEstimate {
  rugNumber: string;
  rugType: string;
  dimensions: string;
  services: {
    name: string;
    price: number;
    sqft: number;
    isRequired?: boolean;
  }[];
  total: number;
}

export interface DemoAnalytics {
  totalJobs: number;
  totalRevenue: number;
  avgJobValue: number;
  completionRate: number;
  monthlyData: {
    month: string;
    jobs: number;
    revenue: number;
  }[];
}

// Sample Jobs for Dashboard screenshot
export const demoJobs: DemoJob[] = [
  {
    id: '1',
    job_number: 'JOB-2024-0847',
    client_name: 'Katherine Morrison',
    client_email: 'katherine.m@email.com',
    client_phone: '(310) 555-0182',
    status: 'active',
    created_at: new Date().toISOString(),
    rug_count: 3,
    notes: 'Priority client - antique Persian collection',
  },
  {
    id: '2',
    job_number: 'JOB-2024-0846',
    client_name: 'The Wellington Estate',
    client_email: 'estate@wellington.com',
    client_phone: '(424) 555-0293',
    status: 'in-progress',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    rug_count: 7,
    notes: 'Full mansion rug cleaning',
  },
  {
    id: '3',
    job_number: 'JOB-2024-0845',
    client_name: 'Michael Chen',
    client_email: 'mchen@business.com',
    client_phone: '(213) 555-0447',
    status: 'completed',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    rug_count: 2,
  },
  {
    id: '4',
    job_number: 'JOB-2024-0844',
    client_name: 'Sophia Rodriguez',
    client_email: 'sophia.r@gmail.com',
    client_phone: '(323) 555-0891',
    status: 'completed',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    rug_count: 4,
  },
  {
    id: '5',
    job_number: 'JOB-2024-0843',
    client_name: 'James & Victoria Hartwell',
    client_email: 'hartwell.family@email.com',
    client_phone: '(818) 555-0234',
    status: 'in-progress',
    created_at: new Date(Date.now() - 345600000).toISOString(),
    rug_count: 5,
  },
];

// Sample Rugs for Job Detail screenshot
export const demoRugs: DemoRug[] = [
  {
    id: '1',
    rug_number: 'RUG-001',
    rug_type: 'Antique Persian Tabriz',
    width: 9,
    length: 12,
    photo_urls: [],
    analysis_report: `## Short Appraisal

This exquisite **Antique Persian Tabriz** (circa 1920s) represents exceptional craftsmanship from the renowned weaving center of Tabriz. The hand-knotted wool pile on cotton foundation displays remarkable colorfastness despite its age, with traditional indigo, madder red, and ivory tones remaining vibrant.

## Condition Assessment

**Overall Condition: Very Good**

The rug exhibits age-appropriate wear consistent with nearly a century of use. The central medallion and surrounding floral motifs remain sharply defined, indicating quality dyes and tight knotting. Minor fringe loss at one end requires professional restoration.

## Identified Issues

- Light surface soiling in high-traffic areas
- Minor fringe deterioration (3 inches)
- Two small moth nibbles in the field (reweaving recommended)
- Original selvedge intact but showing wear

## Care Recommendations

This piece requires museum-quality conservation cleaning to preserve its antique value. We strongly recommend our specialized antique rug treatment, which uses pH-balanced solutions and hand-finishing techniques appropriate for rugs of this age and provenance.`,
  },
  {
    id: '2',
    rug_number: 'RUG-002',
    rug_type: 'Hand-Knotted Moroccan Berber',
    width: 8,
    length: 10,
    photo_urls: [],
    analysis_report: `## Short Appraisal

This **Hand-Knotted Moroccan Berber** rug showcases the distinctive geometric patterns and natural wool tones characteristic of Atlas Mountain tribal weaving. The plush, high-pile construction provides excellent durability and comfort.

## Condition Assessment

**Overall Condition: Good**

The rug maintains strong structural integrity with minimal wear patterns. Natural cream, charcoal, and terra cotta colors remain true to their original palette.

## Identified Issues

- Moderate dust accumulation in pile
- Minor edge binding wear
- Light staining in one corner (appears water-related)

## Care Recommendations

Full immersion wash recommended with specialized natural fiber detergents. The high pile will benefit from professional grooming and pile lifting after cleaning.`,
  },
  {
    id: '3',
    rug_number: 'RUG-003',
    rug_type: 'Vintage Turkish Oushak',
    width: 6,
    length: 9,
    photo_urls: [],
    analysis_report: `## Short Appraisal

This **Vintage Turkish Oushak** (circa 1960s) displays the characteristic muted palette and large-scale floral design that made Oushak rugs favorites among interior designers. The soft wool pile and cotton foundation are typical of mid-century production.

## Condition Assessment

**Overall Condition: Excellent**

Remarkably well-preserved for its age, this piece shows only light surface wear and retains excellent pile height throughout.

## Identified Issues

- Surface dust and light soiling
- Minor fringe yellowing from age

## Care Recommendations

Standard professional cleaning will restore this rug to showroom condition. We recommend our signature wash and conditioning treatment.`,
  },
];

// Sample Estimate for Estimate Review screenshot
export const demoEstimates: DemoEstimate[] = [
  {
    rugNumber: 'RUG-001',
    rugType: 'Antique Persian Tabriz',
    dimensions: '9\' × 12\' (108 sq ft)',
    services: [
      { name: 'Deep Cleaning & Wash', price: 756.00, sqft: 108, isRequired: true },
      { name: 'Antique Rug Treatment', price: 324.00, sqft: 108 },
      { name: 'Fringe Repair (3")', price: 185.00, sqft: 108 },
      { name: 'Moth Damage Reweaving', price: 275.00, sqft: 108 },
      { name: 'Stain Protection', price: 216.00, sqft: 108 },
    ],
    total: 1756.00,
  },
  {
    rugNumber: 'RUG-002',
    rugType: 'Hand-Knotted Moroccan Berber',
    dimensions: '8\' × 10\' (80 sq ft)',
    services: [
      { name: 'Deep Cleaning & Wash', price: 560.00, sqft: 80, isRequired: true },
      { name: 'Edge Binding Repair', price: 120.00, sqft: 80 },
      { name: 'Stain Removal Treatment', price: 95.00, sqft: 80 },
      { name: 'Pile Restoration', price: 160.00, sqft: 80 },
    ],
    total: 935.00,
  },
  {
    rugNumber: 'RUG-003',
    rugType: 'Vintage Turkish Oushak',
    dimensions: '6\' × 9\' (54 sq ft)',
    services: [
      { name: 'Deep Cleaning & Wash', price: 378.00, sqft: 54, isRequired: true },
      { name: 'Fringe Whitening', price: 85.00, sqft: 54 },
      { name: 'Conditioning Treatment', price: 108.00, sqft: 54 },
    ],
    total: 571.00,
  },
];

// Sample Analytics data
export const demoAnalytics: DemoAnalytics = {
  totalJobs: 847,
  totalRevenue: 284750,
  avgJobValue: 336,
  completionRate: 94.2,
  monthlyData: [
    { month: 'Jan', jobs: 62, revenue: 18640 },
    { month: 'Feb', jobs: 58, revenue: 19720 },
    { month: 'Mar', jobs: 71, revenue: 24850 },
    { month: 'Apr', jobs: 68, revenue: 22440 },
    { month: 'May', jobs: 75, revenue: 26250 },
    { month: 'Jun', jobs: 82, revenue: 28700 },
    { month: 'Jul', jobs: 89, revenue: 31150 },
    { month: 'Aug', jobs: 94, revenue: 32900 },
    { month: 'Sep', jobs: 86, revenue: 30100 },
    { month: 'Oct', jobs: 78, revenue: 27300 },
    { month: 'Nov', jobs: 84, revenue: 29400 },
    { month: 'Dec', jobs: 72, revenue: 25200 },
  ],
};

// Grand total calculation helper
export const calculateGrandTotal = (estimates: DemoEstimate[]): number => {
  return estimates.reduce((sum, est) => sum + est.total, 0);
};
