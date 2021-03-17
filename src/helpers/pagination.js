export const handleNextPage = (queryAst, cacheData, reducedResult, pagination) => (
    async () => {
        const { selections } = queryAst.definitions[0].selectionSet;
        const paginatedField = selections.find((selection) => (
            selection.arguments.some(({ name }) => name.value === 'pagination')
        ));

        if (!paginatedField) {
            throw new Error('Cannot call `nextPage` when there is no field with a pagination parameter.');
        }

        const data = cacheData[paginatedField.name.value];

        const result = await reducedResult.fetchMore({
            variables: {
                pagination: {
                    ...pagination,
                    cursor: data[data.length - 1]?.[pagination.orderBy],
                },
            },
        });

        if (result.data[paginatedField.name.value].length === 0) {
            return null;
        }

        return result;
    }
);

export const getVariablesWithPagination = (options) => {
    if (!options.variables) {
        if (!options.pagination) {
            return undefined;
        }

        return { pagination: options.pagination };
    }

    if (!options.pagination) {
        return options.variables;
    }

    return {
        ...options.variables,
        pagination: options.pagination,
    };
};
