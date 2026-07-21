import React from 'react';

export default function FloatingCard({
  title,
  subtitle,
  icon,
  className = "",
  // Accepts an RGB comma string: "R, G, B"
  pulseColorRGB = "59, 130, 246" 
}) {
  return (
    <div
      className={`
        absolute
        flex
        items-center
        gap-4
        min-w-[240px]
        rounded-[18px]
        border
        border-white/10
        bg-[rgba(20,28,50,0.88)]
        backdrop-blur-xl
        px-5
        py-4
        shadow-[0_20px_50px_rgba(0,0,0,.35)]
        transition-all
        duration-300
        hover:-translate-y-1
        ${className}
      `}
    >
      {/* Icon Wrapper */}
      <div className="relative flex h-12 w-12 items-center justify-center shrink-0">
        
        {/* Custom Keyframe Glow Ring Engine */}
        <div 
          className="icon-ping" 
          style={{ '--hover-border': `rgba(${pulseColorRGB}, 0.3)` }} 
        />

        {/* Solid Dark Container Box matching your exact UI design */}
        <div 
          className="relative z-10 flex h-full w-full items-center justify-center rounded-xl bg-[#131B2E] text-[22px]"
          style={{ border: `1px solid rgba(${pulseColorRGB}, 0.4)` }}
        >
          {icon}
        </div>
      </div>

      {/* Text Context */}
      <div className="leading-tight">
        <h4 className="text-[15px] font-bold text-white tracking-wide">
          {title}
        </h4>
        <p className="mt-0.5 text-[13px] text-[#7E8B9B] font-medium">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
