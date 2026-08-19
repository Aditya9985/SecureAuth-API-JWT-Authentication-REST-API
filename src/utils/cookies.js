export const cookies = {
  getOptions: () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  }),
  setCookie: (res, name, value) => {
    res.cookie(name, value, cookies.getOptions());
  },
  set: (res, name, value) => {
    cookies.setCookie(res, name, value);
  },
  clearCookie: (res, name) => {
    res.clearCookie(name, cookies.getOptions());
  },
  getCookie: (req, name) => req.cookies?.[name],
};
