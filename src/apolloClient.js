let clientInstance;

export default (client) => {
    if (client) {
        clientInstance = client;
    }

    return clientInstance;
};
