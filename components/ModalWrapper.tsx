import React from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface ModalWrapperProps {
    children: React.ReactNode;
    title: string;
    onClose: () => void;
    maxWidth?: string;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({
    children,
    title,
    onClose,
    maxWidth = 'max-w-xl'
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className={`relative bg-white w-full ${maxWidth} h-[95vh] md:h-auto md:max-h-[85vh] md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col transition-transform duration-300 transform translate-y-0 animate-slide-up`}>
                <div className="h-14 border-b flex items-center justify-between px-4 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="md:hidden"><ArrowLeft /></button>
                        <h2 className="font-bold text-lg">{title}</h2>
                    </div>
                    <button onClick={onClose} className="hidden md:block p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};
