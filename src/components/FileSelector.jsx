import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config';
import '../App.css';

function FileSelector({ onFileSelect, selectedFileId, filter }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 12;

  useEffect(() => {
    loadFiles(1);
  }, [filter]);

  useEffect(() => {
    loadFiles(currentPage);
  }, [searchQuery]);

  const loadFiles = async (page = 1) => {
    try {
      setLoading(true);
      const offset = (page - 1) * itemsPerPage;
      
      // Nếu filter là 'for-gdpr' hoặc 'for-sharing', fetch từ endpoint /gdpr để lấy các file đã có kết quả phân tích
      // Fetch tất cả file (hoặc nhiều hơn) để có thể lọc và paginate ở frontend
      if (filter === 'for-gdpr' || filter === 'for-sharing') {
        // Fetch nhiều file để đảm bảo có đủ sau khi lọc (tối đa 1000)
        let apiUrl = `/gdpr?limit=1000&offset=0&has_analysis=true`;
        if (searchQuery && searchQuery.trim()) {
          apiUrl += `&search=${encodeURIComponent(searchQuery.trim())}`;
        }
        
        const response = await fetch(getApiUrl(apiUrl));
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        let allFiles = data.success ? data.data : [];
        
        // Lọc theo filter
        if (filter === 'for-gdpr') {
          // Chỉ lấy file đã có analysis, chưa có GDPR result
          allFiles = allFiles.filter(file => {
            return file.has_analysis && !file.has_gdpr_result;
          });
        } else if (filter === 'for-sharing') {
          // Chỉ lấy file có GDPR decision là 'allow' hoặc 'anonymize' (có thể chia sẻ)
          // Hoặc chưa có GDPR result nhưng đã có analysis (có thể gửi đi để kiểm tra GDPR)
          allFiles = allFiles.filter(file => {
            if (file.has_gdpr_result && file.gdpr_result) {
              const decision = file.gdpr_result.gdpr_decision?.toLowerCase();
              return decision === 'allow' || decision === 'anonymize';
            }
            // Chưa có GDPR result nhưng đã có analysis - có thể gửi đi
            return file.has_analysis && !file.has_gdpr_result;
          });
        }
        
        // Sắp xếp theo thời gian tạo (mới nhất trước)
        allFiles.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA;
        });
        
        // Tính toán pagination dựa trên số file đã lọc
        const total = allFiles.length;
        const pages = Math.ceil(total / itemsPerPage);
        
        // Chỉ lấy items cho trang hiện tại
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedFiles = allFiles.slice(startIndex, endIndex);
        
        setFiles(paginatedFiles);
        setTotalFiles(total);
        setTotalPages(pages);
        setCurrentPage(page);
        setError(null);
        setLoading(false);
        return;
      }
      
      // Các filter khác, lấy từ PostgreSQL documents table
      let apiUrl = `/api/document/get-all-completed?limit=${itemsPerPage}&offset=${offset}`;
      if (searchQuery && searchQuery.trim()) {
        // Note: API này có thể không hỗ trợ search, nhưng vẫn thêm vào
        apiUrl += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      
      const response = await fetch(getApiUrl(apiUrl));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      let allFiles = data.success ? data.data : [];
      
      // Tính toán pagination
      const total = data.pagination?.total || allFiles.length;
      const pages = Math.ceil(total / itemsPerPage);
      
      setFiles(allFiles);
      setTotalFiles(total);
      setTotalPages(pages);
      setCurrentPage(page);
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
            Trang {currentPage}/{totalPages} ({totalFiles} file)
          </span>
          <button onClick={() => loadFiles(currentPage)} className="btn-modern btn-secondary" disabled={loading} style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Tìm kiếm tên file..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              border: '1px solid var(--gray-300)',
              borderRadius: '8px',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--purple-primary)';
              e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--gray-300)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <span style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1.2rem'
          }}>🔍</span>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: 'var(--gray-500)',
                padding: '4px'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* File Grid - Giống "Tất Cả File Đã Phân Tích" */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
        gap: '20px' 
      }}>
        {files.map((file) => {
          // Helper function để lấy GDPR decision info
          const getGDPRDecisionInfo = (decision) => {
            switch (decision?.toLowerCase()) {
              case 'approve':
              case 'approved':
              case 'allow':
                return { 
                  color: '#10b981', 
                  bgColor: 'rgba(16, 185, 129, 0.1)',
                  icon: '✅',
                  label: 'PHÊ DUYỆT',
                  description: 'Tài liệu tuân thủ GDPR'
                };
              case 'delete':
              case 'reject':
                return { 
                  color: '#ef4444', 
                  bgColor: 'rgba(239, 68, 68, 0.1)',
                  icon: '🚫',
                  label: 'TỪ CHỐI',
                  description: 'Tài liệu vi phạm GDPR'
                };
              case 'review':
              case 'anonymize':
                return { 
                  color: '#f59e0b', 
                  bgColor: 'rgba(245, 158, 11, 0.1)',
                  icon: '⚠️',
                  label: 'CẦN XEM XÉT',
                  description: 'Cần kiểm tra thêm'
                };
              default:
                return { 
                  color: '#6b7280', 
                  bgColor: 'rgba(107, 114, 128, 0.1)',
                  icon: '❓',
                  label: 'KHÔNG XÁC ĐỊNH',
                  description: 'Chưa có kết quả'
                };
            }
          };

          const gdprInfo = file.gdpr_result?.gdpr_decision 
            ? getGDPRDecisionInfo(file.gdpr_result.gdpr_decision)
            : null;
          const analysisSummary = file.analysis_results?.summary || 
                                file.analysis_results?.overview || 
                                'Chưa có tóm tắt';

          return (
            <div
              key={file.processing_id || file.id}
              className="modern-card"
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: selectedFileId === (file.processing_id || file.id) 
                  ? '2px solid var(--purple-primary)' 
                  : '1px solid var(--gray-200)',
                background: selectedFileId === (file.processing_id || file.id) 
                  ? 'var(--purple-bg)' 
                  : 'var(--white)'
              }}
              onClick={() => onFileSelect && onFileSelect(file)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '2rem' }}>{getFileIcon(file.file_name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: '1rem', 
                    marginBottom: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {file.file_name || 'Unknown'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {file.department && (
                      <span className="filter-tag">{file.department}</span>
                    )}
                    {file.user_id && (
                      <>
                        <span style={{ color: 'var(--gray-400)' }}>•</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                          {file.user_id}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {selectedFileId === (file.processing_id || file.id) && (
                  <span style={{ color: 'var(--purple-primary)', fontSize: '1.5rem' }}>✓</span>
                )}
              </div>

              {/* Analysis Results */}
              {file.analysis_results && (
                <div style={{ 
                  padding: '12px', 
                  background: 'var(--gray-50)', 
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 600, 
                    color: 'var(--gray-700)',
                    marginBottom: '6px'
                  }}>
                    📊 Kết quả phân tích:
                  </div>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--gray-600)',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {typeof analysisSummary === 'string' 
                      ? analysisSummary.substring(0, 150) + (analysisSummary.length > 150 ? '...' : '')
                      : JSON.stringify(analysisSummary).substring(0, 150) + '...'}
                  </div>
                  {file.analysis_results.category && (
                    <div style={{ marginTop: '8px' }}>
                      <span className="filter-tag" style={{ fontSize: '0.75rem' }}>
                        {file.analysis_results.category}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* GDPR Results */}
              {file.has_gdpr_result && file.gdpr_result ? (
                <div style={{ 
                  padding: '12px', 
                  background: gdprInfo?.bgColor || 'var(--gray-50)', 
                  borderRadius: '8px',
                  border: `1px solid ${gdprInfo?.color || 'var(--gray-300)'}`,
                  marginBottom: '12px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>{gdprInfo?.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 600, 
                        color: gdprInfo?.color || 'var(--gray-700)'
                      }}>
                        {gdprInfo?.label || 'GDPR'}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--gray-600)'
                      }}>
                        {gdprInfo?.description}
                      </div>
                    </div>
                  </div>
                  {file.gdpr_result.personal_data_found && 
                   Array.isArray(file.gdpr_result.personal_data_found) && 
                   file.gdpr_result.personal_data_found.length > 0 && (
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--gray-600)',
                      marginTop: '6px'
                    }}>
                      <strong>Dữ liệu cá nhân:</strong> {file.gdpr_result.personal_data_found.length} loại
                    </div>
                  )}
                  {file.gdpr_result.retention_days && (
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--gray-600)',
                      marginTop: '4px'
                    }}>
                      <strong>Lưu trữ:</strong> {file.gdpr_result.retention_days} ngày
                    </div>
                  )}
                </div>
              ) : file.has_analysis && (
                <div style={{ 
                  padding: '12px', 
                  background: 'var(--info-bg)', 
                  borderRadius: '8px',
                  border: '1px solid var(--info)',
                  marginBottom: '12px',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--info)' }}>
                    ⏳ Chưa kiểm tra GDPR
                  </span>
                </div>
              )}

              {/* File Metadata */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid var(--gray-200)',
                fontSize: '0.75rem',
                color: 'var(--gray-500)'
              }}>
                <span>📅 {formatDate(file.created_at || file.analysis_completed_at)}</span>
                {file.gdpr_result?.gdpr_completed_at && (
                  <span>✅ GDPR: {formatDate(file.gdpr_result.gdpr_completed_at)}</span>
                )}
              </div>

              {/* Action Button */}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginTop: '12px'
              }}>
                <button
                  className="btn-modern btn-primary"
                  style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileSelect && onFileSelect(file);
                  }}
                >
                  {file.has_gdpr_result ? '👁️ Xem chi tiết' : (filter === 'for-gdpr' ? '🔍 Kiểm tra GDPR' : '📤 Chia sẻ')}
                </button>
                {file.cloudinary_url && (
                  <a
                    href={file.cloudinary_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-modern btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    📥
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '8px',
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid var(--gray-200)'
        }}>
          <button
            className="btn-modern btn-secondary"
            onClick={() => loadFiles(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            style={{ fontSize: '0.9rem', padding: '8px 16px' }}
          >
            ← Trước
          </button>
          
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
            {(() => {
              // Luôn hiển thị đúng 3 nút số trang
              let pagesToShow = [];
              
              if (totalPages <= 3) {
                // Nếu tổng số trang <= 3, hiển thị tất cả
                for (let i = 1; i <= totalPages; i++) {
                  pagesToShow.push(i);
                }
              } else {
                // Nếu tổng số trang > 3
                if (currentPage === 1) {
                  // Trang đầu: hiển thị 1, 2, 3
                  pagesToShow = [1, 2, 3];
                } else if (currentPage === totalPages) {
                  // Trang cuối: hiển thị 3 trang cuối
                  pagesToShow = [totalPages - 2, totalPages - 1, totalPages];
                } else {
                  // Trang giữa: hiển thị trang trước, trang hiện tại, trang sau
                  pagesToShow = [currentPage - 1, currentPage, currentPage + 1];
                }
              }
              
              return pagesToShow.map(pageNum => (
                <button
                  key={pageNum}
                  className={`btn-modern ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => loadFiles(pageNum)}
                  disabled={loading}
                  style={{ 
                    fontSize: '0.9rem', 
                    padding: '8px 12px',
                    minWidth: '40px'
                  }}
                >
                  {pageNum}
                </button>
              ));
            })()}
          </div>
          
          <button
            className="btn-modern btn-secondary"
            onClick={() => loadFiles(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            style={{ fontSize: '0.9rem', padding: '8px 16px' }}
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}

export default FileSelector;

