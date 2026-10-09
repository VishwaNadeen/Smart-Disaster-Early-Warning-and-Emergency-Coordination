export interface RequestUser {
  id?: string;
  _id?: string;
  role: string;
  email?: string;
}

export function requestUserId(user: RequestUser): string {
  const id = user?.id ?? user?._id;
  if (!id) throw new Error('JWT strategy must put id or _id on req.user');
  return String(id);
}
