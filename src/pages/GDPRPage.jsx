import React, { useState, useRef, useEffect } from 'react';
import FileSelector from '../components/FileSelector';
import '../App.css';

function GDPRPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

  // Processing steps animation
  const processingSteps = [
    { icon: '📤', text: 'Tải lên tài liệu...' },
    { icon: '🔍', text: 'Quét nội dung...' },
    { icon: '🧠', text: 'Phân tích AI...' },
    { icon: '⚖️', text: 'Đánh giá GDPR...' },
    { icon: '✨', text: 'Hoàn tất!' }
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setProcessingStep(prev => (prev + 1) % 4);
      }, 800);
    } else {
      setProcessingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Show confetti on approve
  useEffect(() => {
    if (result?.gdprDecision?.toLowerCase() === 'approve') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [result]);

  const resetForm = () => {
    setSelectedFile(null);
    setResult(null);
    setStatus(null);
    setLoading(false);
    setShowConfetti(false);
    setProcessingStep(0);
  };


  // Handle file selection
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setResult(null);
    setStatus(null);
  };

  // Form submission - Trigger GDPR check workflow
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Vui lòng chọn file đã phân tích');
      return;
    }

    setLoading(true);
    setResult(null);
    setStatus({ status: 'processing', steps: { gdpr: 'processing' }, fileName: selectedFile.file_name });
    
    try {
      // Gọi API để trigger GDPR workflow với processingId đã có
      const response = await fetch('/api/document/trigger-gdpr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          processingId: selectedFile.processing_id
        })
      });

      if (!response.ok) {
        // Nếu API chưa có, thử cách khác - gọi trực tiếp workflow
        console.log('API trigger-gdpr chưa có, thử cách khác...');
        
        // Lấy status hiện tại và trigger GDPR workflow
        const statusResponse = await fetch(`/api/document/status/${selectedFile.processing_id}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setProcessingId(selectedFile.processing_id);
          startStatusPolling(selectedFile.processing_id);
        } else {
          throw new Error('Không thể lấy trạng thái file');
        }
      } else {
        const data = await response.json();
        if (data.success) {
          setProcessingId(selectedFile.processing_id);
          
          // Nếu có kết quả ngay, hiển thị luôn
          if (data.gdprResult) {
            setResult(data.gdprResult);
            setStatus({ 
              status: 'completed', 
              steps: { gdpr: 'completed' }, 
              fileName: selectedFile.file_name 
            });
            setLoading(false);
          } else {
            // Nếu chưa có kết quả, polling để chờ
            startStatusPolling(selectedFile.processing_id);
          }
        } else {
          throw new Error(data.message || 'Không thể trigger GDPR workflow');
        }
      }
    } catch (error) {
      console.error('❌ Network Error:', error);
      alert('Lỗi: ' + error.message + '\n\nVui lòng thử lại hoặc kiểm tra workflow đã được kích hoạt chưa.');
      setLoading(false);
      setStatus(null);
    }
  };

  // Status polling - chỉ theo dõi GDPR
  const startStatusPolling = (id) => {
    let pollCount = 0;
    const maxPolls = 60; // Tối đa 2 phút (60 * 2s)
    
    const interval = setInterval(async () => {
      try {
        pollCount++;
        
        // Thử lấy từ PostgreSQL trước (có thể có kết quả mới nhất)
        const pgResponse = await fetch(`/api/document/get-from-postgres/${id}`);
        if (pgResponse.ok) {
          const pgData = await pgResponse.json();
          if (pgData.success && pgData.data?.analysis_results?.gdpr) {
            setResult(pgData.data.analysis_results.gdpr);
            setStatus({ 
              status: 'completed', 
              steps: { gdpr: 'completed' }, 
              fileName: pgData.data.file_name 
            });
            setLoading(false);
            clearInterval(interval);
            return;
          }
        }
        
        // Nếu không có trong PostgreSQL, thử lấy từ status API
        const response = await fetch(`/api/document/status/${id}`);
        
        if (!response.ok) {
          if (pollCount >= maxPolls) {
            clearInterval(interval);
            setLoading(false);
            alert('Timeout: Không thể lấy kết quả GDPR. Vui lòng thử lại sau.');
          }
          return;
        }
        
        const statusData = await response.json();
        setStatus(statusData);
        
        // Nếu GDPR check hoàn thành, hiển thị kết quả
        if (statusData.results?.gdpr) {
          setResult(statusData.results.gdpr);
          setLoading(false);
          clearInterval(interval);
          return;
        }
        
        // Timeout sau maxPolls lần
        if (pollCount >= maxPolls) {
          clearInterval(interval);
          setLoading(false);
          alert('Timeout: Quá trình kiểm tra GDPR mất quá nhiều thời gian. Vui lòng kiểm tra lại sau.');
        }
        
        if (statusData.status === 'completed' || statusData.status === 'failed') {
          setLoading(false);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('❌ Error fetching status:', error);
        if (pollCount >= maxPolls) {
          clearInterval(interval);
          setLoading(false);
        }
      }
    }, 2000);
  };

  const getGDPRDecisionInfo = (decision) => {
    switch (decision?.toLowerCase()) {
      case 'approve':
      case 'approved':
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


  const decisionInfo = result ? getGDPRDecisionInfo(result.gdprDecision) : null;

  // Confetti component
  const Confetti = () => (
    <div className="gdpr-confetti-container">
      {[...Array(50)].map((_, i) => (
        <div 
          key={i} 
          className="gdpr-confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 5)]
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="modern-page">
      {/* Confetti Effect */}
      {showConfetti && <Confetti />}

      <div className="modern-header">
        <div>
          <h1>Kiểm Tra GDPR</h1>
          <p>Phân tích AI thông minh • Đánh giá tuân thủ tự động • Bảo vệ dữ liệu cá nhân</p>
        </div>
        <div className="header-actions">
          <div className="user-profile">
            <div className="user-avatar">AD</div>
            <span>Anne Douglas</span>
            <span>▼</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        {/* Info Banner */}
        <div className="modern-card" style={{ 
          marginBottom: '24px', 
          background: 'linear-gradient(135deg, #F0F4FF 0%, #FAF5FF 100%)',
          border: '2px solid var(--purple-primary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Lưu ý</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                File cần được upload và phân tích ở trang <strong>Phân Tích</strong> trước. Sau đó bạn có thể chọn file đã phân tích ở đây để kiểm tra GDPR.
              </div>
            </div>
          </div>
        </div>

        {/* File Selection Section */}
        <div className="modern-card" style={{ marginBottom: '24px' }}>
          <FileSelector 
            onFileSelect={handleFileSelect}
            selectedFileId={selectedFile?.processing_id}
            filter="for-gdpr"
          />
        </div>

        {/* Action Section */}
        {selectedFile && (
          <div className="modern-card">
            <div className="card-header">
              <div>
                <div className="card-title">File Đã Chọn</div>
                <div className="card-subtitle">{selectedFile.file_name}</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ 
                padding: '20px', 
                background: 'var(--gray-50)', 
                borderRadius: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <span style={{ fontSize: '2rem' }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{selectedFile.file_name}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>
                    {selectedFile.department && <span className="filter-tag">{selectedFile.department}</span>}
                    <span style={{ margin: '0 8px' }}>•</span>
                    {new Date(selectedFile.created_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-modern btn-primary"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? (
                  <>
                    <span className="gdpr-btn-spinner" style={{ marginRight: '8px' }}></span>
                    Đang kiểm tra GDPR...
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    Kiểm Tra GDPR
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Status Section */}
        <div className="modern-card">
          <div className="card-header">
            <div>
              <div className="card-title">Trạng Thái Xử Lý</div>
              <div className="card-subtitle">Theo dõi tiến trình kiểm tra GDPR</div>
            </div>
          </div>
          
          <div className="gdpr-status-content">
            {loading || status ? (
              <div className="gdpr-progress-container">
                {/* Multi-step Progress */}
                <div className="gdpr-steps-timeline">
                  {processingSteps.map((step, index) => (
                    <div 
                      key={index}
                      className={`gdpr-timeline-step ${
                        status?.steps?.gdpr === 'completed' ? 'completed' :
                        index < processingStep ? 'completed' : 
                        index === processingStep && loading ? 'active' : ''
                      }`}
                    >
                      <div className="gdpr-timeline-dot">
                        {status?.steps?.gdpr === 'completed' || index < processingStep ? '✓' : 
                         index === processingStep && loading ? <span className="gdpr-mini-spinner"></span> : 
                         (index + 1)}
                      </div>
                      <div className="gdpr-timeline-content">
                        <span className="gdpr-timeline-icon">{step.icon}</span>
                        <span className="gdpr-timeline-text">{step.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="gdpr-progress-bar-wrapper">
                  <div className="gdpr-progress-bar">
                    <div 
                      className={`gdpr-progress-fill ${status?.steps?.gdpr === 'completed' ? 'complete' : ''}`}
                      style={{
                        width: status?.steps?.gdpr === 'completed' ? '100%' : `${(processingStep + 1) * 25}%`
                      }}
                    ></div>
                  </div>
                  <span className="gdpr-progress-percent">
                    {status?.steps?.gdpr === 'completed' ? '100' : (processingStep + 1) * 25}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="gdpr-status-empty">
                <div className="gdpr-empty-illustration">
                  <div className="gdpr-empty-circle"></div>
                  <div className="gdpr-empty-icon">📋</div>
                </div>
                <p>Chưa có tài liệu nào được kiểm tra</p>
                <span>Upload tài liệu để bắt đầu phân tích GDPR</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="modern-card" style={{ marginBottom: '32px' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Kết Quả Phân Tích GDPR</div>
              <div className="card-subtitle">Chi tiết đánh giá tuân thủ</div>
            </div>
          </div>
          
          <div className="gdpr-results-grid">
            {/* Main Decision Card */}
            <div 
              className={`gdpr-decision-card gdpr-decision-${result.gdprDecision}`}
              style={{ 
                borderColor: decisionInfo.color,
              }}
            >
              <div className="gdpr-decision-glow" style={{ background: decisionInfo.color }}></div>
              <div className="gdpr-decision-content">
                <div className="gdpr-decision-badge" style={{ backgroundColor: decisionInfo.color }}>
                  <span className="gdpr-decision-icon">{decisionInfo.icon}</span>
                  <span className="gdpr-decision-label">{decisionInfo.label}</span>
                </div>
                <p className="gdpr-decision-desc">{decisionInfo.description}</p>
                <div className="gdpr-decision-meter">
                  <div className="gdpr-meter-track">
                    <div 
                      className="gdpr-meter-fill"
                      style={{ 
                        width: result.gdprDecision === 'approve' ? '100%' : 
                               result.gdprDecision === 'review' ? '60%' : '20%',
                        background: decisionInfo.color
                      }}
                    ></div>
                  </div>
                  <span className="gdpr-meter-label">Mức độ tuân thủ</span>
                </div>
              </div>
            </div>

            {/* Personal Data Card */}
            <div className="gdpr-info-card gdpr-glass-card">
              <div className="gdpr-card-shine"></div>
              <div className="gdpr-info-header">
                <div className="gdpr-info-icon-wrapper personal">
                  <span className="gdpr-info-icon">👤</span>
                </div>
                <h3>Dữ Liệu Cá Nhân</h3>
                {result.personalDataFound?.length > 0 && (
                  <span className="gdpr-info-count">{result.personalDataFound.length}</span>
                )}
              </div>
              <div className="gdpr-info-content">
                {result.personalDataFound && result.personalDataFound.length > 0 ? (
                  <ul className="gdpr-data-list">
                    {result.personalDataFound.map((data, index) => (
                      <li key={index} style={{ animationDelay: `${index * 0.1}s` }}>
                        <span className="gdpr-data-icon">🔹</span>
                        <span className="gdpr-data-text">{data}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="gdpr-no-data">
                    <span className="gdpr-check-icon">✓</span>
                    <p>Không tìm thấy dữ liệu cá nhân</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sensitive Data Card */}
            <div className="gdpr-info-card gdpr-glass-card">
              <div className="gdpr-card-shine"></div>
              <div className="gdpr-info-header">
                <div className={`gdpr-info-icon-wrapper ${result.sensitiveDataDetected ? 'warning' : 'success'}`}>
                  <span className="gdpr-info-icon">🔐</span>
                </div>
                <h3>Dữ Liệu Nhạy Cảm</h3>
              </div>
              <div className="gdpr-info-content">
                <div className={`gdpr-status-indicator ${result.sensitiveDataDetected ? 'warning' : 'success'}`}>
                  <div className="gdpr-indicator-icon">
                    {result.sensitiveDataDetected ? '⚠️' : '✅'}
                  </div>
                  <div className="gdpr-indicator-text">
                    <span className="gdpr-indicator-title">
                      {result.sensitiveDataDetected ? 'Có phát hiện' : 'An toàn'}
                    </span>
                    <span className="gdpr-indicator-desc">
                      {result.sensitiveDataDetected ? 'Cần xử lý ngay' : 'Không có rủi ro'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* DPO Notification Card */}
            <div className="gdpr-info-card gdpr-glass-card">
              <div className="gdpr-card-shine"></div>
              <div className="gdpr-info-header">
                <div className={`gdpr-info-icon-wrapper ${result.notifyDPO ? 'warning' : 'success'}`}>
                  <span className="gdpr-info-icon">📧</span>
                </div>
                <h3>Thông Báo DPO</h3>
              </div>
              <div className="gdpr-info-content">
                <div className={`gdpr-status-indicator ${result.notifyDPO ? 'warning' : 'success'}`}>
                  <div className="gdpr-indicator-icon">
                    {result.notifyDPO ? '📬' : '📭'}
                  </div>
                  <div className="gdpr-indicator-text">
                    <span className="gdpr-indicator-title">
                      {result.notifyDPO ? 'Bắt buộc' : 'Không bắt buộc'}
                    </span>
                    <span className="gdpr-indicator-desc">
                      {result.notifyDPO ? 'Thông báo DPO ngay' : 'Không cần thông báo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason Card */}
            {result.reason && (
              <div className="gdpr-reason-card gdpr-glass-card">
                <div className="gdpr-card-shine"></div>
                <div className="gdpr-info-header">
                  <div className="gdpr-info-icon-wrapper reason">
                    <span className="gdpr-info-icon">💡</span>
                  </div>
                  <h3>Phân Tích Chi Tiết</h3>
                </div>
                <div className="gdpr-reason-content">
                  <div className="gdpr-reason-quote">
                    <svg className="gdpr-quote-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                    </svg>
                    <p>{result.reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="gdpr-action-buttons">
            <button className="gdpr-action-btn secondary" onClick={resetForm}>
              <span>🔄</span> Kiểm tra file khác
            </button>
            <button className="gdpr-action-btn primary">
              <span>📥</span> Tải báo cáo PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GDPRPage;

