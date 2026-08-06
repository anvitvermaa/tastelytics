import { fetchAuthSession } from 'aws-amplify/auth';

export const API_URL = "https://ny8zhk2zga.execute-api.us-east-1.amazonaws.com/prod";

export async function apiFetch(endpoint, options = {}) {
    let token = '';
    try {
        const session = await fetchAuthSession();
        token = session.tokens?.idToken?.toString() || '';
    } catch (e) {
        console.warn("No auth session");
    }
    
    const headers = {
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    return fetch(url, {
        ...options,
        headers
    });
}
