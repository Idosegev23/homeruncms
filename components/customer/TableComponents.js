import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export const IndeterminateCheckbox = React.forwardRef(
  ({ indeterminate, ...rest }, ref) => {
    const defaultRef = useRef();
    const resolvedRef = ref || defaultRef;

    useEffect(() => {
      resolvedRef.current.indeterminate = indeterminate;
    }, [resolvedRef, indeterminate]);

    return (
      <input type="checkbox" ref={resolvedRef} {...rest} className="form-checkbox text-yellow-500" />
    );
  }
);

export const FilterPopup = ({ column, setFilter }) => {
  const [value, setValue] = useState(column.filterValue || '');

  const handleChange = (e) => {
    setValue(e.target.value);
    setFilter(e.target.value || undefined);
  };

  return (
    <div className="p-2 bg-black shadow-lg rounded-lg">
      <input
        value={value}
        onChange={handleChange}
        placeholder={`סנן ${column.Header}`}
        className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
      />
    </div>
  );
};

export const GlobalFilter = ({ filter, setFilter }) => {
  return (
    <div className="flex items-center">
      <MagnifyingGlassIcon className="h-5 w-5 text-yellow-500 mr-2" />
      <input
        value={filter || ''}
        onChange={e => setFilter(e.target.value)}
        placeholder="חיפוש גלובלי..."
        className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
      />
    </div>
  );
};