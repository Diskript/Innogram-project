export const mockNavigation = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  refresh: jest.fn(),
  pathname: "/",
  searchParams: new URLSearchParams(),
};

export function mockNextNavigation(pathname = "/") {
  mockNavigation.pathname = pathname;
  return mockNavigation;
}

jest.mock("next/navigation", () => ({
  useRouter: () => mockNavigation,
  usePathname: () => mockNavigation.pathname,
  useSearchParams: () => mockNavigation.searchParams,
  redirect: jest.fn(),
}));
