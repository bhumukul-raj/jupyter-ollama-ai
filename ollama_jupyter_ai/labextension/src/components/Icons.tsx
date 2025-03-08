import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { 
  faComment, 
  faPaperPlane, 
  faArrowRight,
  faTimes,
  faSync,
  faStopCircle,
  faCode,
  faFileAlt,
  faBolt,
  faSpinner,
  faCheckCircle,
  faExclamationCircle,
  faSearch,
  faTrash,
  faCopy,
  faCog
} from '@fortawesome/free-solid-svg-icons';
import { IconProps } from 'lucide-react';

// Create components that match the Lucide React interface but use Font Awesome
const createFontAwesomeIcon = (icon: IconProp) => {
  return React.forwardRef<SVGSVGElement, IconProps>((props, ref) => {
    const { size, color, stroke, ...otherProps } = props;
    return (
      <FontAwesomeIcon
        icon={icon}
        style={{ 
          width: size, 
          height: size,
          color: color
        }}
        {...otherProps as any}
        ref={ref as any}
      />
    );
  });
};

// Export components with the same names as in Lucide React
export const MessageSquare = createFontAwesomeIcon(faComment);
export const Send = createFontAwesomeIcon(faPaperPlane);
export const ArrowRight = createFontAwesomeIcon(faArrowRight);
export const X = createFontAwesomeIcon(faTimes);
export const RefreshCw = createFontAwesomeIcon(faSync);
export const StopCircle = createFontAwesomeIcon(faStopCircle);
export const Code = createFontAwesomeIcon(faCode);
export const FileText = createFontAwesomeIcon(faFileAlt);
export const Zap = createFontAwesomeIcon(faBolt);
export const Loader = createFontAwesomeIcon(faSpinner);
export const CheckCircle = createFontAwesomeIcon(faCheckCircle);
export const AlertCircle = createFontAwesomeIcon(faExclamationCircle);
export const Search = createFontAwesomeIcon(faSearch);
export const Trash = createFontAwesomeIcon(faTrash);
export const Copy = createFontAwesomeIcon(faCopy);
export const Settings = createFontAwesomeIcon(faCog); 