export type CategoryId = 'image' | 'text' | 'calculator' | 'utility';

export type ToolId =
  | 'image-compressor'
  | 'image-resizer'
  | 'image-converter'
  | 'word-counter'
  | 'text-formatter'
  | 'text-comparison'
  | 'discount-calculator'
  | 'percentage-calculator'
  | 'bill-splitter'
  | 'qr-generator'
  | 'pdf-merger'
  | 'pdf-splitter'
  | 'image-to-pdf'
  | 'password-generator'
  | 'unit-converter'
  | 'age-calculator';

export interface CategoryMeta {
  id: CategoryId;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  accentTone: 'lime' | 'purple' | 'emerald' | 'teal';
}

export interface ToolMeta {
  id: ToolId;
  category: CategoryId;
  nameAr: string;
  nameEn: string;
  shortDescAr: string;
  fullDescAr: string;
  popular?: boolean;
  keywords: string[];
}

export type ThemeMode = 'dark' | 'light';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}
