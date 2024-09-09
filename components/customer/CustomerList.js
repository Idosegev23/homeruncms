import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTable, useRowSelect, usePagination, useSortBy, useFilters, useGlobalFilter } from 'react-table';
import { fetchCustomers, updateCustomer, deleteCustomer, fetchProperties } from '../../utils/airtable';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import EditCustomerModal from './EditCustomerModal';
import MatchPropertiesModal from './MatchPropertiesModal';
import CustomerDetailsModal from './CustomerDetailsModal';
import { IndeterminateCheckbox, FilterPopup, GlobalFilter } from './TableComponents';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [matchingCustomer, setMatchingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [customersData, propertiesData] = await Promise.all([
        fetchCustomers(),
        fetchProperties()
      ]);
      console.log('Fetched customers:', customersData);
      console.log('Fetched properties:', propertiesData);
      setCustomers(customersData);
      setProperties(propertiesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('אירעה שגיאה בטעינת הנתונים. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShowDetails = useCallback((customer) => {
    console.log('Showing details for customer:', customer);
    setSelectedCustomer(customer);
  }, []);

  const handleEdit = useCallback((customer) => {
    setEditingCustomer(customer);
  }, []);

  const handleSaveEdit = useCallback(async (editedCustomer) => {
    try {
      await updateCustomer(editedCustomer);
      setCustomers(prevCustomers => 
        prevCustomers.map(c => c.id === editedCustomer.id ? editedCustomer : c)
      );
      setEditingCustomer(null);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Error updating customer:', error);
      setError('אירעה שגיאה בעדכון הלקוח. אנא נסה שוב.');
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק לקוח זה?')) {
      try {
        await deleteCustomer(id);
        setCustomers(prevCustomers => prevCustomers.filter(c => c.id !== id));
        setSelectedCustomer(null);
      } catch (error) {
        console.error('Error deleting customer:', error);
        setError('אירעה שגיאה במחיקת הלקוח. אנא נסה שוב.');
      }
    }
  }, []);

  const handleMatchProperties = useCallback((customer) => {
    setMatchingCustomer(customer);
    setSelectedCustomer(null);
  }, []);

  const handleSendMessage = useCallback((selectedProperties) => {
    const selectedCustomerIds = [matchingCustomer.id];
    const selectedPropertyIds = selectedProperties.map(p => p.id);
    console.log(`Sending message for customer: ${matchingCustomer.First_name} ${matchingCustomer.Last_name}`);
    console.log('Selected properties:', selectedProperties.map(p => `${p.street}, ${p.city} - ₪${p.price.toLocaleString()}`));
  
    router.push({
      pathname: '/send-message',
      query: { 
        source: 'customers', 
        customerIds: selectedCustomerIds.join(','), 
        propertyIds: selectedPropertyIds.join(',') 
      }
    });
  }, [matchingCustomer, router]);

  const columns = useMemo(
    () => [
      {
        id: 'selection',
        Header: ({ getToggleAllRowsSelectedProps }) => (
          <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
        ),
        Cell: ({ row }) => (
          <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
        ),
      },
      { Header: 'שם פרטי', accessor: 'First_name', Filter: FilterPopup },
      { Header: 'שם משפחה', accessor: 'Last_name', Filter: FilterPopup },
      { Header: 'טלפון', accessor: 'Cell', Filter: FilterPopup },
      { 
        Header: 'תקציב', 
        accessor: 'Budget', 
        Cell: ({ value }) => value ? `₪${value.toLocaleString()}` : 'לא צוין',
        Filter: FilterPopup 
      },
      { Header: 'חדרים', accessor: 'Rooms', Filter: FilterPopup },
      { Header: 'מ"ר', accessor: 'Square_meters', Filter: FilterPopup },
      {
        Header: 'פעולות',
        Cell: ({ row }) => (
          <button
            onClick={() => handleShowDetails(row.original)}
            className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600 transition-colors"
          >
            הצג פרטים
          </button>
        ),
      },
    ],
    [handleShowDetails]
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
      data: customers,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
    useRowSelect
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

  if (error) {
    return <div className="text-red-500 text-center mt-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4 bg-black text-white">
      {isLoading && <LoadingIndicator />}
      <div className="mb-4 flex justify-between items-center">
        <GlobalFilter
          filter={globalFilter}
          setFilter={setGlobalFilter}
        />
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="px-4 py-2 bg-yellow-500 text-black rounded flex items-center"
        >
          <FunnelIcon className="h-5 w-5 mr-2" />
          סינון
        </button>
      </div>
      <div className="overflow-x-auto shadow-md sm:rounded-lg">
        <table {...getTableProps()} className="w-full text-sm text-right text-white bg-gray-800">
          <thead className="text-xs uppercase bg-gray-700 text-yellow-500">
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th 
                    key={column.id}
                    {...column.getHeaderProps(column.getSortByToggleProps())} 
                    className="py-3 px-6"
                  >
                    {column.render('Header')}
                    <span>
                      {column.isSorted
                        ? column.isSortedDesc
                          ? ' 🔽'
                          : ' 🔼'
                        : ''}
                    </span>
                    {isFilterOpen && column.Filter && (
                      <div>{column.render('Filter')}</div>
                    )}
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
                  key={row.id}
                  {...row.getRowProps()} 
                  className={`bg-black border-b border-gray-700 hover:bg-gray-700 ${
                    row.isSelected ? 'bg-gray-900' : ''
                  }`}
                >
                  {row.cells.map(cell => (
                    <td 
                      key={cell.column.id}
                      {...cell.getCellProps()} 
                      className="py-4 px-6"
                    >
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
      
      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMatchProperties={handleMatchProperties}
        />
      )}
      
      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onSave={handleSaveEdit}
          onClose={() => setEditingCustomer(null)}
        />
      )}
      
      {matchingCustomer && (
        <MatchPropertiesModal
          customer={matchingCustomer}
          properties={properties}
          onClose={() => setMatchingCustomer(null)}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
};

export default CustomerList;