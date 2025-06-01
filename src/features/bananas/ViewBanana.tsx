import { useParams } from 'react-router';
import {
    useGetBananaByIdQuery,
    useGetBananasQuery,
    usePutBananaMutation,
} from './bananasApiSlice';
import { useState } from 'react';

const ViewBanana = () => {
    const { bananaId } = useParams<{ bananaId: string }>();

    const [editMode, setEditMode] = useState(false);
    const [updatedContent, setUpdatedContent] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const {
        data,
        isError: isQueryError,
        isLoading: isQueryLoading,
        isFetching: isQueryFetching,
        refetch: refetchQuery,
    } = useGetBananaByIdQuery(bananaId as string);
    const [putRecipe, { isLoading: isPutLoading, isError: isPutError }] =
        usePutBananaMutation();
    const { isFetching: isGetFetching, refetch: refetchGet } =
        useGetBananasQuery();

    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUpdatedContent(e.target.value);
    };

    const handleEdit = () => {
        setEditMode(true);
    };

    const handleCancel = () => {
        setEditMode(false);
    };

    const refetchQueryAndGet = async () => {
        await refetchQuery();
        await refetchGet();
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log('Updating Banana:', updatedContent);

        try {
            const putResult = await putRecipe({
                id: bananaId as string,
                content: updatedContent,
            }).unwrap();

            if (putResult.errorMessage) {
                throw new Error(putResult.errorMessage);
            }

            await refetchQueryAndGet();
            setShowSuccess(true);
            setEditMode(false);
        } catch (error) {
            console.error('Error adding banana:', error);
        }
    };

    if (isQueryLoading) {
        return <div>Loading...</div>;
    }
    if (isQueryError) {
        return <div>Error loading banana.</div>;
    }
    const banana = data?.data;
    if (!banana) {
        return <div>Banana not found.</div>;
    }

    const contentUnchanged = banana.content === updatedContent;
    const isLoading = isPutLoading || isQueryFetching || isGetFetching;
    const submitDisabled = isLoading || contentUnchanged || !updatedContent;
    const cancelDisabled = isLoading;

    return (
        <div>
            <h1>Banana Details</h1>
            <p>ID: {banana.id}</p>
            <p>Created At: {new Date(banana.createdOn).toLocaleString()}</p>

            {editMode ? (
                <div>
                    <form onSubmit={handleSubmit}>
                        <label htmlFor='bananaContent'>Content:</label>
                        <input
                            type='text'
                            id='bananaContent'
                            name='bananaContent'
                            defaultValue={banana.content}
                            required
                            onChange={handleOnChange}
                            disabled={isLoading}
                        />
                        <button type='submit' disabled={submitDisabled}>
                            Update Banana
                        </button>
                        <button
                            type='button'
                            disabled={cancelDisabled}
                            onClick={handleCancel}
                        >
                            Cancel
                        </button>
                        {isPutError && (
                            <p>Error updating banana. Please try again.</p>
                        )}
                    </form>
                </div>
            ) : (
                <div>
                    <p>Content: {banana.content}</p>
                    <button onClick={handleEdit}>Edit</button>
                </div>
            )}
            {showSuccess && (
                <div>
                    <h2>Banana updated successfully!</h2>
                    <button
                        onClick={() => {
                            setShowSuccess(false);
                        }}
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
};

export default ViewBanana;
