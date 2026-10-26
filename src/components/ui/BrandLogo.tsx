import React from "react";
import { Link } from "react-router-dom";

/**
 * CandidateVerifiedIcon
 * Recruitment-themed candidate silhouette with a verified checkmark badge at bottom-right.
 * Built with consistent 2px stroke, rounded caps and joins in a 24x24 viewBox.
 */
export const CandidateVerifiedIcon: React.FC<{
  className?: string;
  size?: number;
  badgeBg?: string;
}> = ({ className = "w-[22px] h-[22px]", size, badgeBg = "#1d4ed8" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Candidate Head */}
    <circle cx="8.5" cy="7" r="4" />
    {/* Candidate Shoulders / Torso */}
    <path d="M2 21v-1.5A4.5 4.5 0 0 1 6.5 15h4" />
    {/* Verified / Calibrated Candidate Badge at Bottom-Right */}
    <circle cx="17" cy="16.5" r="4.5" fill={badgeBg} stroke="currentColor" />
    <polyline points="15 16.5 16.5 18 19.5 15" stroke="currentColor" />
  </svg>
);

export interface BrandLogoProps {
  /** Size variant: sm (32px), md (40px, default), lg (48px) */
  size?: "sm" | "md" | "lg";
  /** If false, only the blue square mark is rendered */
  showText?: boolean;
  /** Custom text color or classes */
  textClassName?: string;
  /** Optional container class name */
  className?: string;
  /** Whether to wrap the logo in a link to "/" (default: true) */
  asLink?: boolean;
  /** Custom onClick handler */
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  showText = true,
  textClassName,
  className = "",
  asLink = true,
  onClick
}) => {
  // Dimension definitions
  const dimensions = {
    sm: {
      mark: "w-8 h-8 rounded-lg",
      icon: "w-[18px] h-[18px]",
      text: "text-base",
      gap: "gap-2.5"
    },
    md: {
      mark: "w-9 h-9 sm:w-10 sm:h-10 rounded-[10px]",
      icon: "w-5 h-5 sm:w-[22px] sm:h-[22px]",
      text: "text-[15px] sm:text-[20px]",
      gap: "gap-2.5 sm:gap-3"
    },
    lg: {
      mark: "w-12 h-12 rounded-xl",
      icon: "w-[26px] h-[26px]",
      text: "text-[22px]",
      gap: "gap-3.5"
    }
  }[size];

  const content = (
    <div className={`flex items-center ${dimensions.gap} shrink-0 whitespace-nowrap ${className}`}>
      {/* Blue Rounded Square with Candidate Verified Mark */}
      <div
        className={`${dimensions.mark} bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-colors`}
      >
        <CandidateVerifiedIcon className={`${dimensions.icon} text-white`} badgeBg="#1d4ed8" />
      </div>

      {/* Brand Text - Single uniform color, font-bold, -0.01em letter spacing */}
      {showText && (
        <span
          className={`font-bold ${dimensions.text} tracking-[-0.01em] whitespace-nowrap transition-colors ${
            textClassName || "text-slate-900 dark:text-white"
          }`}
        >
          AI Recruitment System
        </span>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link
        to="/"
        onClick={onClick}
        aria-label="AI Recruitment System home"
        className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded-lg transition-shadow group shrink-0"
      >
        {content}
      </Link>
    );
  }

  return content;
};
