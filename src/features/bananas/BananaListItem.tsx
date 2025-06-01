import { Link } from 'react-router';
import { useDeleteBananaMutation, useGetBananasQuery } from './bananasApiSlice';
import { useState } from 'react';
import type { Banana } from '../../types';

const BananaListItem = ({ banana }: { banana: Banana }) => {
    const [deleteBanana, { isLoading, isError }] = useDeleteBananaMutation();
    const { refetch, isFetching } = useGetBananasQuery();

    const [deletingThis, setDeletingThis] = useState(false);

    const handleDelete = async () => {
        console.log(`Deleting banana with id: ${banana.id}`);

        try {
            setDeletingThis(true);
            const deleteResult = await deleteBanana(banana.id).unwrap();

            if (deleteResult.errorMessage) {
                throw new Error(deleteResult.errorMessage);
            }

            await refetch();
        } catch (error) {
            console.error('Error deleting banana:', error);
        }
    };

    const disableDeleteButton = (isFetching || isLoading) && deletingThis;

    return (
        <li>
            <Link to={`/${banana.id}`}> {banana.content}</Link>
            <button disabled={disableDeleteButton} onClick={handleDelete}>
                Delete
            </button>
            {isError && <span>Error deleting banana.</span>}
        </li>
    );
};

export default BananaListItem;
