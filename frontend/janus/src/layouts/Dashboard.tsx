import { Outlet } from 'react-router';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';

interface DemoProps {}

export default function Dashboard(props: DemoProps) {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
