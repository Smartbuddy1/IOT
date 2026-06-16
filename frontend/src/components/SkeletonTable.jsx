import React from 'react';

const SkeletonTable = ({ columns = 4, rows = 5 }) => {
  return (
    <div className="table-responsive glass-panel animate-entrance" style={{ opacity: 0.7 }}>
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={`th-${i}`}>
                <div className="skeleton-box" style={{ height: '16px', width: '60%' }}></div>
              </th>
            ))}
            <th style={{ width: '100px' }}>
              <div className="skeleton-box" style={{ height: '16px', width: '80%' }}></div>
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={`tr-${rowIndex}`}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={`td-${rowIndex}-${colIndex}`}>
                  <div className="skeleton-box" style={{ height: '16px', width: colIndex === 0 ? '80%' : '50%' }}></div>
                </td>
              ))}
              <td>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div className="skeleton-box" style={{ height: '32px', width: '32px', borderRadius: '6px' }}></div>
                  <div className="skeleton-box" style={{ height: '32px', width: '32px', borderRadius: '6px' }}></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SkeletonTable;
