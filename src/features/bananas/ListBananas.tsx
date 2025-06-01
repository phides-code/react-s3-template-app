import BananaListItem from './BananaListItem';
import { useGetBananasQuery } from './bananasApiSlice';

const ListBananas = () => {
    const { data, isError, isLoading } = useGetBananasQuery();

    if (isLoading) {
        return <div>Loading...</div>;
    }
    if (isError) {
        return <div>Error loading bananas.</div>;
    }

    const bananas = data?.data ?? [];
    if (bananas.length === 0) {
        return <div>No bananas found.</div>;
    }

    return (
        <div>
            <h1>Bananas List</h1>
            <ul>
                {bananas.map((banana) => (
                    <BananaListItem key={banana.id} banana={banana} />
                ))}
            </ul>
        </div>
    );
};

export default ListBananas;
