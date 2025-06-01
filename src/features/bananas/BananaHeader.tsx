import { Link } from 'react-router';

const BananaHeader = () => {
    return (
        <div>
            <div>
                <Link to='/'>Bananas</Link>
            </div>
            <div>
                <Link to='/add-banana'>Add Banana</Link>
            </div>
        </div>
    );
};
export default BananaHeader;
