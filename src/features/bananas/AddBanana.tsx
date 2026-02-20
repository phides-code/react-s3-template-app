import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGetBananasQuery, usePostBananaMutation } from './bananasApiSlice';

interface AddBananaProps {
    setShowSuccess: React.Dispatch<React.SetStateAction<boolean>>;
}

const AddBanana = ({ setShowSuccess }: AddBananaProps) => {
    const navigate = useNavigate();

    const [newBanana, setNewBanana] = useState({
        content: '',
    });

    const [postBanana, { isLoading: isPostLoading, isError }] =
        usePostBananaMutation();
    const { refetch, isFetching: isGetFetching } = useGetBananasQuery();

    const isLoading = isPostLoading || isGetFetching;
    const submitDisabled = isLoading || !newBanana.content;
    const cancelDisabled = isLoading;

    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewBanana({ ...newBanana, content: e.target.value });
    };

    const handleCancel = () => {
        void navigate('/');
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log('Adding new Banana:', newBanana);

        try {
            const postResult = await postBanana(newBanana).unwrap();

            if (postResult.errorMessage) {
                throw new Error(postResult.errorMessage);
            }

            await refetch();
            setShowSuccess(true);
            navigate('/');
        } catch (error) {
            console.error('Error adding banana:', error);
        }
    };

    return (
        <div>
            <h1>Add Banana</h1>
            <p>Bananas are a great source of potassium!</p>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor='bananaContent'>Banana Content:</label>
                    <input
                        type='text'
                        id='bananaContent'
                        name='bananaContent'
                        required
                        placeholder='Enter banana content'
                        autoFocus
                        onChange={handleOnChange}
                        value={newBanana.content}
                        disabled={isLoading}
                    />
                </div>
                <button type='submit' disabled={submitDisabled}>
                    Add Banana
                </button>

                <button
                    type='button'
                    disabled={cancelDisabled}
                    onClick={handleCancel}
                >
                    Cancel
                </button>
                {isError && <p>Error adding banana. Please try again.</p>}
            </form>
        </div>
    );
};
export default AddBanana;
