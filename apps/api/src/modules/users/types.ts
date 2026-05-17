export type UserSearchItem = {
  id: string;
  name: string;
  email: string;
};

export type SearchUsersResult = {
  data: UserSearchItem[];
};
