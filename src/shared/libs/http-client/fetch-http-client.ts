import { HTTPClient } from './http-client.interface.js';

export class FetchHTTPClient implements HTTPClient {
  public async get<T>(url: string): Promise<T> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Request to ${url} failed with status ${response.status}`);
    }

    return await response.json() as T;
  }
}
