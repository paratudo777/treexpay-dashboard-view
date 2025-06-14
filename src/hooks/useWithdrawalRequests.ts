
import { useState, useEffect } from 'react';
import { WithdrawalRequest } from '@/types/withdrawal';

const STORAGE_KEY = 'withdrawalRequests';

export const useWithdrawalRequests = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRequests(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing withdrawal requests:', error);
        setRequests([]);
      }
    }
  }, []);

  const saveRequests = (newRequests: WithdrawalRequest[]) => {
    setRequests(newRequests);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRequests));
  };

  const addRequest = (request: WithdrawalRequest) => {
    const newRequests = [...requests, request];
    saveRequests(newRequests);
  };

  const updateRequest = (id: string, updates: Partial<WithdrawalRequest>) => {
    const newRequests = requests.map(req => 
      req.id === id ? { ...req, ...updates, processedAt: new Date().toISOString() } : req
    );
    saveRequests(newRequests);
  };

  const getRequestById = (id: string) => {
    return requests.find(req => req.id === id);
  };

  const getRequestsByUser = (userId: string) => {
    return requests.filter(req => req.user === userId);
  };

  const getTodaysRequests = () => {
    const today = new Date().toDateString();
    return requests.filter(req => new Date(req.requestedAt).toDateString() === today);
  };

  return {
    requests,
    addRequest,
    updateRequest,
    getRequestById,
    getRequestsByUser,
    getTodaysRequests
  };
};
