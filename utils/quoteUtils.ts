import { Package, PlacedItem, RoomDimensions, Quote } from '../types';
import { LOGISTICS_BASE_COST, INSTALLATION_BASE_COST } from '../constants';

export const calculateQuote = (
    pkg: Package,
    items: PlacedItem[],
    room: RoomDimensions
): Quote => {
    const itemsCost = pkg.totalPrice;
    const itemCount = items.length;

    // [수정] 동적 견적 로직 적용
    // 1. 물류비: 기본 + (5개 초과 시 개당 1만원)
    const logisticsCost = LOGISTICS_BASE_COST + (itemCount > 5 ? (itemCount - 5) * 10000 : 0);

    // 2. 설치비: 기본 + (물품 가액의 3%)
    const installationCost = INSTALLATION_BASE_COST + Math.floor(itemsCost * 0.03);

    const optionsCost = 0;
    const discountAmount = 0;

    const subTotal = itemsCost + logisticsCost + installationCost + optionsCost - discountAmount;
    const vat = subTotal * 0.1;
    const total = subTotal + vat;

    const today = new Date();
    const validUntil = new Date(today);
    validUntil.setDate(today.getDate() + 7);

    return {
        id: `QT-${Date.now().toString().slice(-6)}`,
        packageId: pkg.id,
        packageName: pkg.name,

        itemsCost,
        logisticsCost,
        installationCost,
        optionsCost,
        discountAmount,
        vat,
        totalCost: total,
        deposit: total * 0.1,

        date: today.toLocaleDateString(),
        validUntil: validUntil.toLocaleDateString(),
        status: 'DRAFT',
        version: 1,

        scope: [
            { category: '기본 제공', items: ['선택 패키지 가구/집기 일체', '전문 물류 배송 (1톤 트럭)', '현장 설치 및 배치', '설치 후 기본 청소'], isIncluded: true },
            { category: '고객 부담(미포함)', items: ['엘리베이터 사용료', '전기 증설 공사', '기존 집기 철거/폐기', '사다리차 비용'], isIncluded: false }
        ],
        timeline: [
            { stage: '계약 확정', duration: '즉시', description: '예약금 입금 확인', status: 'PENDING' },
            { stage: '물류 배차', duration: 'D+2', description: '차량 및 설치팀 배정', status: 'PENDING' },
            { stage: '현장 설치', duration: 'D+5', description: '반입 및 조립 설치', status: 'PENDING' },
            { stage: '검수/인수', duration: 'D+5', description: '최종 확인 및 잔금 결제', status: 'PENDING' }
        ],
        requirements: [
            '설치 공간 비워두기',
            '엘리베이터 사용 승인 (관리실)',
            '주차 공간 확보 (1대)',
            '전기 콘센트 위치 확인'
        ],

        grade: pkg.grade || 'A',
        warrantyPeriod: pkg.warranty || '14일',

        has3D: pkg.has3D,
        is3DLinkSent: false,
        consultingIncluded: false,

        layoutData: {
            room: room,
            placedItems: items
        }
    };
};
