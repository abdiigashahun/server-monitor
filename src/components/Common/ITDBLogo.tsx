import React from 'react';

interface ITDBLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtext?: boolean;
}

export const ITDBLogo: React.FC<ITDBLogoProps> = ({
  className = '',
  size = 'md',
  showSubtext = true,
}) => {
  const dimensions = {
    sm: { width: 32, height: 28 },
    md: { width: 44, height: 38 },
    lg: { width: 56, height: 48 },
    xl: { width: 80, height: 68 },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 200 170"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-xs transition-transform duration-200 hover:scale-105"
      >
        {/* TOP DOTTED CANOPY ARC */}
        <g fill="#00A896">
          {/* Outer arc dots */}
          <circle cx="100" cy="10" r="3" />
          <circle cx="114" cy="12" r="3.2" />
          <circle cx="86" cy="12" r="3.2" />
          <circle cx="128" cy="16" r="3.5" />
          <circle cx="72" cy="16" r="3.5" />
          <circle cx="142" cy="22" r="3.8" />
          <circle cx="58" cy="22" r="3.8" />
          <circle cx="155" cy="30" r="4" />
          <circle cx="45" cy="30" r="4" />
          <circle cx="166" cy="40" r="4.2" />
          <circle cx="34" cy="40" r="4.2" />

          {/* Middle arc dots */}
          <circle cx="100" cy="22" r="2.8" />
          <circle cx="112" cy="24" r="3" />
          <circle cx="88" cy="24" r="3" />
          <circle cx="124" cy="28" r="3.2" />
          <circle cx="76" cy="28" r="3.2" />
          <circle cx="136" cy="34" r="3.5" />
          <circle cx="64" cy="34" r="3.5" />

          {/* Inner arc dots */}
          <circle cx="100" cy="33" r="2.2" />
          <circle cx="110" cy="35" r="2.5" />
          <circle cx="90" cy="35" r="2.5" />
        </g>

        {/* MAIN TEXT: ITDB */}
        <g fill="#0F6B58" className="dark:fill-[#00D0B4]">
          {/* 'I' */}
          <path d="M 22 62 H 42 V 122 H 22 Z" />

          {/* 'T' */}
          <path d="M 48 62 H 92 V 76 H 77 V 122 H 63 V 76 H 48 Z" />

          {/* 'D' */}
          <path d="M 98 62 H 122 C 138 62 148 72 148 92 C 148 112 138 122 122 122 H 98 Z M 112 76 V 108 H 120 C 128 108 134 102 134 92 C 134 82 128 76 120 76 Z" />

          {/* 'B' / '3' */}
          <path d="M 132 62 C 150 62 166 70 166 84 C 166 92 158 97 150 99 C 160 101 170 108 170 120 C 170 134 152 142 132 142 H 128 V 128 C 144 128 155 124 155 118 C 155 111 145 107 132 107 H 128 V 95 H 132 C 143 95 152 91 152 84 C 152 78 143 75 132 75 Z" />
        </g>

        {/* BOTTOM DOUBLE ARCS & DOT */}
        <g stroke="#00A896" strokeWidth="4" fill="none" strokeLinecap="round">
          {/* Upper bottom arc */}
          <path d="M 42 130 A 62 62 0 0 0 158 130" />
          {/* Lower bottom arc */}
          <path d="M 52 144 A 54 54 0 0 0 148 144" />
        </g>
        {/* Bottom Orbit Dot */}
        <circle cx="70" cy="155" r="9" fill="#0F6B58" className="dark:fill-[#00D0B4]" />
      </svg>

      {showSubtext && (
        <div className="flex flex-col">
          <div className="font-extrabold tracking-tight text-base leading-none text-[#0F6B58] dark:text-[#00D0B4]">
            ITDB <span className="text-gray-900 dark:text-white font-bold">Server Monitor</span>
          </div>
          <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 tracking-widest uppercase mt-0.5">
            Innovation & Technology Bureau
          </span>
        </div>
      )}
    </div>
  );
};
