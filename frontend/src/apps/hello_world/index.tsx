import React, { useState } from 'react';

export const HelloWorldWidget = () => {
  const [count, setCount] = useState(0);
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-2">Hello World</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">A simple interactive demo tool.</p>
      <button 
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        onClick={() => setCount(c => c + 1)}
      >
        Clicked {count} times
      </button>
    </div>
  );
};
