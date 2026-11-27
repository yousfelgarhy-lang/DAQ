import { lazy, Suspense } from 'react';
import { ToolId, ToastType } from '../types/tool';
import { getToolById } from '../data/tools';
import { ToolLayout } from './ToolLayout';
import { ImageCompressorTool } from '../tools/ImageCompressorTool';
import { ImageResizerTool } from '../tools/ImageResizerTool';
import { ImageConverterTool } from '../tools/ImageConverterTool';
import { WordCounterTool } from '../tools/WordCounterTool';
import { TextFormatterTool } from '../tools/TextFormatterTool';
import { TextComparisonTool } from '../tools/TextComparisonTool';
import { DiscountCalculatorTool } from '../tools/DiscountCalculatorTool';
import { PercentageCalculatorTool } from '../tools/PercentageCalculatorTool';
import { BillSplitterTool } from '../tools/BillSplitterTool';
import { QrGeneratorTool } from '../tools/QrGeneratorTool';
import { PasswordGeneratorTool } from '../tools/PasswordGeneratorTool';
import { UnitConverterTool } from '../tools/UnitConverterTool';
import { AgeCalculatorTool } from '../tools/AgeCalculatorTool';

const PdfMergerTool = lazy(() =>
  import('../tools/PdfMergerTool').then((m) => ({ default: m.PdfMergerTool }))
);
const PdfSplitterTool = lazy(() =>
  import('../tools/PdfSplitterTool').then((m) => ({ default: m.PdfSplitterTool }))
);
const ImageToPdfTool = lazy(() =>
  import('../tools/ImageToPdfTool').then((m) => ({ default: m.ImageToPdfTool }))
);

interface ToolPageRouterProps {
  toolId: ToolId;
  isFavorite: boolean;
  onToggleFavorite: (toolId: ToolId) => void;
  onNavigateHome: () => void;
  onOpenTool: (toolId: ToolId) => void;
  onNotify: (message: string, type?: ToastType) => void;
}

const TOOL_INSTRUCTIONS: Record<ToolId, string> = {
  'image-compressor':
    'ارفع صورة بصيغة JPG أو PNG أو WebP، ثم حرك شريط الجودة واختر صيغة الإخراج المناسبة لمعاينة الحجم الجديد وتحميل الصورة.',
  'image-resizer':
    'ارفع الصورة ثم أدخل العرض والارتفاع بالبكسل. يظل قفل نسبة الأبعاد مفعلاً افتراضياً لتجنب تشوه الصورة، ويمكنك تعطيله عند الحاجة.',
  'image-converter':
    'ارفع أي صورة مدعومة واختر الصيغة الجديدة (JPG أو PNG أو WebP) ليتم التحويل محلياً مع عرض حجم الملف الناتج.',
  'word-counter':
    'اكتب أو الصق النص في المساحة المخصصة، وستظهر الإحصائيات المباشرة للكلمات والأحرف والجمل ووقت القراءة فوراً.',
  'text-formatter':
    'أدخل النص الأصلي ثم اختر إحدى عمليات التنسيق والتنظيف بالأعلى. يمكنك تطبيق أكثر من عملية متتالية ثم نسخ النتيجة.',
  'text-comparison':
    'ضع النص الأصلي في الخانة الأولى والنص المعدّل في الخانة الثانية ثم اضغط "مقارنة النصين" لرؤية الكلمات المضافة والمحذوفة.',
  'discount-calculator':
    'أدخل السعر الأصلي بالجنيه المصري ونسبة الخصم المئوية أو اختر من النسب الجاهزة لعرض السعر النهائي وقيمة التوفير.',
  'percentage-calculator':
    'استخدم البطاقات الثلاث لحساب نسبة من رقم، أو نسبة التغير بين قيمتين، أو نسبة جزء من رقم إجمالي.',
  'bill-splitter':
    'أدخل قيمة الفاتورة وعدد الأشخاص وأضف نسبة الإكرامية الاختيارية لحساب نصيب كل فرد والإجمالي النهائي.',
  'qr-generator':
    'اكتب رابطاً أو نصاً، واختر المقاس والألوان المناسبة، ثم حمّل رمز QR بصيغة PNG بجودة واضحة.',
  'pdf-merger':
    'ارفع ملفين PDF أو أكثر، ورتّب الملفات بالأعلى أو الأسفل ثم اضغط دمج الملفات لتحميل ملف PDF واحد مجمع محلياً.',
  'pdf-splitter':
    'ارفع ملف PDF لمعرفة عدد صفحاته، ثم اكتب أرقام الصفحات أو النطاقات المطلوبة (مثال: 1, 3-5) واستخرجها فوراً.',
  'image-to-pdf':
    'ارفع صورة أو عدة صور (JPG أو PNG أو WebP)، ورتّبها كما تريد، ثم اختر مقاس الصفحة والاتجاه والهوامش لمعاينة ملف PDF الفعلي قبل تحميله.',
  'password-generator':
    'اختر طول كلمة المرور وأنواع الأحرف المطلوبة لتوليد كلمة مرور قوية عشوائياً داخل متصفحك دون حفظها في أي مكان.',
  'unit-converter':
    'اختر فئة القياس ثم أدخل القيمة وحدد الوحدتين لعرض التحويل الفوري وجميع الوحدات المكافئة، مع إمكانية التبديل والتصدير.',
  'age-calculator':
    'أدخل تاريخ الميلاد لحساب العمر الدقيق بالسنوات والشهور والأيام، وإجمالي الأيام المعاشة، والعد التنازلي لعيد الميلاد القادم.',
};

export function ToolPageRouter({
  toolId,
  isFavorite,
  onToggleFavorite,
  onNavigateHome,
  onOpenTool,
  onNotify,
}: ToolPageRouterProps) {
  const tool = getToolById(toolId);
  if (!tool) {
    return null;
  }

  const renderToolContent = () => {
    switch (toolId) {
      case 'image-compressor':
        return <ImageCompressorTool onNotify={onNotify} />;
      case 'image-resizer':
        return <ImageResizerTool onNotify={onNotify} />;
      case 'image-converter':
        return <ImageConverterTool onNotify={onNotify} />;
      case 'word-counter':
        return <WordCounterTool onNotify={onNotify} />;
      case 'text-formatter':
        return <TextFormatterTool onNotify={onNotify} />;
      case 'text-comparison':
        return <TextComparisonTool onNotify={onNotify} />;
      case 'discount-calculator':
        return <DiscountCalculatorTool onNotify={onNotify} />;
      case 'percentage-calculator':
        return <PercentageCalculatorTool onNotify={onNotify} />;
      case 'bill-splitter':
        return <BillSplitterTool onNotify={onNotify} />;
      case 'qr-generator':
        return <QrGeneratorTool onNotify={onNotify} />;
      case 'pdf-merger':
        return <PdfMergerTool onNotify={onNotify} />;
      case 'pdf-splitter':
        return <PdfSplitterTool onNotify={onNotify} />;
      case 'image-to-pdf':
        return <ImageToPdfTool onNotify={onNotify} />;
      case 'password-generator':
        return <PasswordGeneratorTool onNotify={onNotify} />;
      case 'unit-converter':
        return <UnitConverterTool onNotify={onNotify} />;
      case 'age-calculator':
        return <AgeCalculatorTool onNotify={onNotify} />;
    }
  };

  return (
    <ToolLayout
      tool={tool}
      instructions={TOOL_INSTRUCTIONS[toolId]}
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
      onNavigateHome={onNavigateHome}
      onOpenTool={onOpenTool}
    >
      <Suspense
        fallback={
          <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-8 text-center text-sm font-semibold text-[#5B7869] dark:text-[#86A896]">
            جارٍ تحميل الأداة...
          </div>
        }
      >
        {renderToolContent()}
      </Suspense>
    </ToolLayout>
  );
}
