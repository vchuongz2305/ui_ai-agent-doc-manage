import React, { useState, useEffect } from 'react';
import '../App.css';

function FileSelector({ onFileSelect, selectedFileId, filter }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFiles();
  }, [filter]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      // Lấy từ PostgreSQL để có đầy đủ thông tin
      const response = await fetch('/api/document/get-all-completed?limit=100');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      let allFiles = data.success ? data.data : [];
      
      // Lọc theo filter
      if (filter === 'for-gdpr') {
        // Chỉ lấy file đã có analysis, chưa có GDPR
        allFiles = allFiles.filter(file => {
          // Kiểm tra có analysis results
          const hasAnalysis = file.analysis_results?.analysis || 
                             (file.analysis_results && 
                              typeof file.analysis_results === 'object' &&
                              Object.keys(file.analysis_results).length > 0 &&
                              !file.analysis_results.gdpr); // Đảm bảo chưa có GDPR
          // Chưa có GDPR result
          const hasGdpr = file.analysis_results?.gdpr;
          return hasAnalysis && !hasGdpr;
        });
      } else if (filter === 'for-sharing') {
        // Chỉ lấy file đã có GDPR completed (approve hoặc review), chưa có sharing
        allFiles = allFiles.filter(file => {
          const gdprResult = file.analysis_results?.gdpr;
          if (!gdprResult) return false;
          
          const decision = gdprResult.gdprDecision?.toLowerCase();
          const hasGdprCompleted = decision === 'approve' || 
                                   decision === 'approved' || 
                                   decision === 'review';
          
          // Chưa có sharing result
          const hasSharing = file.analysis_results?.sharing;
          
          return hasGdprCompleted && !hasSharing;
        });
      }
      
      // Sắp xếp theo thời gian tạo (mới nhất trước)
      allFiles.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      
      setFiles(allFiles);
      setError(null);
    } catch (err) {
      console.error('❌ Error loading files:', err);
      setError('Không thể tải danh sách file');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
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

  const getFileIcon = (fileName) => {
    if (!fileName) return '📄';
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return '📕';
      case 'doc':
      case 'docx': return '📘';
      case 'xls':
      case 'xlsx': return '📗';
      case 'ppt':
      case 'pptx': return '📙';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <div className="loading-modern">
        <div className="spinner-modern"></div>
        <div>Đang tải danh sách file...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modern-card" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--error)', marginBottom: '16px' }}>{error}</p>
        <button onClick={loadFiles} className="btn-modern btn-primary">
          🔄 Thử lại
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="modern-card" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
        <p style={{ color: 'var(--gray-500)' }}>
          {filter === 'for-gdpr' ? 'Chưa có file nào sẵn sàng kiểm tra GDPR. Hãy upload và phân tích file ở trang Phân Tích trước!' :
           filter === 'for-sharing' ? 'Chưa có file nào sẵn sàng chia sẻ. Hãy kiểm tra GDPR cho file trước!' :
           'Chưa có file nào được phân tích. Hãy upload và phân tích file ở trang Phân Tích trước!'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div className="card-title">
            {filter === 'for-gdpr' ? 'Chọn File Để Kiểm Tra GDPR' : 
             filter === 'for-sharing' ? 'Chọn File Để Chia Sẻ' : 
             'Chọn File Đã Phân Tích'}
          </div>
          <div className="card-subtitle">
            {filter === 'for-gdpr' ? 'Danh sách file đã phân tích, sẵn sàng kiểm tra GDPR' : 
             filter === 'for-sharing' ? 'Danh sách file đã kiểm tra GDPR, sẵn sàng chia sẻ' : 
             'Danh sách các file đã được phân tích'}
          </div>
        </div>
        <button onClick={loadFiles} className="btn-modern btn-secondary" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
          🔄 Làm mới
        </button>
      </div>
      <div className="file-list-modern">
        {files.map((file) => (
          <div
            key={file.processing_id || file.id}
            className={`file-item-modern ${selectedFileId === file.processing_id ? 'selected' : ''}`}
            onClick={() => onFileSelect && onFileSelect(file)}
            style={{
              borderColor: selectedFileId === file.processing_id ? 'var(--purple-primary)' : 'var(--gray-200)',
              borderWidth: selectedFileId === file.processing_id ? '2px' : '1px',
              background: selectedFileId === file.processing_id ? 'var(--purple-bg)' : 'var(--white)'
            }}
          >
            <div className="file-header-modern">
              <span className="file-icon-modern">{getFileIcon(file.file_name)}</span>
              <div style={{ flex: 1 }}>
                <div className="file-name-modern">{file.file_name || 'Unknown'}</div>
                <div className="file-meta-modern">
                  {file.department && <span className="filter-tag">{file.department}</span>}
                  <span>•</span>
                  <span>{formatDate(file.created_at)}</span>
                </div>
              </div>
              {selectedFileId === file.processing_id && (
                <span style={{ color: 'var(--purple-primary)', fontSize: '1.5rem' }}>✓</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FileSelector;

