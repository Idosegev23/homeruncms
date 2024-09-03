import React, { useState, useEffect, useMemo } from 'react';
import { useTable, usePagination, useSortBy, useFilters, useGlobalFilter } from 'react-table';
import { fetchProperties, fetchCustomers, deleteProperty } from '../utils/airtable';
import { PencilSquareIcon, TrashIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';

const GlobalFilter = ({ filter, setFilter }) => {
  return (
    <div className="flex items-center">
      <input
        value={filter || ''}
        onChange={e => setFilter(e.target.value)}
        placeholder="חיפוש גלובלי..."
        className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
      />
    </div>
  );
};

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [propertiesData, customersData] = await Promise.all([
          fetchProperties(),
          fetchCustomers()
        ]);
        setProperties(propertiesData);
        setCustomers(customersData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleEdit = (property) => {
    console.log('Editing property:', property);
  };

  const handleDelete = async (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק נכס זה?')) {
      try {
        await deleteProperty(id);
        setProperties(properties.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting property:', error);
      }
    }
  };

  const handleSendMessage = (property) => {
    const selectedPropertyIds = [property.id];
    const relevantCustomers = customers.filter(customer => {
      if (!customer.Budget || !property.price || 
          typeof customer.Budget !== 'number' || typeof property.price !== 'number') {
        return false;
      }
  
      const propertyPrice = property.price;
      const customerBudget = customer.Budget;
  
      return (customerBudget <= propertyPrice + 1000000) && 
             (customerBudget >= propertyPrice * 0.90);
    });
  
    router.push({
      pathname: '/send-message',
      query: { source: 'properties', propertyIds: selectedPropertyIds.join(','), customerId: relevantCustomers }
    });
  };

  const columns = useMemo(
    () => [
      { Header: 'מחיר', accessor: 'price', Cell: ({ value }) => `₪${value?.toLocaleString() || ''}` },
      { Header: 'חדרים', accessor: 'rooms' },
      { Header: 'מ"ר', accessor: 'square_meters' },
      { Header: 'קומה', accessor: 'floor' },
      { Header: 'קומה מקסימלית', accessor: 'max_floor' },
      { Header: 'רחוב', accessor: 'street' },
      { Header: 'מעלית', accessor: 'Elevator' },
      { Header: 'חניה', accessor: 'parking' },
      { Header: 'ממ"ד', accessor: 'saferoom' },
      { Header: 'מצב', accessor: 'condition' },
      { Header: 'פוטנציאל תמא', accessor: 'potential' },
      { Header: 'מרפסת', accessor: 'Balcony' },
      { Header: 'כיווני אוויר', accessor: 'airways' },
      { Header: 'גודל מרפסת', accessor: 'balcony_size' },
      {
        Header: 'פעולות',
        Cell: ({ row }) => (
          <div className="flex space-x-4">
            <button 
              onClick={() => handleEdit(row.original)} 
              className="p-1 text-yellow-500 hover:text-yellow-600 transition-colors"
            >
              <PencilSquareIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={() => handleDelete(row.original.id)} 
              className="p-1 text-red-500 hover:text-red-600 transition-colors"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={() => handleSendMessage(row.original)} 
              className="p-1 text-green-500 hover:text-green-600 transition-colors"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        ),
      },
    ],
    [properties]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state,
    setGlobalFilter,
  } = useTable(
    { 
      columns, 
      data: properties,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const { pageIndex, pageSize, globalFilter } = state;

  const LoadingIndicator = () => (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-black p-6 rounded-lg shadow-xl">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
        <p className="mt-4 text-lg font-semibold text-white">טוען נתונים...</p>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 bg-black text-white">
      {isLoading && <LoadingIndicator />}
      <div className="mb-4 flex justify-between items-center">
        <GlobalFilter
          filter={globalFilter}
          setFilter={setGlobalFilter}
        />
      </div>
      <div className="overflow-x-auto shadow-md sm:rounded-lg">
        <table {...getTableProps()} className="w-full text-sm text-right text-white bg-gray-800">
          <thead className="text-xs uppercase bg-gray-700 text-yellow-500">
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th {...column.getHeaderProps(column.getSortByToggleProps())} className="py-3 px-6">
                    {column.render('Header')}
                    <span>
                      {column.isSorted
                        ? column.isSortedDesc
                          ? ' 🔽'
                          : ' 🔼'
                        : ''}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {page.map(row => {
              prepareRow(row);
              return (
                <tr 
                  {...row.getRowProps()} 
                  className="bg-black border-b border-gray-700 hover:bg-gray-700"
                >
                  {row.cells.map(cell => (
                    <td {...cell.getCellProps()} className="py-4 px-6">
                      {cell.render('Cell')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pagination mt-4 flex justify-between items-center">
        <div>
          <button onClick={() => gotoPage(0)} disabled={!canPreviousPage} className="px-4 py-2 mr-2 bg-yellow-500 text-black rounded disabled:bg-gray-300">
            {'<<'}
          </button>
          <button onClick={() => previousPage()} disabled={!canPreviousPage} className="px-4 py-2 mr-2 bg-yellow-500 text-black rounded disabled:bg-gray-300">
            {'<'}
          </button>
          <button onClick={() => nextPage()} disabled={!canNextPage} className="px-4 py-2 mr-2 bg-yellow-500 text-black rounded disabled:bg-gray-300">
            {'>'}
          </button>
          <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage} className="px-4 py-2 mr-2 bg-yellow-500 text-black rounded disabled:bg-gray-300">
            {'>>'}
          </button>
        </div>
        <span>
          עמוד{' '}
          <strong>
            {pageIndex + 1} מתוך {pageOptions.length}
          </strong>{' '}
        </span>
        <select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value));
          }}
          className="px-2 py-1 border border-yellow-500 rounded bg-gray-800 text-white"
        >
          {[10, 25, 50, 100].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              הצג {pageSize}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PropertyList;