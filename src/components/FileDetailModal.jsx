import React from 'react';
import '../App.css';

function FileDetailModal({ file, onClose }) {
  if (!file) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Lấy analysis_results từ PostgreSQL format hoặc từ results.analysis
  const analysis = file.results?.analysis || file.analysis_results || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📄 Chi Tiết Tài Liệu</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {/* Thông tin file */}
          <div className="detail-section">
            <h3>📋 Thông Tin File</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <strong>Tên file:</strong>
                <span>{file.fileName || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <strong>Kích thước:</strong>
                <span>{formatFileSize(file.fileSize)}</span>
              </div>
              <div className="detail-item">
                <strong>Loại file:</strong>
                <span>{file.mimeType || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <strong>Ngày tạo:</strong>
                <span>{formatDate(file.createdAt)}</span>
              </div>
              <div className="detail-item">
                <strong>Cập nhật:</strong>
                <span>{formatDate(file.updatedAt)}</span>
              </div>
              <div className="detail-item">
                <strong>Processing ID:</strong>
                <span className="processing-id">{file.id || file.processing_id}</span>
              </div>
              {file.processing_id && (
                <div className="detail-item">
                  <strong>Processing ID (Full):</strong>
                  <span className="processing-id">{file.processing_id}</span>
                </div>
              )}
              {file.department && (
                <div className="detail-item">
                  <strong>Department:</strong>
                  <span>{file.department}</span>
                </div>
              )}
              {file.user_id && (
                <div className="detail-item">
                  <strong>User ID:</strong>
                  <span>{file.user_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Kết quả phân tích */}
          {analysis && (
            <div className="detail-section">
              <h3>🔍 Kết Quả Phân Tích</h3>
              
              {analysis.summary && (
                <div className="detail-item-full">
                  <strong>Tóm tắt:</strong>
                  <div className="detail-content">{analysis.summary}</div>
                </div>
              )}

              {analysis.contentSummary && (
                <div className="detail-item-full">
                  <strong>Tóm tắt nội dung:</strong>
                  <div className="detail-content">{analysis.contentSummary}</div>
                </div>
              )}

              {analysis.main_theme && (
                <div className="detail-item-full">
                  <strong>Chủ đề chính:</strong>
                  <div className="detail-content">{typeof analysis.main_theme === 'string' ? analysis.main_theme : analysis.main_theme?.output?.main_theme || JSON.stringify(analysis.main_theme)}</div>
                </div>
              )}

              {analysis.category && (
                <div className="detail-item-full">
                  <strong>Danh mục:</strong>
                  <span className="file-category-badge">{analysis.category}</span>
                </div>
              )}

              {analysis.keywords && analysis.keywords.length > 0 && (
                <div className="detail-item-full">
                  <strong>Từ khóa:</strong>
                  <div className="keywords-list">
                    {analysis.keywords.map((keyword, index) => (
                      <span key={index} className="keyword-tag">{keyword}</span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                <div className="detail-item-full">
                  <strong>Điểm chính:</strong>
                  <ul className="key-points-list">
                    {analysis.keyPoints.map((point, index) => (
                      <li key={index}>
                        {typeof point === 'string' ? point : point.point || JSON.stringify(point)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.key_takeaways && (
                <div className="detail-item-full">
                  <strong>Điểm chính (Key Takeaways):</strong>
                  <div className="detail-content">
                    {Array.isArray(analysis.key_takeaways) ? (
                      <ul className="key-points-list">
                        {analysis.key_takeaways.map((item, index) => (
                          <li key={index}>
                            {typeof item === 'string' ? item : (
                              <>
                                <strong>{item.point || item}:</strong> {item.context || ''}
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="detail-content detailed-content">
                        {typeof analysis.key_takeaways === 'string' 
                          ? analysis.key_takeaways.split('\n').map((line, index) => (
                              <p key={index}>{line || '\u00A0'}</p>
                            ))
                          : JSON.stringify(analysis.key_takeaways, null, 2)
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}

              {analysis.document_summary && (
                <div className="detail-item-full">
                  <strong>Tóm tắt theo phần:</strong>
                  <div className="detail-content detailed-content">
                    {Array.isArray(analysis.document_summary) ? (
                      <div>
                        {analysis.document_summary.map((section, index) => (
                          <div key={index} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
                            <strong style={{ color: '#667eea' }}>{section.section_title || `Phần ${index + 1}`}:</strong>
                            <p style={{ marginTop: '5px', marginBottom: 0 }}>{section.content || JSON.stringify(section)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="detail-content detailed-content">
                        {typeof analysis.document_summary === 'string' 
                          ? analysis.document_summary.split('\n').map((line, index) => (
                              <p key={index}>{line || '\u00A0'}</p>
                            ))
                          : JSON.stringify(analysis.document_summary, null, 2)
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}

              {analysis.content && (
                <div className="detail-item-full">
                  <strong>Nội dung chi tiết:</strong>
                  <div className="detail-content detailed-content">
                    {typeof analysis.content === 'string' 
                      ? analysis.content.split('\n').map((line, index) => (
                          <p key={index}>{line || '\u00A0'}</p>
                        ))
                      : JSON.stringify(analysis.content, null, 2)
                    }
                  </div>
                </div>
              )}

              {analysis.fullAnalysis && (
                <div className="detail-item-full">
                  <strong>Phân tích đầy đủ:</strong>
                  <div className="detail-content detailed-content">
                    {typeof analysis.fullAnalysis === 'string' 
                      ? analysis.fullAnalysis.split('\n').map((line, index) => (
                          <p key={index}>{line || '\u00A0'}</p>
                        ))
                      : JSON.stringify(analysis.fullAnalysis, null, 2)
                    }
                  </div>
                </div>
              )}

              {/* Hiển thị các trường phân tích khác từ PostgreSQL */}
              {analysis.gaps_and_limitations && (
                <div className="detail-item-full">
                  <strong>Khoảng trống và hạn chế:</strong>
                  <div className="detail-content">
                    {Array.isArray(analysis.gaps_and_limitations) ? (
                      <ul className="key-points-list">
                        {analysis.gaps_and_limitations.map((item, index) => (
                          <li key={index}>
                            {typeof item === 'string' ? item : JSON.stringify(item)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="detail-content detailed-content">
                        {typeof analysis.gaps_and_limitations === 'string' 
                          ? analysis.gaps_and_limitations.split('\n').map((line, index) => (
                              <p key={index}>{line || '\u00A0'}</p>
                            ))
                          : JSON.stringify(analysis.gaps_and_limitations, null, 2)
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}

              {analysis.follow_up_questions && (
                <div className="detail-item-full">
                  <strong>Câu hỏi tiếp theo:</strong>
                  <div className="detail-content">
                    {Array.isArray(analysis.follow_up_questions) ? (
                      <ul className="key-points-list">
                        {analysis.follow_up_questions.map((item, index) => (
                          <li key={index}>
                            {typeof item === 'string' ? item : JSON.stringify(item)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="detail-content detailed-content">
                        {typeof analysis.follow_up_questions === 'string' 
                          ? analysis.follow_up_questions.split('\n').map((line, index) => (
                              <p key={index}>{line || '\u00A0'}</p>
                            ))
                          : JSON.stringify(analysis.follow_up_questions, null, 2)
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}

              {analysis.terminology_to_clarify && (
                <div className="detail-item-full">
                  <strong>Thuật ngữ cần làm rõ:</strong>
                  <div className="detail-content">
                    {Array.isArray(analysis.terminology_to_clarify) ? (
                      <div className="keywords-list">
                        {analysis.terminology_to_clarify.map((term, index) => (
                          <span key={index} className="keyword-tag">
                            {typeof term === 'string' ? term : JSON.stringify(term)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="detail-content detailed-content">
                        {typeof analysis.terminology_to_clarify === 'string' 
                          ? analysis.terminology_to_clarify
                          : JSON.stringify(analysis.terminology_to_clarify, null, 2)
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hiển thị toàn bộ analysis object nếu có dữ liệu khác */}
              {Object.keys(analysis).length > 0 && (
                <div className="detail-item-full">
                  <strong>Dữ liệu phân tích đầy đủ (JSON):</strong>
                  <div className="detail-content detailed-content">
                    <pre style={{ 
                      margin: 0, 
                      padding: '10px', 
                      background: '#2d3748', 
                      color: '#f7fafc', 
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '0.85rem',
                      maxHeight: '400px'
                    }}>
                      {JSON.stringify(analysis, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Link tải xuống */}
          {file.docx_url && (
            <div className="detail-section">
              <h3>📥 Tải Xuống</h3>
              <a 
                href={file.docx_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn download-full-btn"
              >
                📥 Tải Xuống File DOCX Phân Tích
              </a>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

export default FileDetailModal;

