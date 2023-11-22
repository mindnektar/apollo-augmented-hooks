const mapObjectData = (object, path, target, fieldName, refs) => {
    const key = path[0];

    if (!object[key]) {
        return object;
    }

    if (path.length === 1) {
        let value;

        if (Array.isArray(object[key])) {
            value = object[key].map((item) => refs[item.id] || item);
        } else if (typeof object[key] === 'object') {
            value = refs[object[key].id] || object[key];
        } else {
            value = refs[object[key]] || object[key];
        }

        return { ...object, [fieldName]: value };
    }

    const nextPath = path.slice(1);

    if (Array.isArray(object[key])) {
        return {
            ...object,
            [key]: object[key].map((item) => (
                mapObjectData(item, nextPath, target, fieldName, refs)
            )),
        };
    }

    return {
        ...object,
        [key]: mapObjectData(object[key], nextPath, target, fieldName, refs),
    };
};

const getRefs = (data) => {
    if (!data) {
        return {};
    }

    return Array.isArray(data)
        ? Object.fromEntries(data.map((item) => [item.id, item]))
        : { [data.id]: data };
};

export default (data, map = {}) => {
    if (!data) {
        return data;
    }

    return Object.entries(map).reduce((result, [from, to]) => {
        const fromPath = from.split('.');
        const { target, fieldName } = typeof to === 'object' ? to : { target: to, fieldName: fromPath.at(-1) };

        return mapObjectData(result, fromPath, target, fieldName, getRefs(result[target]));
    }, data);
};
