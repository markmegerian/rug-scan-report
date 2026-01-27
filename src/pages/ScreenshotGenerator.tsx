import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Monitor, Smartphone, Tablet, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

import ScreenshotSlide from '@/components/screenshots/ScreenshotSlide';
import DeviceFrame, { DEVICE_SPECS, DeviceType } from '@/components/screenshots/DeviceFrame';
import MockDashboard from '@/components/screenshots/MockDashboard';
import MockAnalysisReport from '@/components/screenshots/MockAnalysisReport';
import MockEstimate from '@/components/screenshots/MockEstimate';
import MockAnalytics from '@/components/screenshots/MockAnalytics';
import MockClientPortal from '@/components/screenshots/MockClientPortal';
import MockPhotoCapture from '@/components/screenshots/MockPhotoCapture';

// Screenshot configurations
const screenshots = [
  {
    id: 'dashboard',
    headline: 'Manage Jobs Effortlessly',
    subheadline: 'Track every rug from intake to completion',
    backgroundColor: 'linear-gradient(135deg, #1a3d5c 0%, #2c5f7c 100%)',
    accentColor: 'hsl(210, 70%, 45%)',
    component: MockDashboard,
  },
  {
    id: 'ai-analysis',
    headline: 'AI-Powered Inspections',
    subheadline: 'Expert analysis in seconds, not hours',
    backgroundColor: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
    accentColor: 'hsl(263, 55%, 58%)',
    component: MockAnalysisReport,
  },
  {
    id: 'photo-capture',
    headline: 'Guided Photo Capture',
    subheadline: 'Never miss a critical detail',
    backgroundColor: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
    accentColor: 'hsl(172, 66%, 50%)',
    component: MockPhotoCapture,
  },
  {
    id: 'estimates',
    headline: 'Professional Estimates',
    subheadline: 'Itemized pricing your clients trust',
    backgroundColor: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
    accentColor: 'hsl(38, 92%, 50%)',
    component: MockEstimate,
  },
  {
    id: 'client-portal',
    headline: 'Seamless Client Portal',
    subheadline: 'Approvals and payments made simple',
    backgroundColor: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    accentColor: 'hsl(160, 84%, 39%)',
    component: MockClientPortal,
  },
  {
    id: 'analytics',
    headline: 'Business Insights',
    subheadline: 'Data-driven decisions at your fingertips',
    backgroundColor: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    accentColor: 'hsl(217, 91%, 60%)',
    component: MockAnalytics,
  },
];

const ScreenshotGenerator: React.FC = () => {
  const navigate = useNavigate();
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [device, setDevice] = useState<DeviceType>('iphone-15-pro');
  const [exporting, setExporting] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  const exportScreenshot = async (index: number) => {
    const slideRef = slideRefs.current[index];
    if (!slideRef) return;

    setExporting(true);
    try {
      const specs = DEVICE_SPECS[device];
      const canvas = await html2canvas(slideRef, {
        scale: 3, // High resolution
        useCORS: true,
        backgroundColor: null,
        width: specs.width / 3,
        height: specs.height / 3,
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `rugboost-screenshot-${screenshots[index].id}-${device}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success(`Screenshot exported: ${screenshots[index].headline}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export screenshot');
    } finally {
      setExporting(false);
    }
  };

  const exportAllScreenshots = async () => {
    setExportingAll(true);
    try {
      for (let i = 0; i < screenshots.length; i++) {
        await exportScreenshot(i);
        // Small delay between exports
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      toast.success('All screenshots exported!');
    } catch (error) {
      console.error('Batch export failed:', error);
      toast.error('Failed to export all screenshots');
    } finally {
      setExportingAll(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % screenshots.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  const CurrentMockComponent = screenshots[currentSlide].component;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Screenshot Generator</h1>
              <p className="text-xs text-muted-foreground">App Store Marketing Assets</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={device} onValueChange={(v) => setDevice(v as DeviceType)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iphone-15-pro">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    iPhone 15 Pro (6.1")
                  </div>
                </SelectItem>
                <SelectItem value="iphone-15-pro-max">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    iPhone 15 Pro Max (6.7")
                  </div>
                </SelectItem>
                <SelectItem value="ipad-pro-12.9">
                  <div className="flex items-center gap-2">
                    <Tablet className="h-4 w-4" />
                    iPad Pro 12.9"
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={exportAllScreenshots} 
              disabled={exportingAll}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {exportingAll ? 'Exporting...' : 'Export All'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Preview Area */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-lg">
                    Preview: {screenshots[currentSlide].headline}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={prevSlide}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentSlide + 1} / {screenshots.length}
                    </span>
                    <Button variant="outline" size="icon" onClick={nextSlide}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex justify-center pb-8">
                <div 
                  ref={(el) => (slideRefs.current[currentSlide] = el)}
                  className="rounded-xl overflow-hidden shadow-2xl"
                >
                  <ScreenshotSlide
                    headline={screenshots[currentSlide].headline}
                    subheadline={screenshots[currentSlide].subheadline}
                    backgroundColor={screenshots[currentSlide].backgroundColor}
                    accentColor={screenshots[currentSlide].accentColor}
                    device={device}
                    scale={device.includes('ipad') ? 0.25 : 0.4}
                  >
                    <CurrentMockComponent />
                  </ScreenshotSlide>
                </div>
              </CardContent>
            </Card>

            {/* Export Button for Current */}
            <div className="mt-4 flex justify-center">
              <Button 
                onClick={() => exportScreenshot(currentSlide)}
                disabled={exporting}
                className="gap-2"
                size="lg"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export This Screenshot'}
              </Button>
            </div>
          </div>

          {/* Screenshot List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">All Screenshots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {screenshots.map((screenshot, index) => (
                  <button
                    key={screenshot.id}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      currentSlide === index
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex-shrink-0"
                        style={{ background: screenshot.backgroundColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {screenshot.headline}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {screenshot.subheadline}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Device Info */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Export Specs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Device:</span>
                  <span className="font-medium">{DEVICE_SPECS[device].name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolution:</span>
                  <span className="font-medium">
                    {DEVICE_SPECS[device].width} × {DEVICE_SPECS[device].height}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">PNG</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScreenshotGenerator;
