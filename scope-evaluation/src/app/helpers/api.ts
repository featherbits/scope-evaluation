import { environment } from "src/environments/environment";

export function apiUrl(uri: string): string {
    return environment.apiUrl.replace(/\/$/, '') + '/' + uri.replace(/^\//, '')
}