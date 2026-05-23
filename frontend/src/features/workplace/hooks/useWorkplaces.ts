import {useState, useEffect} from 'react';
import {Workplace} from '../types';
import {getWorkplaces} from '../services';

export const useWorkplaces = () => {
    const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchWorkplaces = async () => {
            try {
                setIsLoading(true);
                const data = await getWorkplaces();
                setWorkplaces(data);
                setIsLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error'));
                setIsLoading(false);
            }
        };

        fetchWorkplaces();
    }, []);

    return {workplaces, isLoading, error};
};
