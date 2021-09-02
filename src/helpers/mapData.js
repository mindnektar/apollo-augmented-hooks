const mapObjectData = (object, path, toData) => {
    const key = path[0];
    let value;

    if (!object[key]) {
        return object;
    }

    if (path.length === 1) {
        if (Array.isArray(object[key])) {
            value = object[key].map((item) => ({
                ...item,
                ...(toData || []).find(({ id }) => id === item.id),
            }));
        } else if (Array.isArray(toData)) {
            value = {
                ...object[key],
                ...toData.find(({ id }) => id === object[key].id),
            };
        } else {
            value = {
                ...object[key],
                ...(toData || {}),
            };
        }
    } else if (Array.isArray(object[key])) {
        value = object[key].map((item) => ({
            ...item,
            ...mapObjectData(item, path.slice(1), toData),
        }));
    } else {
        value = mapObjectData(object[key], path.slice(1), toData);
    }

    return { ...object, [key]: value };
};

export default (data, map = {}) => {
    if (!data) {
        return data;
    }

    return Object.entries(map).reduce((result, [from, to]) => {
        const fromPath = from.split('.');

        return mapObjectData(result, fromPath, result[to]);
    }, data);
};
