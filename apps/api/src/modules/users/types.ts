export type UserSearchItem = {
  id: string;
  name: string;
  email: string;
  isCurrentUser: boolean;
};

export type SearchUsersResult = {
  data: UserSearchItem[];
};
