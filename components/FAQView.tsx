import React, { useState } from 'react';
import { Card } from './Components';
import { ChevronDown, HelpCircle, ShieldCheck, Clock, CreditCard, Box, Smile, AlertCircle } from 'lucide-react';

const FAQ_DATA = [
  {
    id: 'price',
    category: '가격/비용',
    icon: CreditCard,
    question: '견적서 금액 외에 추가 비용이 발생하나요?',
    answer: '오프닝은 투명한 정찰제 패키지를 원칙으로 합니다. 견적서 확정 후에는 자재 변경이나 고객님의 추가 요청이 없는 한 추가 비용을 요구하지 않습니다. 단, 현장 실측 시 엘리베이터가 없거나 사다리차 불가 등 특수 상황이 발견될 경우에만 사전에 안내드립니다.'
  },
  {
    id: 'quality',
    category: '품질/자재',
    icon: ShieldCheck,
    question: '시공 품질과 자재 등급은 믿을 수 있나요?',
    answer: '오프닝은 엄격한 기준을 통과한 A등급 파트너스만 배정하며, 시공 전 과정을 전담 매니저가 모니터링합니다. 모든 가구와 자재는 E0 등급 이상의 친환경 자재와 검증된 브랜드 정품만을 사용하여 내구성과 안전을 보장합니다.'
  },
  {
    id: 'responsibility',
    category: '책임/A/S',
    icon: Smile,
    question: '하자 발생 시 누가 책임지나요?',
    answer: '시공 업체와 분쟁할 필요 없이, 오프닝이 끝까지 책임집니다. 시공 후 발생한 하자에 대해 A등급 패키지는 1년, B등급은 6개월간 무상 A/S를 보장하며, 문제 발생 시 오프닝 고객센터로 연락 주시면 즉시 해결해 드립니다.'
  },
  {
    id: 'schedule',
    category: '일정/납기',
    icon: Clock,
    question: '오픈 일정을 맞출 수 있을까요? 지연되면요?',
    answer: '계약 시 약속된 공사 기간을 철저히 준수합니다. 오프닝의 귀책사유로 인해 공사가 지연되어 오픈 일정에 차질이 생길 경우, 표준 계약서에 의거하여 지체 보상금을 지급해 드리는 "납기 책임제"를 운영하고 있습니다.'
  },
  {
    id: 'refund',
    category: '취소/환불',
    icon: AlertCircle,
    question: '중도 취소나 환불은 어떻게 되나요?',
    answer: '계약금 입금 후 현장 실측 전까지는 조건 없이 100% 환불 가능합니다. 다만, 자재 발주가 진행되었거나 주문 제작 가구가 들어간 이후에는 실비 공제 후 잔액을 환불해 드립니다. 단계별 환불 규정은 계약서에 명시됩니다.'
  },
  {
    id: '3d',
    category: '3D 결과물',
    icon: Box,
    question: '3D 배치도와 실제 시공이 다르면 어떡하죠?',
    answer: '오프닝의 3D 시뮬레이션은 실제 납품될 가구와 기기의 정확한 규격(mm 단위)을 기반으로 제작됩니다. 따라서 3D 화면에서 보신 공간감과 동선이 실제 현장과 99% 일치하며, 카카오톡 AR 기능을 통해 현장에서 미리 띄워보실 수도 있습니다.'
  }
];

export const FAQView: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
            <HelpCircle className="text-brand-600" size={24} />
            <h1 className="text-2xl font-bold text-slate-900">자주 묻는 질문</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">사장님들이 가장 궁금해하시는 점들을 모았습니다.</p>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-3">
        {FAQ_DATA.map((item, idx) => (
          <Card 
            key={item.id} 
            className={`overflow-hidden cursor-pointer transition-all duration-200 ${openIndex === idx ? 'ring-2 ring-brand-100 shadow-md' : 'hover:shadow-md'}`}
            onClick={() => toggleFAQ(idx)}
          >
            <div className="p-5 flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        <item.icon size={10} />
                        {item.category}
                    </span>
                </div>
                <h3 className={`font-bold text-base leading-snug ${openIndex === idx ? 'text-brand-700' : 'text-slate-800'}`}>
                    Q. {item.question}
                </h3>
              </div>
              <div className={`text-gray-400 transition-transform duration-200 mt-1 ${openIndex === idx ? 'rotate-180 text-brand-600' : ''}`}>
                <ChevronDown />
              </div>
            </div>
            
            {openIndex === idx && (
              <div className="px-5 pb-5 pt-0 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="pt-4 border-t border-gray-100 text-sm text-gray-700 leading-relaxed bg-brand-50/30 p-4 rounded-lg">
                    <span className="font-bold text-brand-600 mr-1">A.</span> {item.answer}
                </div>
              </div>
            )}
          </Card>
        ))}

        <div className="mt-8 mb-4 text-center">
            <p className="text-gray-400 text-sm mb-3">더 궁금한 점이 있으신가요?</p>
            <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg">
                1:1 채팅 상담하기
            </button>
        </div>
      </div>
    </div>
  );
};
