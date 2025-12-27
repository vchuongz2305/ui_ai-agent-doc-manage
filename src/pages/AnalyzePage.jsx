import React, { useState, useRef, useEffect } from 'react';
import AnalyzedFilesList from '../components/AnalyzedFilesList';
import FileDetailModal from '../components/FileDetailModal';
import { getApiUrl } from '../config';
import '../App.css';

function AnalyzePage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const filesListRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // File upload handlers
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  // Form submission - chỉ gọi analyze
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      alert('Vui lòng chọn file');
      return;
    }

    setLoading(true);
    setIsAnalyzing(true);
    setResult(null);
    setStatus(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'analyze-user');
      formData.append('mode', 'analyze'); // Chỉ phân tích

      const response = await fetch(getApiUrl('/api/document/process'), {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProcessingId(data.processingId);
        setStatus({ status: 'processing', steps: { analysis: 'processing' } });
        // Giữ loading state và bắt đầu polling
        startStatusPolling(data.processingId);
      } else {
        alert('Lỗi: ' + data.message);
        setLoading(false);
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('❌ Network Error:', error);
      alert('Lỗi: ' + error.message);
      setLoading(false);
      setIsAnalyzing(false);
    }
  };

  // Status polling - chỉ theo dõi analysis
  const startStatusPolling = (id) => {
    let pollCount = 0;
    const maxPolls = 300; // Tối đa 10 phút (300 * 2s = 600s)
    
    // Clear interval cũ nếu có
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      
      try {
        const response = await fetch(getApiUrl(`/api/document/status/${id}`));
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const statusData = await response.json();
        setStatus(statusData);
        
        // Kiểm tra nếu analysis đã hoàn thành (có kết quả)
        const hasAnalysisResult = statusData.results?.analysis && 
                                  statusData.steps?.analysis === 'completed';
        
        // Nếu analysis hoàn thành và có kết quả, dừng polling
        if (hasAnalysisResult) {
          setResult(statusData.results.analysis);
          setLoading(false);
          setIsAnalyzing(false);
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          
          // Refresh danh sách file đã phân tích
          if (filesListRef.current) {
            filesListRef.current.refresh();
          }
          
          console.log('✅ Analysis completed, polling stopped');
          return;
        }
        
        // Nếu failed, dừng polling
        if (statusData.steps?.analysis === 'failed' || statusData.status === 'failed') {
          setLoading(false);
          setIsAnalyzing(false);
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          console.log('❌ Analysis failed, polling stopped');
          return;
        }
        
        // Timeout sau 10 phút
        if (pollCount >= maxPolls) {
          setLoading(false);
          setIsAnalyzing(false);
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          alert('⏱️ Phân tích mất quá nhiều thời gian. Vui lòng thử lại.');
          console.warn('⚠️ Polling timeout after 10 minutes');
          return;
        }
        
        // Log progress mỗi 30 giây (15 polls)
        if (pollCount % 15 === 0) {
          console.log(`🔄 Still polling... (${pollCount * 2}s elapsed)`);
        }
      } catch (error) {
        console.error('❌ Error fetching status:', error);
        // Nếu lỗi liên tục, dừng polling sau 10 lần thử
        if (pollCount >= 10) {
          setLoading(false);
          setIsAnalyzing(false);
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          alert('❌ Không thể lấy trạng thái phân tích. Vui lòng thử lại.');
        }
      }
    }, 2000);
  };
  
  // Cleanup polling khi component unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const getStatusIcon = (stepStatus) => {
    switch (stepStatus) {
      case 'completed': return '✅';
      case 'processing': return '🔄';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      default: return '⏳';
    }
  };

  return (
    <div className="modern-page">
      <div className="modern-header">
        <div>
          <h1>Phân Tích Tài Liệu</h1>
          <p>Upload và phân tích tài liệu với AI</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search by job title, company, keywords" />
          </div>
          <div className="user-profile">
            <div className="user-avatar">AD</div>
            <span>Anne Douglas</span>
            <span>▼</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div className="modern-card">
          <div className="card-header">
            <div>
              <div className="card-title">Upload Tài Liệu</div>
              <div className="card-subtitle">Chọn file để phân tích</div>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div 
              className={`upload-card ${file ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <span className="upload-icon-large">📄</span>
              <div className="upload-text-large">
                {file ? `Đã chọn: ${file.name}` : 'Click để upload hoặc kéo thả file'}
              </div>
              {file && (
                <div className="upload-hint-text">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              )}
              {!file && (
                <div className="upload-hint-text">Hỗ trợ: PDF, Word, Excel, PowerPoint, Images</div>
              )}
              <input 
                type="file" 
                id="fileInput" 
                onChange={handleFileChange}
                accept=".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                style={{ display: 'none' }}
              />
            </div>

            <button type="submit" className="btn-modern btn-primary" disabled={loading || isAnalyzing} style={{ width: '100%', marginTop: '16px' }}>
              {loading || isAnalyzing ? '🔄 Đang phân tích...' : '🚀 Phân Tích Tài Liệu'}
            </button>
          </form>

          {(loading || isAnalyzing) && (
            <div className="loading-modern">
              <div className="spinner-modern"></div>
              <div>
                {isAnalyzing 
                  ? 'Đang chờ kết quả từ workflow...' 
                  : 'Đang gửi file lên server...'}
              </div>
              {isAnalyzing && status && (
                <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#6B7280' }}>
                  Trạng thái: {status.steps?.analysis === 'processing' ? 'Đang xử lý' : 
                               status.steps?.analysis === 'pending' ? 'Đang chờ' : 
                               status.steps?.analysis || 'Đang khởi tạo...'}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modern-card">
          <div className="card-header">
            <div>
              <div className="card-title">Trạng Thái Phân Tích</div>
              <div className="card-subtitle">Theo dõi tiến trình</div>
            </div>
          </div>
          <div className="status-grid">
            {status ? (
              <div className={`status-card ${status.steps?.analysis === 'completed' ? 'completed' : status.steps?.analysis === 'processing' ? 'processing' : 'pending'}`}>
                <div className="status-label">Phân Tích Tài Liệu</div>
                <div className="status-value">{getStatusIcon(status.steps?.analysis)} {status.steps?.analysis === 'completed' ? 'Hoàn thành' : status.steps?.analysis === 'processing' ? 'Đang xử lý' : 'Chờ xử lý'}</div>
              </div>
            ) : (
              <div className="status-card">
                <div className="status-label">Trạng thái</div>
                <div className="status-value">⏳ Chờ tài liệu...</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {result && (
        <div className="modern-card" style={{ marginBottom: '32px' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Kết Quả Phân Tích</div>
              <div className="card-subtitle">Thông tin chi tiết</div>
            </div>
          </div>
          <div className="results-grid">
            <div className="result-card-modern">
              <h3>Kết Quả Phân Tích</h3>
              <div className="result-content-modern">
                {status?.fileName && <p><strong>File:</strong> {status.fileName}</p>}
                {status?.fileSize && <p><strong>Kích thước:</strong> {(status.fileSize / 1024 / 1024).toFixed(2)} MB</p>}
                {status?.mimeType && <p><strong>Loại:</strong> {status.mimeType}</p>}
                <p><strong>Phân tích hoàn tất thành công</strong></p>
                {result.summary && <p><strong>Tóm tắt:</strong> {result.summary}</p>}
                {result.category && <p><strong>Danh mục:</strong> {result.category}</p>}
              </div>
            </div>

            {status?.docx_url && (
              <div className="result-card-modern">
                <h3>Tài Liệu Phân Tích (DOCX)</h3>
                <div className="result-content-modern">
                  <p><strong>File:</strong> Tài liệu phân tích đã được tạo và lưu trên Cloudinary</p>
                  <a 
                    href={status.docx_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-modern btn-primary"
                    style={{ marginTop: '16px', display: 'inline-block' }}
                  >
                    📥 Tải Xuống DOCX
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="modern-card">
        <AnalyzedFilesList ref={filesListRef} onFileSelect={setSelectedFile} />
      </div>

      {selectedFile && (
        <FileDetailModal 
          file={selectedFile} 
          onClose={() => setSelectedFile(null)} 
        />
      )}
    </div>
  );
}

export default AnalyzePage;

