const CriteriaTable = ({ criteria }) => {
  if (!criteria?.length) {
    return <div>אין נתונים להצגה</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 border-b text-right">קריטריון</th>
            <th className="px-4 py-2 border-b text-right">דרישת לקוח</th>
            <th className="px-4 py-2 border-b text-right">נתוני נכס</th>
            <th className="px-4 py-2 border-b text-right">התאמה</th>
            <th className="px-4 py-2 border-b text-right">משקל</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((criterion, index) => (
            <tr key={index} className={criterion.isIronRule ? 'bg-red-50' : ''}>
              <td className="px-4 py-2 border-b">
                {criterion.name}
                {criterion.isIronRule && 
                  <span className="mr-2 text-red-600 text-sm">(דרישת ברזל)</span>
                }
              </td>
              <td className="px-4 py-2 border-b">{criterion.customerValue}</td>
              <td className="px-4 py-2 border-b">{criterion.propertyValue}</td>
              <td className="px-4 py-2 border-b">
                {criterion.match ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-red-600">✗</span>
                )}
              </td>
              <td className="px-4 py-2 border-b">
                {criterion.weight ? `${criterion.weight}%` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CriteriaTable; 