// Type declarations for sockjs-client
declare module 'sockjs-client' {
  export default class SockJS {
    constructor(url: string);
    send(data: string): void;
    close(): void;
    onopen?: () => void;
    onmessage?: (event: any) => void;
    onerror?: (event: any) => void;
    onclose?: () => void;
    addEventListener(event: string, handler: (event: any) => void): void;
    removeEventListener(event: string, handler: (event: any) => void): void;
  }
}
