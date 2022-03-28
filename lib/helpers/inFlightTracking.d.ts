export function registerRequest(query: any): void;
export function deregisterRequest(query: any): void;
export function areRequestsInFlight(): boolean;
export function waitForRequestsInFlight(): Promise<any[]>;
