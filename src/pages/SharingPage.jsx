import React, { useState, useEffect } from 'react';
import FileSelector from '../components/FileSelector';
import '../App.css';

function SharingPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sharingEmails, setSharingEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [needApproval, setNeedApproval] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  
  // Danh sách TẤT CẢ approvals
  const [approvals, setApprovals] = useState([]);
  const [approvalsFilter, setApprovalsFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
  const [adminEmail] = useState('admin@company.com'); // TODO: Lấy từ auth

  // Danh sách người dùng theo bộ phận
  const usersByDepartment = {
    'IT': [
      { id: 'user001', name: 'Nguyễn Văn A', email: 'nguyenvana@company.com' },
      { id: 'user002', name: 'Trần Văn B', email: 'tranvanb@company.com' }
    ],
    'HR': [
      { id: 'user003', name: 'Lê Thị C', email: 'lethic@company.com' },
      { id: 'user004', name: 'Phạm Văn D', email: 'phamvand@company.com' }
    ],
    'Finance': [
      { id: 'user005', name: 'Hoàng Thị E', email: 'hoangthie@company.com' },
      { id: 'user006', name: 'Vũ Văn F', email: 'vuvanf@company.com' },
      { id: 'user007', name: 'Phạm H', email: 'hpham@company.com' }
    ]
  };

  // Lấy danh sách users theo department đã chọn
  const availableUsers = selectedDepartment ? usersByDepartment[selectedDepartment] || [] : [];

  // Handle department selection
  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value);
  };

  // Add user to selected list
  const addUser = (user) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Add all users from current department
  const addAllUsersFromDepartment = () => {
    const newUsers = availableUsers.filter(user => 
      !selectedUsers.find(u => u.id === user.id)
    );
    setSelectedUsers([...selectedUsers, ...newUsers]);
  };

  // Remove user from selected list
  const removeUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  // Clear all selected users
  const clearAllUsers = () => {
    setSelectedUsers([]);
  };

  // Update sharing emails when selected users change
  useEffect(() => {
    const emails = selectedUsers.map(user => user.email).join(', ');
    setSharingEmails(emails);
  }, [selectedUsers]);

  // Fetch approvals list
  const fetchApprovals = async () => {
    try {
      const response = await fetch(`/api/approvals/list?status=${approvalsFilter}`);
      if (!response.ok) throw new Error('Failed to fetch approvals');
      
      const data = await response.json();
      setApprovals(data.approvals || []);
    } catch (error) {
      console.error('❌ Error fetching approvals:', error);
    }
  };

  // Auto refresh approvals mỗi 5 giây
  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 5000);
    return () => clearInterval(interval);
  }, [approvalsFilter]);

  // Handle approve
  const handleApprove = async (approval) => {
    if (!confirm(`Xác nhận PHÊ DUYỆT:\n"${approval.documentTitle}"?`)) return;

    try {
      const response = await fetch('/api/approvals/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uniqueKey: approval.uniqueKey,
          approved: true,
          approvedBy: adminEmail
        })
      });

      if (!response.ok) throw new Error('Phê duyệt thất bại');
      
      alert('✅ Đã phê duyệt! Workflow sẽ tiếp tục chia sẻ.');
      fetchApprovals();
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    }
  };

  // Handle reject
  const handleReject = async (approval) => {
    const reason = prompt('Nhập lý do từ chối:');
    if (!reason?.trim()) return alert('Vui lòng nhập lý do');

    try {
      const response = await fetch('/api/approvals/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uniqueKey: approval.uniqueKey,
          approved: false,
          rejectedBy: adminEmail,
          reason
        })
      });

      if (!response.ok) throw new Error('Từ chối thất bại');
      
      alert('✅ Đã từ chối!');
      fetchApprovals();
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    }
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setResult(null);
    setStatus(null);
  };

  // Form submission - Trigger sharing workflow
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Vui lòng chọn file đã kiểm tra GDPR');
      return;
    }

    if (selectedUsers.length === 0) {
      alert('Vui lòng chọn ít nhất một người dùng để chia sẻ');
      return;
    }

    setLoading(true);
    setResult(null);
    setStatus({ status: 'processing', steps: { sharing: 'processing' }, fileName: selectedFile.file_name });
    
    try {
      // Gọi API để trigger sharing workflow với processingId đã có
      const response = await fetch('/api/document/trigger-sharing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          processingId: selectedFile.processing_id,
          department: selectedDepartment,
          sharingEmails: sharingEmails,
          selectedUsers: selectedUsers,
          userId: selectedUsers.length > 0 ? selectedUsers[0].id : 'default-user'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProcessingId(selectedFile.processing_id);
        
        // Kiểm tra nếu cần phê duyệt
        if (data.needApproval === true) {
          setNeedApproval(true);
          setApprovalMessage(data.message || 'Tài liệu cần được phê duyệt bởi admin');
          setStatus({ status: 'pending_approval', steps: { sharing: 'pending' } });
          alert('⚠️ Tài liệu cần phê duyệt!\n\n' + (data.message || 'Vui lòng đợi admin xét duyệt.'));
        } else {
          startStatusPolling(selectedFile.processing_id);
        }
      } else {
        throw new Error(data.message || 'Không thể trigger sharing workflow');
      }
    } catch (error) {
      console.error('❌ Network Error:', error);
      alert('Lỗi: ' + error.message + '\n\nVui lòng thử lại hoặc kiểm tra workflow đã được kích hoạt chưa.');
      setLoading(false);
      setStatus(null);
    }
  };

  // Status polling - chỉ theo dõi sharing
  const startStatusPolling = (id) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/document/status/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const statusData = await response.json();
        setStatus(statusData);
        
        // Nếu sharing hoàn thành, hiển thị kết quả
        if (statusData.results?.sharing) {
          setResult(statusData.results.sharing);
          clearInterval(interval);
        }
        
        if (statusData.status === 'completed' || statusData.status === 'failed') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('❌ Error fetching status:', error);
      }
    }, 2000);
  };

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
          <h1>Chia Sẻ Tài Liệu</h1>
          <p>Chia sẻ tài liệu với người dùng và quản lý quyền truy cập</p>
        </div>
        <div className="header-actions">
          <div className="user-profile">
            <div className="user-avatar">AD</div>
            <span>Anne Douglas</span>
            <span>▼</span>
          </div>
        </div>
      </div>

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
              File cần được upload và phân tích ở trang <strong>Phân Tích</strong> trước. Sau đó bạn có thể chọn file đã phân tích ở đây để chia sẻ.
            </div>
          </div>
        </div>
      </div>

      <div className="modern-card" style={{ marginBottom: '24px' }}>
        <FileSelector 
          onFileSelect={handleFileSelect}
          selectedFileId={selectedFile?.processing_id}
          filter="for-sharing"
        />
      </div>

      {selectedFile && (
        <div className="modern-card" style={{ marginBottom: '24px' }}>
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

          <div className="form-group-modern">
            <label className="form-label">🏢 Chọn bộ phận:</label>
            <select 
              id="selectedDepartment" 
              value={selectedDepartment}
              onChange={handleDepartmentChange}
              required
              className="form-select"
            >
              <option value="">-- Chọn bộ phận --</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          {selectedDepartment && (
            <div className="form-group-modern">
              <label className="form-label">👥 Chọn người dùng từ bộ phận {selectedDepartment}:</label>
              
              <div style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={addAllUsersFromDepartment}
                  className="btn-modern btn-secondary"
                  disabled={availableUsers.every(user => 
                    selectedUsers.find(u => u.id === user.id)
                  )}
                >
                  ✅ Chọn tất cả {selectedDepartment}
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {availableUsers.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => addUser(user)}
                    className="btn-modern btn-secondary"
                    disabled={selectedUsers.find(u => u.id === user.id)}
                    style={{ fontSize: '0.9rem' }}
                  >
                    ➕ {user.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedUsers.length > 0 && (
            <div className="form-group-modern">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label className="form-label">📋 Danh sách người dùng đã chọn ({selectedUsers.length} người):</label>
                <button
                  type="button"
                  onClick={clearAllUsers}
                  className="btn-modern btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                >
                  🗑️ Xóa tất cả
                </button>
              </div>
              
              <div className="modern-card" style={{ padding: '16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-700)' }}>Bộ phận</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-700)' }}>ID</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-700)' }}>Tên</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-700)' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-700)' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUsers.map(user => {
                      const userDepartment = Object.keys(usersByDepartment).find(dept => 
                        usersByDepartment[dept].find(u => u.id === user.id)
                      );
                      return (
                        <tr key={user.id} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                          <td style={{ padding: '12px' }}>
                            <span className="filter-tag">{userDepartment}</span>
                          </td>
                          <td style={{ padding: '12px', color: 'var(--gray-600)' }}>{user.id}</td>
                          <td style={{ padding: '12px', fontWeight: 500 }}>{user.name}</td>
                          <td style={{ padding: '12px', color: 'var(--gray-600)' }}>{user.email}</td>
                          <td style={{ padding: '12px' }}>
                            <button
                              type="button"
                              onClick={() => removeUser(user.id)}
                              className="btn-modern btn-secondary"
                              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                              title="Xóa người dùng này"
                            >
                              🗑️ Xóa
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="form-group-modern">
            <label className="form-label" htmlFor="sharingEmails">📧 Sharing Emails:</label>
            <textarea 
              id="sharingEmails" 
              value={sharingEmails}
              disabled
              className="form-textarea"
              rows="3"
              style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}
            />
          </div>

            <button type="submit" className="btn-modern btn-primary" disabled={loading || !selectedFile} style={{ width: '100%' }}>
              {loading ? '🔄 Đang chia sẻ...' : '🚀 Chia Sẻ Tài Liệu'}
            </button>
          </form>

          {loading && (
            <div className="loading-modern">
              <div className="spinner-modern"></div>
              <div>Đang chia sẻ tài liệu...</div>
            </div>
          )}
        </div>
      )}

      {/* Status Section - DANH SÁCH APPROVALS */}
      <div className="modern-card">
        <div className="card-header">
          <div>
            <div className="card-title">Trạng Thái Chia Sẻ & Phê Duyệt</div>
            <div className="card-subtitle">Quản lý yêu cầu phê duyệt</div>
          </div>
        </div>
          
        {/* Filter buttons */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className={`btn-modern ${approvalsFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setApprovalsFilter('ALL')}
            style={{ flex: 1, minWidth: '120px' }}
          >
            📋 Tất cả ({approvals.length})
          </button>
          <button 
            className={`btn-modern ${approvalsFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setApprovalsFilter('PENDING')}
            style={{ flex: 1, minWidth: '120px' }}
          >
            ⏳ Chờ duyệt ({approvals.filter(a => a.status === 'PENDING').length})
          </button>
          <button 
            className={`btn-modern ${approvalsFilter === 'APPROVED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setApprovalsFilter('APPROVED')}
            style={{ flex: 1, minWidth: '120px' }}
          >
            ✅ Đã duyệt
          </button>
          <button 
            className={`btn-modern ${approvalsFilter === 'REJECTED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setApprovalsFilter('REJECTED')}
            style={{ flex: 1, minWidth: '120px' }}
          >
            ❌ Từ chối
          </button>
        </div>

        {/* Approvals list */}
        {approvals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h3 style={{ marginBottom: '8px', color: 'var(--gray-700)' }}>Không có yêu cầu nào</h3>
            <p>Chưa có file nào {approvalsFilter === 'PENDING' ? 'cần phê duyệt' : ''}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {approvals.map(approval => (
              <div key={approval.uniqueKey} className="modern-card" style={{ position: 'relative' }}>
                {/* Status badge */}
                <div style={{ 
                  position: 'absolute', 
                  top: '16px', 
                  right: '16px',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: approval.status === 'PENDING' ? 'var(--warning)' : 
                             approval.status === 'APPROVED' ? 'var(--success)' : 'var(--error)',
                  color: 'var(--white)'
                }}>
                  {approval.status === 'PENDING' ? '⏳ Chờ duyệt' : 
                   approval.status === 'APPROVED' ? '✅ Đã duyệt' : '❌ Từ chối'}
                </div>

                <h3 style={{ paddingRight: '140px', marginBottom: '12px', fontSize: '1.1rem', fontWeight: 700 }}>📄 {approval.documentTitle}</h3>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                    🆔 ID: {approval.uniqueKey}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <div><strong>📂 Phòng ban:</strong> {approval.documentCategory}</div>
                    <div><strong>👤 Người upload:</strong> {approval.uploader}</div>
                    <div><strong>🔒 Bảo mật:</strong> {approval.securityLevel || 'N/A'}</div>
                    <div><strong>👥 Số người nhận:</strong> {approval.shareWithEmails?.length || 0}</div>
                    <div><strong>📅 Thời gian:</strong> {new Date(approval.createdAt).toLocaleString('vi-VN')}</div>
                  </div>

                  {approval.riskAssessment && (
                    <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '5px', marginBottom: '10px' }}>
                      <strong>⚠️ Đánh giá rủi ro:</strong>
                      <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{approval.riskAssessment}</p>
                    </div>
                  )}

                  {approval.recommendation && (
                    <div style={{ background: '#d1ecf1', padding: '10px', borderRadius: '5px', marginBottom: '10px' }}>
                      <strong>💡 Khuyến nghị:</strong>
                      <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{approval.recommendation}</p>
                    </div>
                  )}

                  {approval.status === 'APPROVED' && approval.approvedBy && (
                    <div style={{ background: '#d4edda', padding: '10px', borderRadius: '5px', color: '#155724', marginBottom: '10px' }}>
                      ✅ Đã duyệt bởi <strong>{approval.approvedBy}</strong> lúc {new Date(approval.approvedAt).toLocaleString('vi-VN')}
                    </div>
                  )}

                  {approval.status === 'REJECTED' && approval.rejectedBy && (
                    <div style={{ background: '#f8d7da', padding: '10px', borderRadius: '5px', color: '#721c24', marginBottom: '10px' }}>
                      ❌ Từ chối bởi <strong>{approval.rejectedBy}</strong> lúc {new Date(approval.rejectedAt).toLocaleString('vi-VN')}
                      <br />Lý do: {approval.reason}
                    </div>
                  )}

                {/* Action buttons - chỉ hiện với PENDING */}
                {approval.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => handleApprove(approval)} 
                      className="btn-modern btn-primary"
                      style={{ flex: 1, minWidth: '120px', background: 'var(--success)' }}
                    >
                      ✅ Phê Duyệt
                    </button>
                    <button 
                      onClick={() => handleReject(approval)} 
                      className="btn-modern btn-primary"
                      style={{ flex: 1, minWidth: '120px', background: 'var(--error)' }}
                    >
                      ❌ Từ Chối
                    </button>
                    {approval.webViewLink && (
                      <a 
                        href={approval.webViewLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-modern btn-secondary"
                        style={{ flex: 1, minWidth: '120px', textAlign: 'center', textDecoration: 'none' }}
                      >
                        👁️ Xem File
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="modern-card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Kết Quả Chia Sẻ</div>
              <div className="card-subtitle">Thông tin chi tiết</div>
            </div>
          </div>
          <div className="result-card-modern">
            <h3>Kết Quả Chia Sẻ</h3>
            <div className="result-content-modern">
              <p><strong>Trạng thái:</strong> {result.status || 'Hoàn tất'}</p>
              {status?.sharingEmails && status.sharingEmails.length > 0 && (
                <p><strong>Đã chia sẻ với:</strong> {status.sharingEmails.join(', ')}</p>
              )}
              <p><strong>Mức độ truy cập:</strong> {result.accessLevel || 'Reader'}</p>
              <p><strong>Hết hạn sau:</strong> {result.expirationDays || 30} ngày</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SharingPage;

