let useGlobalContextHook = () => ({});

export const setGlobalContextHook = (hook) => {
    useGlobalContextHook = hook;
};

export const useGlobalContext = () => (
    useGlobalContextHook()
);
