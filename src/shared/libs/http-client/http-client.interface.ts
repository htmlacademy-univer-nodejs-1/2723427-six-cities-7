export interface HTTPClient {
  get<T>(url: string): Promise<T>;
}
