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
    if (typeof value !== 'object') return value; // this may happen with values within a list
    const realValue = value.value || variables?.[value.name.value];
    return value.kind === 'IntValue' ? parseInt(realValue, 10) : realValue;
};

const reduceArgs = (args, variables) => {
    const isListValue = !args[0]?.name;
    return args.reduce((result, { name, value, kind }) => {
        if (kind === 'Variable' && !value) {
            return isListValue
                ? [...result, parseVariableValue(value, variables)]
                : { ...result, [name.value]: parseVariableValue(value, variables) };
        }

        if (value.kind === 'ObjectValue') {
            return isListValue
                ? [...result, ...reduceArgs(value.fields, variables)]
                : { ...result, [name.value]: reduceArgs(value.fields, variables) };
        }

        if (value.kind === 'ListValue') {
            const values = value.values.map((val) => (val.kind === 'ObjectValue' || val.kind === 'ListValue'
                ? reduceArgs(val.kind === 'ObjectValue' ? val.fields : val.values, variables)
                : parseVariableValue(val, variables)));
            return isListValue
                ? [...result, ...values]
                : { ...result, [name.value]: values };
        }

        return isListValue
            ? [...result, parseVariableValue(value, variables)]
            : { ...result, [name.value]: parseVariableValue(value, variables) };
    }, isListValue ? [] : {});
};

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
