import React, { useState, useRef, useEffect } from 'react';
import FileSelector from '../components/FileSelector';
import '../App.css';

function GDPRPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [allFiles, setAllFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [filesError, setFilesError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 12;

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

  // Load all analyzed files on component mount
  useEffect(() => {
    loadAllFiles(1);
  }, []);

  // Load all files with analysis and GDPR data from database with pagination
  const loadAllFiles = async (page = 1) => {
    try {
      setLoadingFiles(true);
      setFilesError(null);
      
      const offset = (page - 1) * itemsPerPage;
      console.log('🔄 Đang fetch dữ liệu từ /gdpr endpoint...', { page, offset, limit: itemsPerPage, search: searchQuery });
      let apiUrl = `/gdpr?limit=${itemsPerPage}&offset=${offset}&has_analysis=true`;
      if (searchQuery && searchQuery.trim()) {
        apiUrl += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      console.log('📡 API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('📥 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Data received:', {
        success: data.success,
        count: data.data?.length || 0,
        pagination: data.pagination
      });
      
      if (data.success) {
        const files = data.data || [];
        const total = data.pagination?.total || files.length;
        const pages = Math.ceil(total / itemsPerPage);
        
        console.log(`✅ Loaded ${files.length} files from database (page ${page}/${pages})`);
        setAllFiles(files);
        setTotalFiles(total);
        setTotalPages(pages);
        setCurrentPage(page);
      } else {
        throw new Error(data.error || 'Failed to load files');
      }
    } catch (err) {
      console.error('❌ Error loading all files:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack
      });
      setFilesError(`Không thể tải danh sách file từ database: ${err.message}`);
    } finally {
      setLoadingFiles(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadedFile(null);
    setResult(null);
    setStatus(null);
    setLoading(false);
    setIsUploading(false);
    setShowConfetti(false);
    setProcessingStep(0);
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      setSelectedFile(null);
      setResult(null);
      setStatus(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadedFile(file);
      setSelectedFile(null);
      setResult(null);
      setStatus(null);
    }
  };

  // Handle file selection from analyzed files
  const handleFileSelect = async (file) => {
    setSelectedFile(file);
    setUploadedFile(null);
    setResult(null);
    setStatus(null);
    
    // Nếu file đã có GDPR result, tự động load kết quả
    if (file.has_gdpr_result && file.processing_id) {
      await loadGDPRResult(file.processing_id);
    }
  };

  // Load GDPR result từ PostgreSQL
  const loadGDPRResult = async (processingId) => {
    try {
      setLoading(true);
      const response = await fetch(`/gdpr/${processingId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data?.gdpr_result) {
        // Format dữ liệu GDPR từ PostgreSQL
        const gdprResult = data.data.gdpr_result;
        const formattedResult = {
          gdprDecision: gdprResult.gdpr_decision || gdprResult.gdprDecision,
          gdprJustification: gdprResult.gdpr_justification || gdprResult.gdprJustification,
          legalBasis: gdprResult.legal_basis || gdprResult.legalBasis,
          retentionDays: gdprResult.retention_days || gdprResult.retentionDays,
          redactionFields: Array.isArray(gdprResult.redaction_fields) ? gdprResult.redaction_fields : (gdprResult.redactionFields || []),
          personalDataFound: Array.isArray(gdprResult.personal_data_found) ? gdprResult.personal_data_found : (gdprResult.personalDataFound || []),
          sensitiveDataDetected: gdprResult.sensitive_data_detected !== undefined ? gdprResult.sensitive_data_detected : (gdprResult.sensitiveDataDetected !== undefined ? gdprResult.sensitiveDataDetected : false),
          dataVolume: gdprResult.data_volume || gdprResult.dataVolume,
          notifyDPO: gdprResult.notify_dpo !== undefined ? gdprResult.notify_dpo : (gdprResult.notifyDPO !== undefined ? gdprResult.notifyDPO : false),
          gdprActionPerformed: gdprResult.gdpr_action_performed || gdprResult.gdprActionPerformed,
          reason: gdprResult.gdpr_justification || gdprResult.gdprJustification,
          // Thêm các trường bổ sung
          auditId: gdprResult.audit_id || gdprResult.auditId,
          uploader: gdprResult.uploader,
          aiDecisionTimestamp: gdprResult.ai_decision_timestamp || gdprResult.aiDecisionTimestamp,
          gdprCompletedAt: gdprResult.gdpr_completed_at || gdprResult.gdprCompletedAt,
          workflowSource: gdprResult.workflow_source || gdprResult.workflowSource,
          flow2Completed: gdprResult.flow2_completed !== undefined ? gdprResult.flow2_completed : (gdprResult.flow2Completed !== undefined ? gdprResult.flow2Completed : true)
        };
        
        setResult(formattedResult);
        setStatus({ 
          status: 'completed', 
          steps: { gdpr: 'completed' }, 
          fileName: data.data.file_name 
        });
        setLoading(false);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error loading GDPR result:', error);
      setLoading(false);
    }
  };

  // Handle upload and analyze
  const handleUploadAndAnalyze = async (e) => {
    e.preventDefault();
    
    if (!uploadedFile) {
      alert('Vui lòng chọn file để upload');
      return;
    }

    setIsUploading(true);
    setResult(null);
    setStatus(null);
    
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('userId', 'gdpr-user');
      formData.append('mode', 'analyze'); // Chỉ phân tích, sau đó sẽ trigger GDPR

      const response = await fetch('/api/document/process', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProcessingId(data.processingId);
        setStatus({ status: 'processing', steps: { analysis: 'processing', gdpr: 'pending' } });
        
        // Đợi Flow 1 hoàn thành, sau đó trigger GDPR
        startAnalysisPolling(data.processingId);
      } else {
        alert('Lỗi: ' + data.message);
        setIsUploading(false);
      }
    } catch (error) {
      console.error('❌ Network Error:', error);
      alert('Lỗi: ' + error.message);
      setIsUploading(false);
    }
  };

  // Polling để đợi Flow 1 hoàn thành, sau đó trigger GDPR
  const startAnalysisPolling = (id) => {
    let pollCount = 0;
    const maxPolls = 300; // Tối đa 10 phút
    
    const interval = setInterval(async () => {
      try {
        pollCount++;
        
        const response = await fetch(`/api/document/status/${id}`);
        
        if (!response.ok) {
          if (pollCount >= maxPolls) {
            clearInterval(interval);
            setIsUploading(false);
            setLoading(false);
            alert('Timeout: Không thể lấy trạng thái phân tích.');
            return;
          }
          return;
        }
        
        const statusData = await response.json();
        setStatus(statusData);
        
        // Nếu Flow 1 (analysis) đã hoàn thành, trigger GDPR
        if (statusData.steps?.analysis === 'completed' && statusData.results?.analysis) {
          clearInterval(interval);
          setIsUploading(false);
          
          // Trigger GDPR workflow
          await triggerGDPRWorkflow(id);
          return;
        }
        
        // Nếu failed, dừng polling
        if (statusData.steps?.analysis === 'failed' || statusData.status === 'failed') {
          clearInterval(interval);
          setIsUploading(false);
          setLoading(false);
          alert('❌ Phân tích thất bại. Vui lòng thử lại.');
          return;
        }
        
        // Timeout
        if (pollCount >= maxPolls) {
          clearInterval(interval);
          setIsUploading(false);
          setLoading(false);
          alert('⏱️ Phân tích mất quá nhiều thời gian. Vui lòng thử lại sau.');
        }
      } catch (error) {
        console.error('❌ Error fetching status:', error);
        if (pollCount >= maxPolls) {
          clearInterval(interval);
          setIsUploading(false);
          setLoading(false);
        }
      }
    }, 2000);
  };

  // Trigger GDPR workflow
  const triggerGDPRWorkflow = async (processingId) => {
    setLoading(true);
    setStatus(prev => ({ 
      ...prev, 
      steps: { ...prev?.steps, gdpr: 'processing' } 
    }));
    
    try {
      const response = await fetch('/api/document/trigger-gdpr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          processingId: processingId
        })
      });

      if (!response.ok) {
        throw new Error('Không thể trigger GDPR workflow');
      }

      const data = await response.json();
      if (data.success) {
        // Bắt đầu polling để theo dõi kết quả GDPR
        startStatusPolling(processingId);
      } else {
        throw new Error(data.message || 'Không thể trigger GDPR workflow');
      }
    } catch (error) {
      console.error('❌ Error triggering GDPR workflow:', error);
      alert('Lỗi: ' + error.message);
      setLoading(false);
      setStatus(prev => ({ 
        ...prev, 
        steps: { ...prev?.steps, gdpr: 'failed' } 
      }));
    }
  };

  // Form submission - Trigger GDPR check workflow for selected file
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Vui lòng chọn file đã phân tích');
      return;
    }

    setProcessingId(selectedFile.processing_id);
    await triggerGDPRWorkflow(selectedFile.processing_id);
  };

  // Status polling - chỉ theo dõi GDPR
  const startStatusPolling = (id) => {
    let pollCount = 0;
    const maxPolls = 60; // Tối đa 2 phút (60 * 2s)
    
    const interval = setInterval(async () => {
      try {
        pollCount++;
        
        // Thử lấy từ PostgreSQL endpoint /gdpr/:processingId (có đầy đủ GDPR data)
        const gdprResponse = await fetch(`/gdpr/${id}`);
        if (gdprResponse.ok) {
          const gdprData = await gdprResponse.json();
          if (gdprData.success && gdprData.data?.gdpr_result) {
            // Format dữ liệu GDPR từ PostgreSQL để hiển thị
            const gdprResult = gdprData.data.gdpr_result;
            const formattedResult = {
              gdprDecision: gdprResult.gdpr_decision || gdprResult.gdprDecision,
              gdprJustification: gdprResult.gdpr_justification || gdprResult.gdprJustification,
              legalBasis: gdprResult.legal_basis || gdprResult.legalBasis,
              retentionDays: gdprResult.retention_days || gdprResult.retentionDays,
              redactionFields: gdprResult.redaction_fields || gdprResult.redactionFields || [],
              personalDataFound: gdprResult.personal_data_found || gdprResult.personalDataFound || [],
              sensitiveDataDetected: gdprResult.sensitive_data_detected !== undefined ? gdprResult.sensitive_data_detected : (gdprResult.sensitiveDataDetected !== undefined ? gdprResult.sensitiveDataDetected : false),
              dataVolume: gdprResult.data_volume || gdprResult.dataVolume,
              notifyDPO: gdprResult.notify_dpo !== undefined ? gdprResult.notify_dpo : (gdprResult.notifyDPO !== undefined ? gdprResult.notifyDPO : false),
              gdprActionPerformed: gdprResult.gdpr_action_performed || gdprResult.gdprActionPerformed,
              reason: gdprResult.gdpr_justification || gdprResult.gdprJustification,
              // Thêm các trường bổ sung
              auditId: gdprResult.audit_id || gdprResult.auditId,
              uploader: gdprResult.uploader,
              aiDecisionTimestamp: gdprResult.ai_decision_timestamp || gdprResult.aiDecisionTimestamp,
              gdprCompletedAt: gdprResult.gdpr_completed_at || gdprResult.gdprCompletedAt,
              workflowSource: gdprResult.workflow_source || gdprResult.workflowSource,
              flow2Completed: gdprResult.flow2_completed !== undefined ? gdprResult.flow2_completed : (gdprResult.flow2Completed !== undefined ? gdprResult.flow2Completed : true)
            };
            
            setResult(formattedResult);
            setStatus({ 
              status: 'completed', 
              steps: { gdpr: 'completed' }, 
              fileName: gdprData.data.file_name 
            });
            setLoading(false);
            clearInterval(interval);
            return;
          }
        }
        
        // Nếu không có trong PostgreSQL, thử lấy từ status API (fallback)
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

      {/* All Analyzed Files Section */}
      <div className="modern-card" style={{ marginTop: '32px' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Tất Cả File Đã Phân Tích</div>
            <div className="card-subtitle">Danh sách đầy đủ các file và dữ liệu đã được phân tích từ database</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
              Trang {currentPage}/{totalPages} ({totalFiles} file)
            </span>
            <button 
              onClick={() => loadAllFiles(currentPage)} 
              className="btn-modern btn-secondary" 
              disabled={loadingFiles}
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              {loadingFiles ? (
                <>
                  <span className="gdpr-btn-spinner" style={{ marginRight: '8px', width: '12px', height: '12px' }}></span>
                  Đang tải...
                </>
              ) : (
                '🔄 Làm mới'
              )}
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div style={{ marginBottom: '20px', padding: '0 20px' }}>
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

        {loadingFiles ? (
          <div className="loading-modern" style={{ padding: '40px' }}>
            <div className="spinner-modern"></div>
            <div>Đang tải danh sách file từ database...</div>
          </div>
        ) : filesError ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--error)', marginBottom: '16px' }}>{filesError}</p>
            <button onClick={loadAllFiles} className="btn-modern btn-primary">
              🔄 Thử lại
            </button>
          </div>
        ) : allFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <p style={{ color: 'var(--gray-500)' }}>
              Chưa có file nào được phân tích trong database. Hãy upload và phân tích file ở trang Phân Tích trước!
            </p>
          </div>
        ) : (
          <div style={{ marginTop: '24px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
              gap: '20px' 
            }}>
              {allFiles.map((file) => {
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
                      border: selectedFile?.processing_id === file.processing_id 
                        ? '2px solid var(--purple-primary)' 
                        : '1px solid var(--gray-200)',
                      background: selectedFile?.processing_id === file.processing_id 
                        ? 'var(--purple-bg)' 
                        : 'var(--white)'
                    }}
                    onClick={() => handleFileSelect(file)}
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
                      {selectedFile?.processing_id === file.processing_id && (
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

                    {/* Action Buttons */}
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
                          handleFileSelect(file);
                        }}
                      >
                        {file.has_gdpr_result ? '👁️ Xem chi tiết' : '🔍 Kiểm tra GDPR'}
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
                marginTop: '24px',
                padding: '16px'
              }}>
                <button
                  className="btn-modern btn-secondary"
                  onClick={() => loadAllFiles(currentPage - 1)}
                  disabled={currentPage === 1 || loadingFiles}
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
                        onClick={() => loadAllFiles(pageNum)}
                        disabled={loadingFiles}
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
                  onClick={() => loadAllFiles(currentPage + 1)}
                  disabled={currentPage === totalPages || loadingFiles}
                  style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                >
                  Sau →
                </button>
              </div>
            )}

            {/* Summary Stats */}
            <div style={{ 
              marginTop: '24px', 
              padding: '20px', 
              background: 'var(--gray-50)', 
              borderRadius: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--purple-primary)' }}>
                  {allFiles.length}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>Tổng số file</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--success)' }}>
                  {allFiles.filter(f => f.has_analysis).length}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>Đã phân tích</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--info)' }}>
                  {allFiles.filter(f => f.has_gdpr_result).length}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>Đã kiểm tra GDPR</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: '#10b981' }}>
                  {allFiles.filter(f => f.gdpr_result?.gdpr_decision?.toLowerCase() === 'allow' || 
                                       f.gdpr_result?.gdpr_decision?.toLowerCase() === 'approve').length}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>Được phép</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GDPRPage;

