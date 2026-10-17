import axios from 'axios';
import { HTTPClient } from './http-client.interface.js';

export class AxiosHTTPClient implements HTTPClient {
  public async get<T>(url: string): Promise<T> {
    const { data } = await axios.get<T>(url);

    return data;
  }
}
