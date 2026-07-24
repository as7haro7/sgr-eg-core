export interface ErrorDetail {
  code: string;
  message: string;
  field?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  message: string;
  errors: ErrorDetail[];
}
