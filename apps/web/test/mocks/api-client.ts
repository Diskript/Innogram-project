export const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  upload: jest.fn(),
  getBlob: jest.fn(),
  requestBlob: jest.fn(),
};

export class MockApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const ApiError = MockApiError;

jest.mock("@/lib/api-client", () => ({
  api: mockApi,
  authApi: mockApi,
  ApiError: MockApiError,
  getAccessToken: jest.fn(() => null),
  setAccessToken: jest.fn(),
}));
