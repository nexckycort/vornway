import { getInitials } from '#/routes/_authed/groups/$id/-components/group-detail.utils';

export function ParticipantAvatar({
  name,
  image,
  sizeClassName,
}: {
  name: string;
  image: string | null;
  sizeClassName: string;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={`${sizeClassName} rounded-full object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} flex items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600`}
    >
      {getInitials(name)}
    </div>
  );
}
