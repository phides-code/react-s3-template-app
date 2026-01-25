import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './components/App';
import { store } from './app/store';
import './index.css';

import { Amplify } from 'aws-amplify';

const identityPoolId = import.meta.env.VITE_IDENTITY_POOL_ID as string;

Amplify.configure({
    Auth: {
        Cognito: {
            identityPoolId,
            allowGuestAccess: true,
        },
    },
});

const container = document.getElementById('root');

if (container) {
    const root = createRoot(container);

    root.render(
        <StrictMode>
            <Provider store={store}>
                <App />
            </Provider>
        </StrictMode>,
    );
} else {
    throw new Error(
        "Root element with ID 'root' was not found in the document. Ensure there is a corresponding HTML element with the ID 'root' in your HTML file.",
    );
}
