import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import BananaHeader from './BananaHeader';
import ListBananas from './ListBananas';
import ViewBanana from './ViewBanana';
import AddBanana from './AddBanana';

const Bananas = () => {
    const [showSuccess, setShowSuccess] = useState(false);
    return (
        <div>
            <BrowserRouter>
                <BananaHeader />
                <Routes>
                    <Route path='/' element={<ListBananas />} />
                    <Route path='/:bananaId' element={<ViewBanana />} />
                    <Route
                        path='/add-banana'
                        element={<AddBanana setShowSuccess={setShowSuccess} />}
                    />
                </Routes>
            </BrowserRouter>
            {showSuccess && (
                <div>
                    <h2>Banana added successfully!</h2>
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
export default Bananas;
