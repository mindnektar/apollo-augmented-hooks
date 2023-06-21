import stringify from 'json-stable-stringify';

// Apollo offers no streamlined way to extract the query variables for the cache object we are
// modifying, so this helper has to exist.
export const extractVariablesFromFieldName = (fieldName) => {
    const variableString = (
        fieldName.match(/\((.+)\)/)?.[1]
        || fieldName.match(/:(.+)/)?.[1]
    );

    return variableString ? JSON.parse(variableString) : null;
};

const parseVariableValue = (value, variables) => {
    // Handle both inline and external variables
    if (typeof value !== 'object') {
        return value; // this may happen with values within a list
    }

    const realValue = value.value || variables?.[value.name.value];

    return value.kind === 'IntValue' ? parseInt(realValue, 10) : realValue;
};

const mapArrayArgs = (args, variables) => (
    args.map((item) => {
        if (item.kind === 'ObjectValue') {
            return reduceArgs(item.fields, variables);
        }

        if (item.kind === 'ListValue') {
            return mapArrayArgs(item.values, variables);
        }

        return parseVariableValue(item, variables);
    })
);

const reduceArgs = (args, variables) => (
    args.reduce((result, { name, value }) => {
        let next;

        if (value.kind === 'ObjectValue') {
            next = reduceArgs(value.fields, variables);
        } else if (value.kind === 'ListValue') {
            next = mapArrayArgs(value.values);
        } else {
            next = parseVariableValue(value, variables);
        }

        return { ...result, [name.value]: next };
    }, {})
);

export const buildFieldName = (selection, variables) => {
    if (!selection.arguments?.length) {
        return selection.name.value;
    }

    const args = reduceArgs(selection.arguments, variables);

    // The field names in apollo's in-memory-cache are built like this:
    //
    // someField
    // someField({"someParam":"someValue"})
    //
    // If there are multiple arguments, they are sorted alphabetically, which is why we use
    // json-stable-stringify here (which guarantees alphabetical order).
    return `${selection.name.value}(${stringify(args)})`;
};
