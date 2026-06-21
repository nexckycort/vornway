export const fetchWithCredentials = ((input, init) => {
  return fetch(input, {
    ...init,
    credentials: 'include',
  });
}) satisfies typeof fetch;
