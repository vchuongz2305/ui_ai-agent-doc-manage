import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getApiUrl } from '../config';
import '../App.css';

function HomePage() {
  const [stats, setStats] = useState({
    totalDocuments: 0,
    completedDocuments: 0,
    processingDocuments: 0,
    failedDocuments: 0,
    totalSize: 0,
    documentsByStatus: [],
    documentsByDepartment: [],
    documentsByDay: [],
    gdprDecisions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // Fetch all documents from database via /gdpr endpoint
      const response = await fetch(getApiUrl('/gdpr?limit=1000&has_analysis=true'));
      const data = await response.json();
      const allDocs = data.success ? (data.data || []) : [];

      // Calculate statistics from database
      const total = allDocs.length;
      const completed = allDocs.filter(doc => doc.status === 'completed').length;
      const processing = allDocs.filter(doc => doc.status === 'processing').length;
      const failed = allDocs.filter(doc => doc.status === 'failed').length;
      
      // Documents by status
      const statusCounts = {
        completed: completed,
        processing: processing,
        failed: failed,
        pending: allDocs.filter(doc => doc.status === 'pending' || !doc.status).length
      };
      
      // Documents by department
      const deptCounts = {};
      allDocs.forEach(doc => {
        const dept = doc.department || 'Chưa phân loại';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      
      // Documents by day (last 7 days)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0); // Reset time to start of day
        const dateStr = date.toISOString().split('T')[0];
        const count = allDocs.filter(doc => {
          if (!doc.created_at) return false;
          const docDate = new Date(doc.created_at);
          docDate.setHours(0, 0, 0, 0);
          return docDate.toISOString().split('T')[0] === dateStr;
        }).length;
        last7Days.push({
          date: date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' }),
          count: count,
          fullDate: dateStr
        });
      }
      
      // GDPR decisions from gdpr_result
      const gdprCounts = { 
        'Chấp thuận': 0, 
        'Cần xem xét': 0, 
        'Từ chối': 0 
      };
      allDocs.forEach(doc => {
        if (doc.gdpr_result?.gdpr_decision) {
          const decision = doc.gdpr_result.gdpr_decision.toLowerCase();
          if (decision === 'approve' || decision === 'approved' || decision === 'allow') {
            gdprCounts['Chấp thuận']++;
          } else if (decision === 'review' || decision === 'anonymize' || decision === 'cần xem xét') {
            gdprCounts['Cần xem xét']++;
          } else if (decision === 'reject' || decision === 'delete' || decision === 'từ chối') {
            gdprCounts['Từ chối']++;
          }
        }
      });

      // Recent documents (last 10)
      const recentDocs = allDocs
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 10);

      // Format status labels in Vietnamese
      const statusLabels = {
        completed: 'Hoàn thành',
        processing: 'Đang xử lý',
        failed: 'Thất bại',
        pending: 'Chờ xử lý'
      };

      const formattedStatus = Object.entries(statusCounts)
        .filter(([_, value]) => value > 0) // Only show statuses with data
        .map(([name, value]) => ({ 
          name: statusLabels[name] || name, 
          value,
          originalName: name // Keep original for color mapping
        }));

      const formattedDept = Object.entries(deptCounts)
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .map(([name, value]) => ({ name, value }));

      const formattedGDPR = Object.entries(gdprCounts)
        .filter(([_, value]) => value > 0) // Only show decisions with data
        .map(([name, value]) => ({ name, value }));

      console.log('📊 Dashboard Statistics:', {
        total,
        completed,
        processing,
        failed,
        statusData: formattedStatus,
        deptData: formattedDept,
        dayData: last7Days,
        gdprData: formattedGDPR
      });

      setStats({
        totalDocuments: total,
        completedDocuments: completed,
        processingDocuments: processing,
        failedDocuments: failed,
        totalSize: 0, // Size not available from /gdpr endpoint
        documentsByStatus: formattedStatus,
        documentsByDepartment: formattedDept,
        documentsByDay: last7Days,
        gdprDecisions: formattedGDPR,
        recentDocuments: recentDocs
      });
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const COLORS = ['#8B5CF6', '#7C3AED', '#A78BFA', '#C4B5FD', '#DDD6FE'];
  const STATUS_COLORS = {
    completed: '#10B981',
    processing: '#F59E0B',
    failed: '#EF4444',
    pending: '#6B7280'
  };

  return (
    <div className="modern-page">
      <div className="modern-header">
        <div>
          <h1>Dashboard</h1>
          <p>Hệ thống quản lý tài liệu thông minh với tuân thủ GDPR</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Quick Search (Ctrl+D)" />
          </div>
          <div className="user-profile">
            <div className="user-avatar">AD</div>
            <span>Anne Douglas</span>
            <span>▼</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="modern-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginBottom: '8px' }}>Tổng Tài Liệu</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                {loading ? '...' : stats.totalDocuments}
              </div>
            </div>
            <div style={{ fontSize: '2.5rem', opacity: 0.2 }}>📄</div>
          </div>
        </div>

        <div className="modern-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginBottom: '8px' }}>Đã Hoàn Thành</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
                {loading ? '...' : stats.completedDocuments}
              </div>
            </div>
            <div style={{ fontSize: '2.5rem', opacity: 0.2 }}>✅</div>
          </div>
        </div>

        <div className="modern-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginBottom: '8px' }}>Đang Xử Lý</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>
                {loading ? '...' : stats.processingDocuments}
              </div>
            </div>
            <div style={{ fontSize: '2.5rem', opacity: 0.2 }}>🔄</div>
          </div>
        </div>

        <div className="modern-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginBottom: '8px' }}>Tổng Dung Lượng</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                {loading ? '...' : formatFileSize(stats.totalSize)}
              </div>
            </div>
            <div style={{ fontSize: '2.5rem', opacity: 0.2 }}>💾</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Documents by Status */}
        <div className="modern-card">
          <div className="card-header">
            <div>
              <div className="card-title">Tài Liệu Theo Trạng Thái</div>
              <div className="card-subtitle">Phân bổ theo trạng thái xử lý</div>
            </div>
          </div>
          {loading ? (
            <div className="loading-modern">
              <div className="spinner-modern"></div>
            </div>
          ) : stats.documentsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.documentsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.documentsByStatus.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATUS_COLORS[entry.originalName] || COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              Chưa có dữ liệu
            </div>
          )}
        </div>

        {/* Documents by Department */}
        <div className="modern-card">
          <div className="card-header">
            <div>
              <div className="card-title">Tài Liệu Theo Bộ Phận</div>
              <div className="card-subtitle">Phân bổ theo phòng ban</div>
            </div>
          </div>
          {loading ? (
            <div className="loading-modern">
              <div className="spinner-modern"></div>
            </div>
          ) : stats.documentsByDepartment.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.documentsByDepartment}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              Chưa có dữ liệu
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Documents by Day */}
        <div className="modern-card">
          <div className="card-header">
            <div>
              <div className="card-title">Tài Liệu Theo Ngày (7 Ngày Gần Nhất)</div>
              <div className="card-subtitle">Xu hướng upload theo thời gian</div>
            </div>
          </div>
          {loading ? (
            <div className="loading-modern">
              <div className="spinner-modern"></div>
            </div>
          ) : stats.documentsByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.documentsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  domain={[0, 'dataMax + 1']}
                  allowDecimals={false}
                />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8B5CF6" 
                  strokeWidth={2} 
                  name="Số lượng"
                  dot={{ fill: '#8B5CF6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              Chưa có dữ liệu
            </div>
          )}
        </div>

        {/* GDPR Decisions */}
        <div className="modern-card">
          <div className="card-header">
            <div>
              <div className="card-title">Quyết Định GDPR</div>
              <div className="card-subtitle">Phân bổ kết quả kiểm tra GDPR</div>
            </div>
          </div>
          {loading ? (
            <div className="loading-modern">
              <div className="spinner-modern"></div>
            </div>
          ) : stats.gdprDecisions.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.gdprDecisions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  domain={[0, 'dataMax + 1']}
                  allowDecimals={false}
                />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  fill="#8B5CF6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              Chưa có dữ liệu GDPR
            </div>
          )}
        </div>
      </div>

      {/* Recent Documents Table */}
      <div className="modern-card">
        <div className="card-header">
          <div>
            <div className="card-title">Tài Liệu Gần Đây</div>
            <div className="card-subtitle">Danh sách các tài liệu đã xử lý</div>
          </div>
          <button onClick={fetchStatistics} className="btn-modern btn-secondary" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
            🔄 Làm mới
          </button>
        </div>
        {loading ? (
          <div className="loading-modern">
            <div className="spinner-modern"></div>
            <div>Đang tải dữ liệu...</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-700)' }}>Tên File</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-700)' }}>Trạng Thái</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-700)' }}>Ngày Tạo</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentDocuments && stats.recentDocuments.length > 0 ? (
                  stats.recentDocuments.slice(0, 10).map((doc, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                      <td style={{ padding: '12px', color: 'var(--gray-900)' }}>{doc.file_name || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          background: doc.status === 'completed' ? '#D1FAE5' : 
                                     doc.status === 'processing' ? '#FEF3C7' : '#FEE2E2',
                          color: doc.status === 'completed' ? '#065F46' : 
                                doc.status === 'processing' ? '#92400E' : '#991B1B'
                        }}>
                          {doc.status === 'completed' ? '✅ Hoàn thành' : 
                           doc.status === 'processing' ? '🔄 Đang xử lý' : 
                           doc.status === 'failed' ? '❌ Thất bại' : doc.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--gray-600)' }}>
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
                      Chưa có tài liệu nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feature Cards */}
      <div className="feature-grid" style={{ marginTop: '32px' }}>
        <Link to="/analyze" className="feature-card-modern">
          <span className="feature-icon-modern">🔍</span>
          <h2>Phân Tích Tài Liệu</h2>
          <p>Upload và phân tích tài liệu với AI để trích xuất thông tin, tóm tắt nội dung và phân loại tài liệu</p>
          <span className="feature-arrow-modern">→</span>
        </Link>

        <Link to="/gdpr" className="feature-card-modern">
          <span className="feature-icon-modern">⚖️</span>
          <h2>Kiểm Tra GDPR</h2>
          <p>Kiểm tra tuân thủ GDPR, phát hiện dữ liệu cá nhân và đưa ra quyết định về việc xử lý tài liệu</p>
          <span className="feature-arrow-modern">→</span>
        </Link>

        <Link to="/sharing" className="feature-card-modern">
          <span className="feature-icon-modern">📤</span>
          <h2>Chia Sẻ Tài Liệu</h2>
          <p>Chia sẻ tài liệu với người dùng, quản lý quyền truy cập và gửi thông báo tự động</p>
          <span className="feature-arrow-modern">→</span>
        </Link>
      </div>
    </div>
  );
}

export default HomePage;

