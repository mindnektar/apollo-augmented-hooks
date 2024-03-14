import { useState } from 'react';

export default () => {
    // Store an arbitrary value to help trigger rerenders - date works fine
    const [date, setDate] = useState(new Date());

    return [
        () => {
            setDate(new Date());
        },
        date,
    ];
};
