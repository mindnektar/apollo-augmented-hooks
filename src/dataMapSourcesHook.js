let useDataMapSourcesHook = () => ({});

export const setDataMapSourcesHook = (hook) => {
    useDataMapSourcesHook = hook;
};

export const useDataMapSources = () => (
    useDataMapSourcesHook()
);
