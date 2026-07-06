import React from 'react';

export const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
    <div className="text-4xl mb-4">📊</div>
    <p className="text-gray-500 text-center">{message}</p>
    <p className="text-gray-400 text-sm mt-2">Complete assessments to see your data</p>
  </div>
);