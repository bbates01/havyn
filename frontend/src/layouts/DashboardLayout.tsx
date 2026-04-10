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
  const donorsPath = `${base}/donors`;
  const partnersPath = `${base}/partners`;
  const caseConferencesPath = `${base}/case-conferences`;
  const reportsPath = `${base}/reports`;
  const accountsPath = `${base}/accounts`;
  const formsPath = `${base}/forms`;

  const showReportsTab = role === 'admin' || role === 'manager';
  const showDonorsTab = role === 'admin' || role === 'manager';
  const showPartnersTab = role === 'admin' || role === 'manager';
  const showCaseConferencesTab = role === 'manager';
  const showAccountsTab = role === 'admin' || role === 'manager' || role === 'staff';
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
            {showDonorsTab && (
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active fw-semibold' : 'text-muted'}`
                  }
                  to={donorsPath}
                >
                  Donor Info
                </NavLink>
              </li>
            )}
            {showPartnersTab && (
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active fw-semibold' : 'text-muted'}`
                  }
                  to={partnersPath}
                >
                  Partners
                </NavLink>
              </li>
            )}
            {showCaseConferencesTab && (
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active fw-semibold' : 'text-muted'}`
                  }
                  to={caseConferencesPath}
                >
                  Case Conferences
                </NavLink>
              </li>
            )}
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
            {showAccountsTab && (
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active fw-semibold' : 'text-muted'}`
                  }
                  to={accountsPath}
                >
                  Accounts
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