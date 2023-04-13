const mapObjectData = (object, path, result, to) => {
    let key = path[0];
    let value;

    if (!object[key]) {
        return object;
    }

    if (path.length === 1) {
        const toConfig = typeof to === 'object' ? to : { fieldName: key, target: to };
        const toData = result[toConfig.target];

        if (Array.isArray(object[key])) {
            value = object[key].map((item) => ({
                ...item,
                ...(toData || []).find(({ id }) => id === item.id),
            }));
        } else if (typeof object[key] === 'object') {
            if (Array.isArray(toData)) {
                value = {
                    ...(object[key] || {}),
                    ...toData.find(({ id }) => id === object[key].id),
                };
            } else {
                value = {
                    ...(object[key] || {}),
                    ...(toData || {}),
                };
            }
        } else if (Array.isArray(toData)) {
            value = toData.find(({ id }) => id === object[key]);
        } else {
            value = toData;
        }

        key = toConfig.fieldName;
    } else if (Array.isArray(object[key])) {
        value = object[key].map((item) => ({
            ...item,
            ...mapObjectData(item, path.slice(1), result, to),
        }));
    } else {
        value = mapObjectData(object[key], path.slice(1), result, to);
    }

    return { ...object, [key]: value };
};

export default (data, map = {}) => {
    if (!data) {
        return data;
    }

    return Object.entries(map).reduce((result, [from, to]) => {
        const fromPath = from.split('.');

        return mapObjectData(result, fromPath, result, to);
    }, data);
};
