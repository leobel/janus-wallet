import { Outlet } from 'react-router';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { SidebarFooterAccount } from '../components/SidebarFooterAccount';
import { AppTitle } from '../components/AppTitle';

interface DashboardProps {}

export default function Dashboard(props: DashboardProps) {
  return (
    <DashboardLayout
      slots={{
        appTitle: AppTitle,
        sidebarFooter: SidebarFooterAccount
      }}>
      <Outlet />
    </DashboardLayout>
  );
}
