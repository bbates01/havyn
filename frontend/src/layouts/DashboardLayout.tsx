import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function DashboardLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const role: 'admin' | 'manager' | 'staff' | null = user?.roles.includes('Admin')
    ? 'admin'
    : user?.roles.includes('Manager')
      ? 'manager'
      : user?.roles.includes('SocialWorker')
        ? 'staff'
        : null;

  const base =
    role === 'admin' ? '/admin'
      : role === 'manager' ? '/manager'
        : role === 'staff' ? '/staff'
          : '/dashboard';

  const dashPath = base;
  const caseloadPath = `${base}/caseload`;
  const createUserPath = `${base}/create-user`;

  const showCreateUser = role === 'admin' || role === 'manager';
  const isCaseload = pathname.endsWith('/caseload');
  const isCreateUser = pathname.includes('/create-user');

  return (
    <>
      <nav className="dashboard-subnav border-bottom">
        <div className="container-fluid px-3 px-md-4">
          <ul className="nav nav-tabs border-0 pt-2">
            <li className="nav-item">
              <Link
                className={`nav-link ${!isCaseload && !isCreateUser ? 'active fw-semibold' : 'text-muted'}`}
                to={dashPath}
              >
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link ${isCaseload ? 'active fw-semibold' : 'text-muted'}`}
                to={caseloadPath}
              >
                Caseload
              </Link>
            </li>
            {showCreateUser && (
              <li className="nav-item">
                <Link
                  className={`nav-link ${isCreateUser ? 'active fw-semibold' : 'text-muted'}`}
                  to={createUserPath}
                >
                  Create user
                </Link>
              </li>
            )}
          </ul>
        </div>
      </nav>
      <Outlet />
    </>
  );
}

export default DashboardLayout;
