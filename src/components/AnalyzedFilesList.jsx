import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { getApiUrl } from '../config';
import '../App.css';

const AnalyzedFilesList = forwardRef(({ onFileSelect }, ref) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 12; // 3 items per row × 4 rows = 12 items per page

  const loadAnalyzedFiles = async (page = 1) => {
    try {
      setLoading(true);
<<<<<<< HEAD
      const response = await fetch(getApiUrl('/api/document/status'));
=======
      const offset = (page - 1) * itemsPerPage;
      // Fetch từ PostgreSQL endpoint với pagination
      const response = await fetch(`/gdpr?has_analysis=true&limit=${itemsPerPage}&offset=${offset}`);
>>>>>>> origin/temp
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        // Nếu database unavailable, trả về empty array
        if (result.error === 'Database temporarily unavailable') {
          setFiles([]);
          setError('Database tạm thời không khả dụng. Vui lòng thử lại sau.');
          setTotalPages(1);
          setTotalItems(0);
          return;
        }
        throw new Error(result.message || 'Failed to fetch files');
      }
      
      // Map dữ liệu từ PostgreSQL format sang format component đang dùng
      const analyzedFiles = (result.data || []).map(item => ({
        id: item.processing_id,
        processing_id: item.processing_id,
        fileName: item.file_name,
        fileSize: null, // Không có trong PostgreSQL response
        mimeType: null, // Không có trong PostgreSQL response
        createdAt: item.created_at || item.document_created_at,
        updatedAt: item.updated_at || item.document_updated_at,
        docx_url: item.docx_url,
        file_url: item.file_url,
        cloudinary_url: item.cloudinary_url,
        user_id: item.user_id,
        department: item.department,
        status: item.status || item.document_status,
        // Map analysis_results từ PostgreSQL
        results: {
          analysis: item.analysis_results || null
        },
        // Thêm thông tin GDPR nếu có
        gdpr_result: item.gdpr_result,
        has_gdpr_result: item.has_gdpr_result
      }));
      
      setFiles(analyzedFiles);
      
      // Cập nhật pagination info
      if (result.pagination) {
        const total = result.pagination.total || 0;
        setTotalItems(total);
        setTotalPages(Math.ceil(total / itemsPerPage));
      } else {
        // Fallback nếu không có pagination info
        setTotalItems(analyzedFiles.length);
        setTotalPages(1);
      }
      
      setError(null);
    } catch (err) {
      console.error('❌ Error loading analyzed files:', err);
      setError('Không thể tải danh sách file đã phân tích: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Expose loadAnalyzedFiles method to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: () => loadAnalyzedFiles(currentPage)
  }));

  useEffect(() => {
    loadAnalyzedFiles(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
          <div className="card-subtitle">
            Danh sách các file đã được phân tích
            {totalItems > 0 && (
              <span style={{ marginLeft: '8px', color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                ({totalItems} file)
              </span>
            )}
          </div>
        </div>
        <button onClick={() => loadAnalyzedFiles(currentPage)} className="btn-modern btn-secondary" title="Làm mới danh sách">
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
                  {/* Hiển thị main_theme nếu có */}
                  {file.results.analysis.main_theme && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '8px' }}>
                      <strong>Chủ đề:</strong> {
                        typeof file.results.analysis.main_theme === 'string' 
                          ? file.results.analysis.main_theme 
                          : file.results.analysis.main_theme?.output?.main_theme || 'N/A'
                      }
                    </p>
                  )}
                  {/* Hiển thị summary nếu có */}
                  {file.results.analysis.summary && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '8px' }}>
                      <strong>Tóm tắt:</strong> {
                        typeof file.results.analysis.summary === 'string'
                          ? file.results.analysis.summary.substring(0, 150) + (file.results.analysis.summary.length > 150 ? '...' : '')
                          : 'Có dữ liệu phân tích'
                      }
                    </p>
                  )}
                  {/* Hiển thị document_summary nếu có */}
                  {!file.results.analysis.summary && file.results.analysis.document_summary && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '8px' }}>
                      <strong>Tóm tắt:</strong> {
                        Array.isArray(file.results.analysis.document_summary)
                          ? file.results.analysis.document_summary[0]?.content?.substring(0, 150) || 'Có dữ liệu phân tích'
                          : typeof file.results.analysis.document_summary === 'string'
                            ? file.results.analysis.document_summary.substring(0, 150) + (file.results.analysis.document_summary.length > 150 ? '...' : '')
                            : 'Có dữ liệu phân tích'
                      }
                    </p>
                  )}
                  {/* Hiển thị category hoặc department */}
                  {(file.results.analysis.category || file.department) && (
                    <span className="filter-tag">{file.results.analysis.category || file.department}</span>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-modern">
              {/* First Page Button */}
              <button
                className="pagination-btn pagination-btn-nav"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                title="Trang đầu"
              >
                ⏮
              </button>
              
              {/* Previous Button */}
              <button
                className="pagination-btn pagination-btn-nav"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Trang trước"
              >
                ←
              </button>
              
              {/* Page Numbers */}
              <div className="pagination-numbers">
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                  
                  if (endPage - startPage < maxVisible - 1) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }
                  
                  // First page
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        className="pagination-btn pagination-btn-number"
                        onClick={() => handlePageChange(1)}
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="pagination-ellipsis">...</span>
                      );
                    }
                  }
                  
                  // Page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        className={`pagination-btn pagination-btn-number ${currentPage === i ? 'active' : ''}`}
                        onClick={() => handlePageChange(i)}
                      >
                        {i}
                      </button>
                    );
                  }
                  
                  // Last page
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" className="pagination-ellipsis">...</span>
                      );
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        className="pagination-btn pagination-btn-number"
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  
                  return pages;
                })()}
              </div>
              
              {/* Next Button */}
              <button
                className="pagination-btn pagination-btn-nav"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Trang sau"
              >
                →
              </button>
              
              {/* Last Page Button */}
              <button
                className="pagination-btn pagination-btn-nav"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="Trang cuối"
              >
                ⏭
              </button>
              
              {/* Info */}
              <div className="pagination-info">
                <span className="pagination-info-text">
                  {((currentPage - 1) * itemsPerPage + 1)} - {Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

AnalyzedFilesList.displayName = 'AnalyzedFilesList';

export default AnalyzedFilesList;

