const requestsInFlight = {};

export const registerRequest = (query) => {
    if (requestsInFlight[query]) {
        return;
    }

    let promiseResolve;

    requestsInFlight[query] = {
        promise: new Promise((resolve) => {
            promiseResolve = resolve;
        }),
        resolve: promiseResolve,
    };
};

export const deregisterRequest = (query) => {
    if (!requestsInFlight[query]) {
        return;
    }

    requestsInFlight[query].resolve();

    delete requestsInFlight[query];
};

export const areRequestsInFlight = () => (
    Object.keys(requestsInFlight).length > 0
);

export const waitForRequestsInFlight = () => (
    Promise.all(Object.values(requestsInFlight).map(({ promise }) => promise))
);
