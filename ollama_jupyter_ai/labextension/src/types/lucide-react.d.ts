// This is a compatibility layer to use Font Awesome icons instead of Lucide React
declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';
  
  export type IconProps = SVGProps<SVGSVGElement> & {
    size?: string | number;
    color?: string;
    stroke?: string | number;
  };
  
  export type Icon = ComponentType<IconProps>;
  
  // Map Lucide icons to Font Awesome equivalents
  // We're keeping the same export names but they'll be implemented with Font Awesome
  export const MessageSquare: Icon;     // fa-comment
  export const Send: Icon;               // fa-paper-plane
  export const ArrowRight: Icon;         // fa-arrow-right
  export const X: Icon;                  // fa-times
  export const RefreshCw: Icon;          // fa-sync
  export const StopCircle: Icon;         // fa-stop-circle
  export const Code: Icon;               // fa-code
  export const FileText: Icon;           // fa-file-alt
  export const Zap: Icon;                // fa-bolt
  export const Loader: Icon;             // fa-spinner
  export const CheckCircle: Icon;        // fa-check-circle
  export const AlertCircle: Icon;        // fa-exclamation-circle
  export const Search: Icon;             // fa-search
  export const Trash: Icon;              // fa-trash
  export const Copy: Icon;               // fa-copy
  export const Settings: Icon;           // fa-cog
} 