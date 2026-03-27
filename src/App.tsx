import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, FileUp, Sparkles, AlertCircle, CheckCircle2, Copy, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { analyzeClinicalPaper } from './lib/gemini';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('PDF 파일만 업로드 가능합니다.');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('파일 크기는 10MB 이하여야 합니다.');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type !== 'application/pdf') {
        setError('PDF 파일만 업로드 가능합니다.');
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!textInput.trim() && !file) {
      setError('논문 텍스트를 입력하거나 PDF 파일을 업로드해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      let fileData;
      if (file) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        fileData = {
          data: base64,
          mimeType: file.type,
        };
      }

      const analysisResult = await analyzeClinicalPaper(
        textInput || '첨부된 논문을 분석해주세요.',
        fileData
      );
      
      if (analysisResult) {
        setResult(analysisResult);
      } else {
        setError('분석 결과를 받아오는데 실패했습니다.');
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || '';
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
        setError('AI 분석 API의 사용 한도(Quota)를 초과했습니다. 잠시 후 다시 시도하시거나, 잠시 대기 후 이용해주세요. (에러코드: 429)');
      } else {
        setError(errorMessage || '분석 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = (format: 'doc' | 'hwp') => {
    const content = document.getElementById('result-content');
    if (!content) return;

    // Clone the content to modify it for export without affecting the UI
    const clone = content.cloneNode(true) as HTMLElement;

    // Add explicit inline styles and attributes to tables for Word/HWP compatibility
    const tables = clone.querySelectorAll('table');
    tables.forEach(table => {
      table.setAttribute('border', '1');
      table.setAttribute('cellpadding', '5');
      table.setAttribute('cellspacing', '0');
      table.style.borderCollapse = 'collapse';
      table.style.width = '100%';
      table.style.border = '1px solid black';
      table.style.marginBottom = '20px';
      
      const cells = table.querySelectorAll('th, td');
      cells.forEach(cell => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.border = '1px solid black';
        htmlCell.style.padding = '8px';
        htmlCell.style.textAlign = 'left';
      });

      const headers = table.querySelectorAll('th');
      headers.forEach(th => {
        const htmlTh = th as HTMLElement;
        htmlTh.style.backgroundColor = '#f2f2f2';
        htmlTh.style.fontWeight = 'bold';
      });
    });

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Clinical Paper Analysis</title>
        <style>
          body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; line-height: 1.6; color: #000; }
          h1, h2, h3 { color: #1e293b; margin-top: 24px; margin-bottom: 12px; }
          ul, ol { margin-bottom: 16px; }
          li { margin-bottom: 4px; }
        </style>
      </head>
      <body>
        ${clone.innerHTML}
      </body>
      </html>
    `;

    // Use appropriate mime type based on format
    const mimeType = format === 'doc' ? 'application/msword' : 'application/haansofthwp';
    const blob = new Blob(['\ufeff', html], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `논문_분석_결과.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Clinical<span className="text-blue-600">Analyzer</span>
            </h1>
          </div>
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            임상시험 논문 특화 AI
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileUp className="w-5 h-5 text-blue-600" />
                논문 업로드
              </h2>
              
              {/* File Upload Area */}
              <div 
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                  file ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                )}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf"
                  onChange={handleFileChange}
                />
                
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{file.name}</p>
                      <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-sm text-red-500 hover:text-red-600 font-medium mt-2"
                    >
                      파일 삭제
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                      <Upload className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">클릭하거나 파일을 드래그하여 업로드</p>
                      <p className="text-sm text-slate-500 mt-1">PDF 파일 지원 (최대 10MB)</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">또는 텍스트 직접 입력</span>
                </div>
              </div>

              {/* Text Input Area */}
              <div>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="논문의 Abstract나 본문을 여기에 붙여넣으세요..."
                  className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-sm"
                />
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!file && !textInput.trim())}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    논문 분석하기
                  </>
                )}
              </button>
            </div>
            
            {/* Info Card */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                분석 가이드
              </h3>
              <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                <li>임상연구(Clinical Trial) 논문에 최적화되어 있습니다.</li>
                <li>PICO(환자, 중재, 비교, 결과) 구조로 자동 정리됩니다.</li>
                <li>모든 문장은 명확하고 간결한 명사형(~음, ~함)으로 끝맺습니다.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Result */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full min-h-[600px] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-500" />
                  분석 결과
                </h2>
                {result && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigator.clipboard.writeText(result)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                    >
                      <Copy className="w-4 h-4" />
                      복사
                    </button>
                    <button 
                      onClick={() => handleDownload('doc')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Word 다운로드
                    </button>
                    <button 
                      onClick={() => handleDownload('hwp')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      한글(HWP) 다운로드
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-8 flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {isAnalyzing ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4"
                    >
                      <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                      <p className="text-sm font-medium animate-pulse">AI가 논문을 꼼꼼히 읽고 분석하고 있습니다...</p>
                    </motion.div>
                  ) : result ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="prose prose-slate prose-sm sm:prose-base max-w-none
                        prose-headings:font-semibold prose-headings:text-slate-900
                        prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                        prose-p:text-slate-700 prose-p:leading-relaxed
                        prose-li:text-slate-700
                        prose-strong:text-slate-900 prose-strong:font-semibold
                        marker:text-blue-500
                        prose-hr:border-slate-200"
                    >
                      <div id="result-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {result}
                        </ReactMarkdown>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4"
                    >
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-sm">논문을 업로드하면 이곳에 분석 결과가 표시됩니다.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
