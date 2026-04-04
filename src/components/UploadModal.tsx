import { useState, useRef } from "react";
import { X, UploadCloud, File, Trash2 } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartUpload: (files: File[]) => void;
}

export const UploadModal = ({ isOpen, onClose, onStartUpload }: UploadModalProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // 기존 파일 배열에 새로 선택한 파일들을 추가합니다.
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleStart = () => {
    if (selectedFiles.length > 0) {
      onStartUpload(selectedFiles); // 부모(Sidebar)로 파일 배열 전달
      setSelectedFiles([]);         // 팝업 내부 상태 초기화
      onClose();                    // 팝업 닫기
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            자료 다중 업로드
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* 본문 */}
        <div className="p-4 space-y-4">
          {/* 드롭존 & 파일 선택 버튼 */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-colors"
          >
            <UploadCloud className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">클릭하여 파일 선택 (PDF, MP4, MP3 등)</p>
            <p className="text-xs text-gray-400 mt-1">여러 파일을 한 번에 선택할 수 있습니다.</p>
            <input 
              type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden"
              accept=".pdf,.mp4,.avi,.mkv,.mp3,.wav,.m4a" 
            />
          </div>

          {/* 선택된 파일 목록 */}
          {selectedFiles.length > 0 && (
            <div className="max-h-40 overflow-y-auto custom-scrollbar border rounded-lg bg-gray-50 p-2 space-y-1">
              {selectedFiles.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex justify-between items-center bg-white p-2 border border-gray-200 rounded text-sm">
                  <div className="flex items-center gap-2 truncate">
                    <File className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500 ml-2 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">취소</button>
          <button 
            onClick={handleStart} 
            disabled={selectedFiles.length === 0}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {selectedFiles.length}개 파일 업로드 시작
          </button>
        </div>
      </div>
    </div>
  );
};