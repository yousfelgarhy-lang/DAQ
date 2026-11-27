import {
  Minimize2,
  Maximize2,
  RefreshCw,
  FileText,
  Sparkles,
  GitCompare,
  Tag,
  Percent,
  Receipt,
  QrCode,
  Layers,
  Scissors,
  KeyRound,
  ArrowLeftRight,
  Cake,
  FileImage,
  Image as ImageIcon,
  Type,
  Calculator,
  Wrench,
} from 'lucide-react';
import { CategoryId, ToolId } from '../types/tool';

export function ToolIcon({ toolId, className = 'w-5 h-5' }: { toolId: ToolId; className?: string }) {
  switch (toolId) {
    case 'image-compressor':
      return <Minimize2 className={className} />;
    case 'image-resizer':
      return <Maximize2 className={className} />;
    case 'image-converter':
      return <RefreshCw className={className} />;
    case 'word-counter':
      return <FileText className={className} />;
    case 'text-formatter':
      return <Sparkles className={className} />;
    case 'text-comparison':
      return <GitCompare className={className} />;
    case 'discount-calculator':
      return <Tag className={className} />;
    case 'percentage-calculator':
      return <Percent className={className} />;
    case 'bill-splitter':
      return <Receipt className={className} />;
    case 'qr-generator':
      return <QrCode className={className} />;
    case 'pdf-merger':
      return <Layers className={className} />;
    case 'pdf-splitter':
      return <Scissors className={className} />;
    case 'image-to-pdf':
      return <FileImage className={className} />;
    case 'password-generator':
      return <KeyRound className={className} />;
    case 'unit-converter':
      return <ArrowLeftRight className={className} />;
    case 'age-calculator':
      return <Cake className={className} />;
  }
}

export function CategoryIcon({
  categoryId,
  className = 'w-5 h-5',
}: {
  categoryId: CategoryId;
  className?: string;
}) {
  switch (categoryId) {
    case 'image':
      return <ImageIcon className={className} />;
    case 'text':
      return <Type className={className} />;
    case 'calculator':
      return <Calculator className={className} />;
    case 'utility':
      return <Wrench className={className} />;
  }
}
