const getPageOrCursor = (pagination, data) => {
    if (pagination.type === 'page') {
        return {
            page: data.length === 0 ? 1 : Math.ceil(data.length / pagination.limit) + 1,
        };
    }

    const sortedData = [...data].sort((a, b) => (
        pagination.direction === 'desc'
            ? b[pagination.orderBy].localeCompare(a[pagination.orderBy])
            : a[pagination.orderBy].localeCompare(b[pagination.orderBy])
    ));

    return {
        cursor: sortedData[sortedData.length - 1]?.[pagination.orderBy],
    };
};

export const handleNextPage = (queryAst, cacheDataRef, reducedResult, pagination) => (
    async () => {
        const { selections } = queryAst.definitions[0].selectionSet;
        const paginatedField = selections.find((selection) => (
            selection.arguments.some(({ name }) => name.value === 'pagination')
        ));

        if (!paginatedField) {
            throw new Error('Cannot call `nextPage` when there is no field with a pagination parameter.');
        }

        const data = cacheDataRef.current?.[paginatedField.name.value] || [];
        const result = await reducedResult.fetchMore({
            variables: {
                pagination: {
                    ...pagination,
                    ...getPageOrCursor(pagination, data),
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
