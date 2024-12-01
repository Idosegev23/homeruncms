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

const calculateMatchDetails = (property, customer) => {
  let totalScore = 0;
  let dealBreakers = [];
  let matchDetails = {};

  // Budget check (40%)
  const propertyPrice = property.price;
  const customerBudget = customer.Budget;
  const maxBudget = customerBudget * 1.1;
  const minBudget = customerBudget * 0.9;
  const budgetScore = (propertyPrice >= minBudget && propertyPrice <= maxBudget) ? 40 : 
    (40 * (1 - Math.abs(propertyPrice - customerBudget) / customerBudget));
  matchDetails.budget = {
    score: budgetScore,
    details: `תקציב לקוח: ₪${customerBudget.toLocaleString()} | מחיר נכס: ₪${propertyPrice.toLocaleString()}`
  };
  totalScore += budgetScore;

  // Investment property check
  if (customer.investment === 'yes') {
    return {
      score: budgetScore,
      matchDetails: { budget: matchDetails.budget },
      dealBreakers: [],
      isInvestment: true
    };
  }

  // Square meters check (8%)
  const sqmScore = Math.abs(property.square_meters - customer.Square_meters) <= 20 ? 8 : 
    (8 * (1 - Math.abs(property.square_meters - customer.Square_meters) / customer.Square_meters));
  matchDetails.squareMeters = {
    score: sqmScore,
    details: `מ"ר מבוקש: ${customer.Square_meters} | מ"ר בנכס: ${property.square_meters}`
  };
  totalScore += sqmScore;

  // Ground floor check
  if (customer.ground_floor === 'must_yes' && !property.is_ground_floor) {
    dealBreakers.push('חובה דירת גן');
  }

  // Quiet apartment check
  if (customer.quiet === 'must_yes' && !property.is_quiet) {
    dealBreakers.push('חובה דירה שקטה');
  }

  // Elevator check (8%)
  const elevatorScore = property.Elevator ? 8 : 0;
  matchDetails.elevator = {
    score: elevatorScore,
    details: `מעלית נדרשת: ${customer.Elevator === 'must_yes' ? 'כן' : 'לא'} | קיימת בנכס: ${property.Elevator ? 'כן' : 'לא'}`
  };
  if (customer.Elevator === 'must_yes' && !property.Elevator) {
    dealBreakers.push('חובה מעלית');
  }
  totalScore += elevatorScore;

  // Parking check (8%)
  let parkingScore = 0;
  if (property.parking) {
    parkingScore = property.parking_type === 'shared' ? 4 : 8;
  }
  matchDetails.parking = {
    score: parkingScore,
    details: `חניה נדרשת: ${customer.parking === 'must_yes' ? 'כן' : 'לא'} | סוג: ${property.parking_type || 'אין'}`
  };
  if (customer.parking === 'must_yes' && !property.parking) {
    dealBreakers.push('חובה חניה');
  }
  totalScore += parkingScore;

  // Balcony check
  if (customer.balcony === 'must_yes' && !property.Balcony) {
    dealBreakers.push('חובה מרפסת שמש');
  }

  // Renovation check
  if (customer.renovated === 'must_yes' && property.condition !== 'renovated') {
    dealBreakers.push('חובה דירה משופצת');
  }

  // TAMA check
  if (customer.tama === 'must_yes' && !property.potential) {
    dealBreakers.push('חובה פוטנציאל תמ"א');
  }

  // Area check (8%)
  const areaScore = customer.area?.includes(property.neighborhood) ? 8 : 0;
  matchDetails.area = {
    score: areaScore,
    details: `אזורים מבוקשים: ${customer.area?.join(', ')} | שכונת הנכס: ${property.neighborhood}`
  };
  if (customer.area_is_must === 'yes' && !customer.area?.includes(property.neighborhood)) {
    dealBreakers.push('אזור לא מתאים');
  }
  totalScore += areaScore;

  // Tower building check
  if (customer.tower_is_ok === 'must_no' && property.building_type === 'tower') {
    dealBreakers.push('לא מעוניין במגדל');
  }

  // Project apartment check
  if (customer.apt_from_project === 'must_no' && property.is_project) {
    dealBreakers.push('לא מעוניין בדירה מפרויקט');
  }

  // Safe room check (8%)
  const saferoomScore = property.saferoom ? 8 : 0;
  matchDetails.saferoom = {
    score: saferoomScore,
    details: `ממ"ד נדרש: ${customer.saferoom === 'must_yes' ? 'כן' : 'לא'} | קיים בנכס: ${property.saferoom ? 'כן' : 'לא'}`
  };
  if (customer.saferoom === 'must_yes' && !property.saferoom && !property.shelter) {
    dealBreakers.push('חובה ממ"ד/מקלט');
  }
  totalScore += saferoomScore;

  return {
    score: Math.min(100, totalScore),
    matchDetails,
    dealBreakers,
    warning: dealBreakers.length > 0 && totalScore > 85
  };
};

// עדכון הקומפוננטה של המודל
const MatchModal = ({ property, customers, onClose, onConfirm }) => {
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [showLowMatches, setShowLowMatches] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-500">
            התאמת לקוחות לנכס ברחוב {property.street}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">×</button>
        </div>

        {customers.map(customer => {
          const match = calculateMatchDetails(property, customer);
          const showCustomer = showLowMatches || match.score >= 50;

          if (!showCustomer) return null;

          return (
            <div key={customer.id} 
                 className={`mb-4 p-4 rounded-lg border ${
                   match.warning ? 'border-yellow-500' :
                   match.dealBreakers.length > 0 ? 'border-red-500' : 
                   'border-green-500'
                 }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {customer.First_name} {customer.Last_name}
                  </h3>
                  <p className="text-lg text-yellow-500">
                    התאמה כללית: {match.score.toFixed(1)}%
                  </p>
                </div>
                <input 
                  type="checkbox"
                  checked={selectedCustomers.includes(customer.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCustomers([...selectedCustomers, customer.id]);
                    } else {
                      setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                    }
                  }}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                {Object.entries(match.matchDetails).map(([key, detail]) => (
                  <div key={key} className="p-2 bg-gray-800 rounded">
                    <p className="text-gray-400">{detail.details}</p>
                    <p className="text-yellow-500">ציון: {detail.score.toFixed(1)}%</p>
                  </div>
                ))}
              </div>

              {match.dealBreakers.length > 0 && (
                <div className="mt-4 p-3 bg-red-900 bg-opacity-50 rounded">
                  <h4 className="text-red-500 font-bold mb-2">דרישות שלא מתקיימות:</h4>
                  <ul className="list-disc list-inside text-red-400">
                    {match.dealBreakers.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setShowLowMatches(!showLowMatches)}
            className="px-4 py-2 bg-gray-700 text-white rounded"
          >
            {showLowMatches ? 'הסתר התאמות נמוכות' : 'הצג הכל'}
          </button>
          <button
            onClick={() => onConfirm(selectedCustomers)}
            className="px-6 py-2 bg-yellow-500 text-black rounded"
            disabled={selectedCustomers.length === 0}
          >
            המשך עם {selectedCustomers.length} לקוחות נבחרים
          </button>
        </div>
      </div>
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
      {
        Header: 'רחוב',
        accessor: 'street',
      },
      {
        Header: 'מחיר',
        accessor: 'price',
        Cell: ({ value }) => `₪${value?.toLocaleString()}`
      },
      {
        Header: 'חדרים',
        accessor: 'rooms',
      },
      {
        Header: 'מ"ר',
        accessor: 'square_meters',
      },
      {
        Header: 'פעולות',
        Cell: ({ row }) => (
          <div className="flex space-x-2">
            <button onClick={() => handleSendMessage(row.original)}>
              <PaperAirplaneIcon className="h-5 w-5 text-yellow-500 hover:text-yellow-600" />
            </button>
            <button onClick={() => handleEdit(row.original)}>
              <PencilSquareIcon className="h-5 w-5 text-blue-500 hover:text-blue-600" />
            </button>
            <button onClick={() => handleDelete(row.original)}>
              <TrashIcon className="h-5 w-5 text-red-500 hover:text-red-600" />
            </button>
          </div>
        )
      }
    ],
    []
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