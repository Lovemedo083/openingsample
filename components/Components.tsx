import React from 'react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-200 focus:ring-brand-500",
    secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 focus:ring-brand-500",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-brand-500",
    danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50 focus:ring-red-500",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, suffix, helperText, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>}
      <div className="relative group">
        <input
          className={`block w-full rounded-lg border-gray-300 shadow-sm text-gray-900 placeholder-gray-400 
            focus:border-brand-500 focus:ring-brand-500 sm:text-sm py-2.5 px-3 border transition-colors
            disabled:bg-gray-50 disabled:text-gray-500
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} 
            ${className}`}
          {...props}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm font-medium">{suffix}</span>
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">⚠️ {error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>}
    </div>
  );
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void; selected?: boolean }> = ({ 
  children, 
  className = '', 
  onClick,
  selected = false
}) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl transition-all duration-200 
        ${selected 
          ? 'border-2 border-brand-600 shadow-md ring-4 ring-brand-50' 
          : 'border border-gray-200 shadow-sm hover:shadow-md hover:border-brand-300'} 
        ${onClick ? 'cursor-pointer' : ''} 
        ${className}`}
    >
      {children}
    </div>
  );
};

// --- Badge ---
export const Badge: React.FC<{ children: React.ReactNode; color?: 'blue' | 'green' | 'red' | 'gray' | 'brand' }> = ({ children, color = 'blue' }) => {
  const colors = {
    brand: 'bg-brand-50 text-brand-700 border border-brand-100',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    green: 'bg-green-50 text-green-700 border border-green-200',
    red: 'bg-red-50 text-red-700 border border-red-200',
    gray: 'bg-gray-100 text-gray-700 border border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${colors[color]}`}>
      {children}
    </span>
  );
};