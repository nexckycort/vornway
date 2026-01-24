import { createFileRoute } from '@tanstack/react-router';
import { BottomNav } from '~/components/bottom-nav';
import { GradientLayout } from '~/components/gradient-layout';

export const Route = createFileRoute('/_authed/activity/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <GradientLayout className="pb-20">
      <BottomNav />
    </GradientLayout>
  );
}
