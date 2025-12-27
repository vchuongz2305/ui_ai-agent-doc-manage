import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import '../App.css';

const AnalyzedFilesList = forwardRef(({ onFileSelect }, ref) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnalyzedFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/document/status');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const allStatus = await response.json();
      
      // Lọc chỉ những file đã có kết quả phân tích
      const analyzedFiles = allStatus.filter(status => 
        status.results?.analysis && 
        status.status === 'completed'
      );
      
      // Sắp xếp theo thời gian tạo (mới nhất trước)
      analyzedFiles.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      setFiles(analyzedFiles);
      setError(null);
    } catch (err) {
      console.error('❌ Error loading analyzed files:', err);
      setError('Không thể tải danh sách file đã phân tích');
    } finally {
      setLoading(false);
    }
  };

  // Expose loadAnalyzedFiles method to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: loadAnalyzedFiles
  }));

  useEffect(() => {
    loadAnalyzedFiles();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };


  return (
    <div>
      <div className="card-header">
        <div>
          <div className="card-title">Tài Liệu Đã Phân Tích</div>
          <div className="card-subtitle">Danh sách các file đã được phân tích</div>
        </div>
        <button onClick={loadAnalyzedFiles} className="btn-modern btn-secondary" title="Làm mới danh sách">
          🔄
        </button>
      </div>
      
      {loading ? (
        <div className="loading-modern">
          <div className="spinner-modern"></div>
          <div>Đang tải danh sách...</div>
        </div>
      ) : error ? (
        <div className="modern-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--error)', marginBottom: '16px' }}>{error}</p>
          <button onClick={loadAnalyzedFiles} className="btn-modern btn-primary">
            🔄 Thử lại
          </button>
        </div>
      ) : files.length === 0 ? (
        <div className="modern-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--gray-500)' }}>Chưa có tài liệu nào được phân tích. Hãy upload và phân tích tài liệu đầu tiên!</p>
        </div>
      ) : (
        <div className="file-list-modern">
          {files.map((file) => (
            <div 
              key={file.id} 
              className="file-item-modern"
              onClick={() => onFileSelect && onFileSelect(file)}
            >
              <div className="file-header-modern">
                <span className="file-icon-modern">📄</span>
                <div style={{ flex: 1 }}>
                  <div className="file-name-modern">{file.fileName || 'Unknown'}</div>
                  <div className="file-meta-modern">
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span>•</span>
                    <span>{formatDate(file.createdAt)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {file.docx_url && (
                    <a 
                      href={file.docx_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-modern btn-secondary"
                      onClick={(e) => e.stopPropagation()}
                      title="Tải xuống DOCX"
                      style={{ padding: '8px 12px' }}
                    >
                      📥
                    </a>
                  )}
                  <button 
                    className="btn-modern btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileSelect && onFileSelect(file);
                    }}
                    title="Xem chi tiết"
                    style={{ padding: '8px 12px' }}
                  >
                    👁️
                  </button>
                </div>
              </div>
              
              {file.results?.analysis && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--gray-200)' }}>
                  {file.results.analysis.summary && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '8px' }}>
                      <strong>Tóm tắt:</strong> {file.results.analysis.summary.substring(0, 150)}
                      {file.results.analysis.summary.length > 150 ? '...' : ''}
                    </p>
                  )}
                  {file.results.analysis.category && (
                    <span className="filter-tag">{file.results.analysis.category}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

AnalyzedFilesList.displayName = 'AnalyzedFilesList';

export default AnalyzedFilesList;

