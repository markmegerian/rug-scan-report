import React from 'react';
import { cn } from '@/lib/utils';
import DeviceFrame, { DeviceType } from './DeviceFrame';

export interface ScreenshotSlideProps {
  headline: string;
  subheadline?: string;
  backgroundColor: string;
  accentColor?: string;
  device: DeviceType;
  children: React.ReactNode;
  className?: string;
  scale?: number;
}

const ScreenshotSlide: React.FC<ScreenshotSlideProps> = ({
  headline,
  subheadline,
  backgroundColor,
  accentColor = 'hsl(210, 70%, 45%)',
  device,
  children,
  className,
  scale = 0.35,
}) => {
  return (
    <div 
      className={cn(
        "relative flex flex-col items-center justify-center p-8 overflow-hidden",
        className
      )}
      style={{ 
        background: backgroundColor,
        minHeight: 600,
      }}
    >
      {/* Decorative elements */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: accentColor }}
      />
      <div 
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-15 blur-2xl"
        style={{ background: accentColor }}
      />
      
      {/* Headlines */}
      <div className="relative z-10 text-center mb-6 max-w-md">
        <h2 
          className="text-3xl font-bold mb-2 font-display"
          style={{ color: 'white' }}
        >
          {headline}
        </h2>
        {subheadline && (
          <p 
            className="text-lg opacity-90"
            style={{ color: 'white' }}
          >
            {subheadline}
          </p>
        )}
      </div>
      
      {/* Device with content */}
      <div className="relative z-10">
        <DeviceFrame device={device} scale={scale}>
          {children}
        </DeviceFrame>
      </div>
    </div>
  );
};

export default ScreenshotSlide;
