import { api } from '../../../core/api';

const EXPENSES_URL = '/expenses';

export const fetchExpenses = async () => {
    const response = await api.get(EXPENSES_URL);
    return response.data;
};

export const createExpense = async (expenseData: Record<string, any>) => {
    const response = await api.post(EXPENSES_URL, expenseData);
    return response.data;
};
