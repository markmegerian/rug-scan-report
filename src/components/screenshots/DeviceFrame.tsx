import React from 'react';
import { cn } from '@/lib/utils';

export type DeviceType = 'iphone-15-pro' | 'iphone-15-pro-max' | 'ipad-pro-12.9';

interface DeviceFrameProps {
  children: React.ReactNode;
  device: DeviceType;
  className?: string;
  scale?: number;
}

// Device specifications matching App Store requirements
export const DEVICE_SPECS = {
  'iphone-15-pro': {
    name: 'iPhone 15 Pro (6.1")',
    width: 1179,
    height: 2556,
    displayWidth: 393,
    displayHeight: 852,
    cornerRadius: 55,
    notchWidth: 126,
    dynamicIsland: true,
  },
  'iphone-15-pro-max': {
    name: 'iPhone 15 Pro Max (6.7")',
    width: 1290,
    height: 2796,
    displayWidth: 430,
    displayHeight: 932,
    cornerRadius: 60,
    notchWidth: 126,
    dynamicIsland: true,
  },
  'ipad-pro-12.9': {
    name: 'iPad Pro 12.9"',
    width: 2048,
    height: 2732,
    displayWidth: 1024,
    displayHeight: 1366,
    cornerRadius: 18,
    notchWidth: 0,
    dynamicIsland: false,
  },
};

const DeviceFrame: React.FC<DeviceFrameProps> = ({ 
  children, 
  device, 
  className,
  scale = 0.35,
}) => {
  const specs = DEVICE_SPECS[device];
  const isIpad = device.includes('ipad');
  
  return (
    <div 
      className={cn("relative inline-block", className)}
      style={{
        width: specs.displayWidth * scale,
        height: specs.displayHeight * scale,
      }}
    >
      {/* Device outer frame */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black shadow-2xl"
        style={{
          borderRadius: specs.cornerRadius * scale,
          padding: isIpad ? 12 * scale : 8 * scale,
        }}
      >
        {/* Screen bezel */}
        <div 
          className="relative w-full h-full bg-black overflow-hidden"
          style={{
            borderRadius: (specs.cornerRadius - 8) * scale,
          }}
        >
          {/* Dynamic Island (iPhone only) */}
          {specs.dynamicIsland && (
            <div 
              className="absolute top-2 left-1/2 -translate-x-1/2 bg-black rounded-full z-20"
              style={{
                width: specs.notchWidth * scale,
                height: 36 * scale,
              }}
            />
          )}
          
          {/* Status bar */}
          <div 
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6"
            style={{ height: 44 * scale, paddingTop: specs.dynamicIsland ? 12 * scale : 4 * scale }}
          >
            <span 
              className="text-white font-semibold"
              style={{ fontSize: 14 * scale }}
            >
              9:41
            </span>
            <div className="flex items-center gap-1">
              {/* Signal bars */}
              <div className="flex items-end gap-0.5">
                {[0.4, 0.6, 0.8, 1].map((h, i) => (
                  <div 
                    key={i}
                    className="bg-white rounded-sm"
                    style={{ 
                      width: 3 * scale, 
                      height: 12 * h * scale 
                    }}
                  />
                ))}
              </div>
              {/* WiFi */}
              <svg 
                viewBox="0 0 24 24" 
                className="text-white fill-current"
                style={{ width: 16 * scale, height: 16 * scale }}
              >
                <path d="M12 18c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0-6c2.8 0 5.3 1.1 7.2 3l-1.4 1.4C16.1 14.9 14.1 14 12 14s-4.1.9-5.8 2.4L4.8 15c1.9-1.9 4.4-3 7.2-3zm0-6c4.5 0 8.6 1.8 11.6 4.8l-1.4 1.4C19.6 9.6 16 8 12 8S4.4 9.6 1.8 12.2L.4 10.8C3.4 7.8 7.5 6 12 6z"/>
              </svg>
              {/* Battery */}
              <div 
                className="flex items-center gap-0.5"
                style={{ marginLeft: 4 * scale }}
              >
                <div 
                  className="border border-white rounded-sm flex items-center justify-end p-0.5"
                  style={{ 
                    width: 24 * scale, 
                    height: 12 * scale,
                    borderWidth: 1 * scale,
                  }}
                >
                  <div 
                    className="bg-green-500 rounded-sm"
                    style={{ 
                      width: 18 * scale, 
                      height: 8 * scale 
                    }}
                  />
                </div>
                <div 
                  className="bg-white rounded-sm"
                  style={{ 
                    width: 2 * scale, 
                    height: 5 * scale 
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Screen content */}
          <div className="absolute inset-0 overflow-hidden">
            {children}
          </div>
          
          {/* Home indicator (iPhone only) */}
          {!isIpad && (
            <div 
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/80 rounded-full"
              style={{
                width: 134 * scale,
                height: 5 * scale,
              }}
            />
          )}
        </div>
      </div>
      
      {/* Side buttons (aesthetic only) */}
      {!isIpad && (
        <>
          {/* Volume buttons */}
          <div 
            className="absolute bg-zinc-700 rounded-sm"
            style={{
              left: -3 * scale,
              top: 120 * scale,
              width: 3 * scale,
              height: 32 * scale,
            }}
          />
          <div 
            className="absolute bg-zinc-700 rounded-sm"
            style={{
              left: -3 * scale,
              top: 160 * scale,
              width: 3 * scale,
              height: 64 * scale,
            }}
          />
          <div 
            className="absolute bg-zinc-700 rounded-sm"
            style={{
              left: -3 * scale,
              top: 232 * scale,
              width: 3 * scale,
              height: 64 * scale,
            }}
          />
          {/* Power button */}
          <div 
            className="absolute bg-zinc-700 rounded-sm"
            style={{
              right: -3 * scale,
              top: 180 * scale,
              width: 3 * scale,
              height: 96 * scale,
            }}
          />
        </>
      )}
    </div>
  );
};

export default DeviceFrame;
