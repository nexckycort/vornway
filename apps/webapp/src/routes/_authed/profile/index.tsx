import { createFileRoute } from '@tanstack/react-router';
import { ProfileContent } from './-components/profile-content';
import { ProfileDialogs } from './-components/profile-dialogs';
import { useProfilePage } from './-hooks/use-profile-page';

export const Route = createFileRoute('/_authed/profile/')({
  component: RouteComponent,
});

function RouteComponent() {
  const page = useProfilePage();

  return (
    <>
      <ProfileContent page={page} />
      <ProfileDialogs page={page} />
    </>
  );
}
