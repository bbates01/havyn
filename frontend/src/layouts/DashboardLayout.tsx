import { NavLink, Outlet } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useAuth } from '../context/AuthContext';

function DashboardLayout() {
  const { user } = useAuth();

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
  const reportsPath = `${base}/reports`;
  const createUserPath = `${base}/create-user`;
  const formsPath = `${base}/forms`;

  const showReportsTab = role === 'admin' || role === 'manager';
  const showCreateUser = role === 'admin' || role === 'manager';
  const showFormsNav = role === 'admin' || role === 'manager' || role === 'staff';

  return (
    <>
      <nav className="dashboard-subnav border-bottom">
        <div className="container-fluid px-3 px-md-4">
          <ul className="nav nav-tabs border-0 pt-2">
            <li className="nav-item">
              <NavLink
                end
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active fw-semibold' : 'text-muted'}`
                }
                to={dashPath}
              >
                Dashboard
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active fw-semibold' : 'text-muted'}`
                }
                to={caseloadPath}
              >
                Caseload
              </NavLink>
            </li>
            {showReportsTab && (
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active fw-semibold' : 'text-muted'}`
                  }
                  to={reportsPath}
                >
                  Reports and Analytics
                </NavLink>
              </li>
            )}
            {showCreateUser && (
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active fw-semibold' : 'text-muted'}`
                  }
                  to={createUserPath}
                >
                  Create User
                </NavLink>
              </li>
            )}
            {showFormsNav && (
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active fw-semibold' : 'text-muted'}`
                  }
                  to={formsPath}
                >
                  Forms
                </NavLink>
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
