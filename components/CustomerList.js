import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTable, useRowSelect, usePagination, useSortBy, useFilters, useGlobalFilter } from 'react-table';
import { fetchCustomers, updateCustomer, deleteCustomer, fetchProperties } from '../utils/airtable';
import { PencilSquareIcon, TrashIcon, FunnelIcon, MagnifyingGlassIcon, HomeIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import greenApi from '../utils/greenApi';

const IndeterminateCheckbox = React.forwardRef(
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

const FilterPopup = ({ column, setFilter }) => {
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

const GlobalFilter = ({ filter, setFilter }) => {
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

const EditCustomerModal = ({ customer, onSave, onClose }) => {
  const [editedCustomer, setEditedCustomer] = useState(customer);

  const handleChange = (e) => {
    setEditedCustomer({ ...editedCustomer, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editedCustomer);
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center">
      <div className="bg-black p-6 rounded-lg max-w-2xl w-full">
        <h2 className="text-xl text-yellow-500 mb-4">ערוך לקוח</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              name="First_name"
              value={editedCustomer.First_name || ''}
              onChange={handleChange}
              placeholder="שם פרטי"
              className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
            />
            <input
              name="Last_name"
              value={editedCustomer.Last_name || ''}
              onChange={handleChange}
              placeholder="שם משפחה"
              className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
            />
            <input
              name="Cell"
              value={editedCustomer.Cell || ''}
              onChange={handleChange}
              placeholder="טלפון"
              className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
            />
            <input
              name="Budget"
              type="number"
              value={editedCustomer.Budget || ''}
              onChange={handleChange}
              placeholder="תקציב"
              className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
            />
            <input
              name="Rooms"
              type="number"
              value={editedCustomer.Rooms || ''}
              onChange={handleChange}
              placeholder="חדרים"
              className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
            />
            <input
              name="Square_meters"
              type="number"
              value={editedCustomer.Square_meters || ''}
              onChange={handleChange}
              placeholder="מ״ר"
              className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
            />
            <input
              name="Preferred_floor"
              type="number"
              value={editedCustomer.Preferred_floor || ''}
              onChange={handleChange}
              placeholder="קומה מועדפת"
              className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
            />
            <input
              name="City"
              value={editedCustomer.City || ''}
              onChange={handleChange}
              placeholder="עיר"
              className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
            />
            <input
              name="Area"
              value={editedCustomer.Area || ''}
              onChange={handleChange}
              placeholder="אזור"
              className="p-2 border border-yellow-500 rounded bg-gray-800 text-white"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 bg-yellow-500 text-black rounded mr-2">שמור</button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-black rounded">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MatchPropertiesModal = ({ customer, properties, onClose, onSendMessage }) => {
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const calculateMatchPercentage = (property) => {
    let matchScore = 0;
    const budgetWeight = 0.7;
    const otherCriteriaWeight = 0.3;

    // Budget calculation
    const maxPropertyPrice = customer.Budget * 1.15;
    const minPropertyPrice = customer.Budget - 1000000;
    if (property.price <= maxPropertyPrice && property.price >= minPropertyPrice) {
      matchScore += budgetWeight;
    } else {
      return 0; // If budget doesn't match, return 0 immediately
    }

    // Other criteria
    const otherCriteria = ['Rooms', 'Square_meters', 'Preferred_floor', 'City', 'Area'];
    const criteriaMatchCount = otherCriteria.filter(criteria => 
      customer[criteria] === property[criteria.toLowerCase()]
    ).length;
    matchScore += (criteriaMatchCount / otherCriteria.length) * otherCriteriaWeight;

    return Math.round(matchScore * 100);
  };

  const getUnmatchedCriteria = (property) => {
    const criteria = [
      { name: 'תקציב', customerValue: customer.Budget, propertyValue: property.price },
      { name: 'חדרים', customerValue: customer.Rooms, propertyValue: property.rooms },
      { name: 'שטח', customerValue: customer.Square_meters, propertyValue: property.square_meters },
      { name: 'קומה', customerValue: customer.Preferred_floor, propertyValue: property.floor },
      { name: 'עיר', customerValue: customer.City, propertyValue: property.city },
      { name: 'אזור', customerValue: customer.Area, propertyValue: property.area },
    ];

    return criteria.filter(c => c.customerValue !== c.propertyValue)
      .map(c => `${c.name}: ${c.customerValue} ≠ ${c.propertyValue}`);
  };

  const togglePropertySelection = (property) => {
    setSelectedProperties(prev => 
      prev.some(p => p.id === property.id)
        ? prev.filter(p => p.id !== property.id)
        : [...prev, property]
    );
  };
  

  const filteredProperties = useMemo(() => {
    return properties
      .map(property => ({
        ...property,
        matchPercentage: calculateMatchPercentage(property),
        unmatchedCriteria: getUnmatchedCriteria(property),
      }))
      .filter(property => property.matchPercentage > 0)
      .filter(property => 
        property.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.city.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [properties, searchTerm]);

  return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-start pt-10 z-50">
        <div className="bg-black p-6 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col relative">
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-black z-10 pb-4 border-b border-yellow-500">
          <h2 className="text-xl font-semibold text-yellow-500">נכסים מתאימים ל{customer.First_name} {customer.Last_name}</h2>
          <button onClick={onClose} className="text-red-500 text-lg font-bold">&times;</button>
        </div>

        <div className="mb-4 sticky top-16 bg-black z-10 pb-4">
          <input
            type="text"
            placeholder="חיפוש לפי כתובת או עיר..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-yellow-500 rounded bg-gray-800 text-white"
          />
        </div>

        <div className="overflow-y-auto flex-grow">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.map(property => (
              <div 
                key={property.id} 
                className={`relative border p-4 rounded transition-all cursor-pointer ${
                  selectedProperties.some(p => p.id === property.id)
                    ? 'bg-yellow-200 border-yellow-600 shadow-lg' 
                    : 'hover:bg-gray-700 hover:shadow-md'
                }`}
                onClick={() => togglePropertySelection(property)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-white">{property.street}, {property.city}</h3>
                  <span className="text-lg font-bold text-yellow-500">{property.matchPercentage}% התאמה</span>
                </div>
                <p className="text-white">מחיר: ₪{property.price ? Number(property.price).toLocaleString() : 'לא זמין'}</p>
                <p className="text-white">חדרים: {property.rooms}</p>
                <p className="text-white">שטח: {property.square_meters} מ"ר</p>
                <p className="text-white">קומה: {property.floor}</p>
                {property.unmatchedCriteria.length > 0 && (
                  <div className="mt-2">
                    <p className="font-bold text-yellow-500">אי-התאמות:</p>
                    <ul className="list-disc list-inside text-sm text-red-600">
                      {property.unmatchedCriteria.map((criteria, index) => (
                        <li key={index}>{criteria}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedProperties.some(p => p.id === property.id) && (
                  <div className="absolute inset-0 bg-yellow-500 bg-opacity-20 flex justify-center items-center text-yellow-600 font-bold text-4xl">
                    ✔️
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 left-0 w-full bg-gray-800 p-4 flex justify-between border-t border-yellow-500 mt-4">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-red-500 text-white font-semibold rounded shadow hover:bg-red-600 transition-colors"
          >
            יציאה
          </button>
          <button 
            onClick={() => onSendMessage(selectedProperties)}
            disabled={selectedProperties.length === 0}
            className={`px-6 py-3 bg-yellow-500 text-black font-semibold rounded shadow hover:bg-yellow-600 transition-colors ${selectedProperties.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            שלח הודעה עם הנכסים שנבחרו
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [matchingCustomer, setMatchingCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [customersData, propertiesData] = await Promise.all([
          fetchCustomers(),
          fetchProperties()
        ]);
        setCustomers(customersData);
        setProperties(propertiesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const LoadingIndicator = () => (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-black p-6 rounded-lg shadow-xl">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
        <p className="mt-4 text-lg font-semibold text-white">טוען נתונים...</p>
      </div>
    </div>
  );

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
  };

  const handleSaveEdit = async (editedCustomer) => {
    try {
      await updateCustomer(editedCustomer);
      setCustomers(customers.map(c => c.id === editedCustomer.id ? editedCustomer : c));
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק לקוח זה?')) {
      try {
        await deleteCustomer(id);
        setCustomers(customers.filter(c => c.id !== id));
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  const handleMatchProperties = (customer) => {
    setMatchingCustomer(customer);
  };

  const handleSendMessage = (selectedProperties) => {
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
  };

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
      { 
        Header: 'טלפון', 
        accessor: 'Cell', 
        Cell: ({ value }) => value, 
        Filter: FilterPopup 
      },
      { 
        Header: 'תקציב', 
        accessor: 'Budget', 
        Cell: ({ value }) => `₪${value?.toLocaleString() || ''}`,
        Filter: FilterPopup
      },
      { Header: 'חדרים', accessor: 'Rooms', Filter: FilterPopup },
      { Header: 'מ"ר', accessor: 'Square_meters', Filter: FilterPopup },
      { Header: 'קומה מועדפת', accessor: 'Preferred_floor', Filter: FilterPopup },
      { Header: 'עיר', accessor: 'City', Filter: FilterPopup },
      { Header: 'אזור', accessor: 'Area', Filter: FilterPopup },
      {
        Header: 'פעולות',
        Cell: ({ row }) => (
          <div className="flex space-x-4">
            <button onClick={() => handleEdit(row.original)} className="p-1 text-yellow-500 hover:text-yellow-600 transition-colors">
              <PencilSquareIcon className="h-5 w-5" />
            </button>
            <button onClick={() => handleMatchProperties(row.original)} className="p-1 text-green-500 hover:text-green-600 transition-colors">
              <HomeIcon className="h-5 w-5" />
            </button>
            <button onClick={() => handleDelete(row.original.id)} className="p-1 text-red-500 hover:text-red-600 transition-colors">
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        ),
      },
    ],
    [customers]
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
    preGlobalFilteredRows,
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
                  <th {...column.getHeaderProps(column.getSortByToggleProps())} className="py-3 px-6">
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
                  {...row.getRowProps()} 
                  className={`bg-black border-b border-gray-700 hover:bg-gray-700 ${
                    row.isSelected ? 'bg-gray-900' : ''
                  }`}
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
