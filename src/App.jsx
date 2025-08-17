import React, { useState } from 'react';
import FormInputData from './components/FormInputData';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const correctPassword = '0000'; // 👉 Thay mật khẩu tại đây

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === correctPassword) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('🔒 Mật khẩu sai. Vui lòng thử lại.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setError('');
  };

  return (
    <div className=" d-flex justify-content-center align-items-center bg-light">
      {isAuthenticated ? (
        <div className="w-100">
          
          <FormInputData />
        </div>
      ) : (
        <div
          className="card shadow p-4 rounded-4 border-0"
          style={{ maxWidth: '400px', width: '100%', backgroundColor: '#ffffff' }}
        >
          <div className="text-center mb-4">
            <i className="bi bi-shield-lock-fill" style={{ fontSize: '3rem', color: '#0d6efd' }}></i>
            <h4 className="mt-2 fw-bold">Đăng nhập hệ thống</h4>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-lock-fill"></i>
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control"
                  placeholder="Nhập mật khẩu..."
                />
              </div>
            </div>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <button type="submit" className="btn btn-primary w-100">
              Đăng nhập
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default App;
