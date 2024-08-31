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
        className="p-2 border rounded"
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
        console.log('Fetched properties:', propertiesData); // Debugging log
        console.log('Fetched customers:', customersData); // Debugging log
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
    // Implement edit logic here
    console.log('Editing property:', property);
  };

  const handleDelete = async (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק נכס זה?')) {
      try {
        await deleteProperty(id); // Assume this function exists in airtable.js
        setProperties(properties.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting property:', error);
      }
    }
  };

  const handleSendMessage = (property) => {
    const relevantCustomers = customers.filter(customer => {
      // וודא שהתקציב והמחיר הם מספרים תקפים
      if (!customer.Budget || !property.price || 
          typeof customer.Budget !== 'number' || typeof property.price !== 'number') {
        return false;
      }
  
      const propertyPrice = property.price;
      const customerBudget = customer.Budget;
  
      // הלקוח רלוונטי אם:
      // 1. התקציב שלו עד מיליון ש"ח מעל מחיר הנכס
      // 2. התקציב שלו לא פחות מ-85% ממחיר הנכס
      return (customerBudget <= propertyPrice + 1000000) && 
             (customerBudget >= propertyPrice * 0.85);
    });
  
    console.log('Relevant customers:', relevantCustomers); // לוג לבדיקה
  
    router.push({
      pathname: '/send-message',
      query: { 
        propertyId: property.id,
        customerIds: relevantCustomers.map(c => c.id).join(',')
      }
    });
  };

  const columns = useMemo(
    () => [
      { Header: 'רחוב', accessor: 'street' },
      { 
        Header: 'מחיר', 
        accessor: 'price', 
        Cell: ({ value }) => `₪${value?.toLocaleString() || ''}`,
      },
      { Header: 'חדרים', accessor: 'rooms' },
      { Header: 'מ"ר', accessor: 'square_meters' },
      { Header: 'קומה', accessor: 'floor' },
      { Header: 'עיר', accessor: 'city' },
      { Header: 'אזור', accessor: 'area' },
      {
        Header: 'פעולות',
        Cell: ({ row }) => (
          <div className="flex space-x-4">
            <button 
              onClick={() => handleEdit(row.original)} 
              className="p-1 text-blue-500 hover:text-blue-600 transition-colors"
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-lg font-semibold text-gray-700">טוען נתונים...</p>
      </div>
    </div>
  );

  console.log('Current properties state:', properties); // Debugging log

  return (
    <div className="container mx-auto p-4">
      {isLoading && <LoadingIndicator />}
      <div className="mb-4 flex justify-between items-center">
        <GlobalFilter
          filter={globalFilter}
          setFilter={setGlobalFilter}
        />
      </div>
      <div className="overflow-x-auto shadow-md sm:rounded-lg">
        <table {...getTableProps()} className="w-full text-sm text-right text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
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
                  className="bg-white border-b hover:bg-gray-50"
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
      {/* Pagination controls */}
    </div>
  );
};

export default PropertyList;