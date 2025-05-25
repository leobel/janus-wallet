import { Outlet } from 'react-router';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { SidebarFooterAccount } from '../components/SidebarFooterAccount';

interface DemoProps {}

export default function Dashboard(props: DemoProps) {
  return (
    <DashboardLayout
      slots={{
        sidebarFooter: SidebarFooterAccount
      }}>
      <Outlet />
    </DashboardLayout>
  );
}
