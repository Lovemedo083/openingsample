import React from 'react';
import { Quote } from '../types';
import { Button, Card, Badge } from './Components';
import { FolderOpen, ArrowRight, Layout } from 'lucide-react';

interface QuoteViewProps {
  quotes: Quote[];
  onConsultingClick: () => void;
  onLoadQuote: (quote: Quote) => void; // [추가] 배치도 불러오기 함수 타입 정의
}

export const QuoteView: React.FC<QuoteViewProps> = ({ 
    quotes, 
    onConsultingClick,
    onLoadQuote // [추가]
}) => {
  
  if (quotes.length === 0) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FolderOpen size={32} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">저장된 견적이 없습니다</h2>
        <p className="text-gray-500 text-sm mb-6">패키지를 둘러보고 나만의 견적을 만들어보세요.</p>
        <Button onClick={onConsultingClick}>패키지 보러가기</Button>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
        <div className="bg-white p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-slate-900">내 견적 보관함</h1>
            <p className="text-sm text-gray-500 mt-1">저장된 견적과 배치도를 언제든 다시 확인하세요.</p>
        </div>

        <div className="p-4 space-y-4">
            {quotes.map(quote => (
                <Card key={quote.id} className="p-5">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge color="brand">{quote.status === 'DRAFT' ? '임시견적' : '확정'}</Badge>
                                <span className="text-xs text-gray-400">{quote.date}</span>
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">{quote.packageName}</h3>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500">총 견적가</div>
                            <div className="font-bold text-lg text-brand-600">
                                {quote.totalCost.toLocaleString()}원
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                            <span>물품 합계</span>
                            <span>{quote.itemsCost.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between">
                            <span>설치/배송비</span>
                            <span>{(quote.logisticsCost + quote.installationCost).toLocaleString()}원</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {/* [추가] 배치도 수정 버튼 */}
                        {quote.layoutData && (
                            <Button 
                                variant="outline" 
                                className="flex-1" 
                                onClick={() => onLoadQuote(quote)}
                            >
                                <Layout size={16} className="mr-1.5"/> 배치도 수정
                            </Button>
                        )}
                        <Button className="flex-1">
                            상담 신청 <ArrowRight size={16} className="ml-1.5"/>
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    </div>
  );
};
