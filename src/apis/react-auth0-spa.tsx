import React, { useState, useEffect, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import createAuth0Client, {
    PopupLoginOptions,
    RedirectLoginResult,
    getIdTokenClaimsOptions,
    IdToken,
    RedirectLoginOptions,
    GetTokenSilentlyOptions,
    GetTokenWithPopupOptions,
    LogoutOptions,
    Auth0ClientOptions,
} from '@auth0/auth0-spa-js';
import Auth0Client from '@auth0/auth0-spa-js/dist/typings/Auth0Client';

import {
    authSuccess,
    authGetToken,
    authGetCleanEarthProfile,
} from '../store/actions/actionAuth';

interface Auth0Context {
    isAuthenticated: boolean;
    user: any;
    loading: boolean;
    popupOpen: boolean;
    loginWithPopup(options: PopupLoginOptions): Promise<void>;
    handleRedirectCallback(): Promise<RedirectLoginResult>;
    getIdTokenClaims(o?: getIdTokenClaimsOptions): Promise<IdToken>;
    loginWithRedirect(o: RedirectLoginOptions): Promise<void>;
    getTokenSilently(o?: GetTokenSilentlyOptions): Promise<string | undefined>;
    getTokenWithPopup(o?: GetTokenWithPopupOptions): Promise<string | undefined>;
    logout(o?: LogoutOptions): void;
}

interface Auth0ProviderOptions {
    children: React.ReactElement;
    onRedirectCallback?(result: RedirectLoginResult): void;
}

const DEFAULT_REDIRECT_CALLBACK = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
};

export const Auth0Context = React.createContext<Auth0Context | null>(null);
export const useAuth0 = () => useContext(Auth0Context)!;

export const Auth0Provider = ({
    children,
    onRedirectCallback = DEFAULT_REDIRECT_CALLBACK,
    ...initOptions
}: Auth0ProviderOptions & Auth0ClientOptions) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState();
    const [auth0Client, setAuth0] = useState<Auth0Client>();
    const [loading, setLoading] = useState(true);
    const [popupOpen, setPopupOpen] = useState(false);

    const [userToken, setUserToken] = useState('');

    const dispatch = useDispatch();
    useEffect(() => {
        const initAuth0 = async () => {
            const auth0FromHook = await createAuth0Client(initOptions);
            setAuth0(auth0FromHook);

            if (window.location.search.includes('code=')) {
                const { appState } = await auth0FromHook.handleRedirectCallback();
                onRedirectCallback(appState);
            }

            const isAuthenticated = await auth0FromHook.isAuthenticated();

            setIsAuthenticated(isAuthenticated);

            if (isAuthenticated) {
                const user = await auth0FromHook.getUser();
                const claims = await auth0FromHook.getIdTokenClaims();
                const token = claims.__raw;

                setUserToken(token);
                dispatch(authGetToken(token));
                dispatch(authSuccess(user));
                setUser(user);
            }

            setLoading(false);
        };
        initAuth0();
    }, []);

    if (userToken !== '') {
        dispatch(authGetCleanEarthProfile(userToken));
    }

    const loginWithPopup = async (o: PopupLoginOptions) => {
        setPopupOpen(true);
        try {
            await auth0Client!.loginWithPopup(o);
        } catch (error) {
            console.error(error);
        } finally {
            setPopupOpen(false);
        }
        const user = await auth0Client!.getUser();
        setUser(user);
        setIsAuthenticated(true);
    };

    const handleRedirectCallback = async () => {
        setLoading(true);
        const result = await auth0Client!.handleRedirectCallback();
        const user = await auth0Client!.getUser();
        setLoading(false);
        setIsAuthenticated(true);
        setUser(user);
        return result;
    };
    return (
        <Auth0Context.Provider
            value={{
                isAuthenticated,
                user,
                loading,
                popupOpen,
                loginWithPopup,
                handleRedirectCallback,
                getIdTokenClaims: (o: getIdTokenClaimsOptions | undefined) =>
                    auth0Client!.getIdTokenClaims(o),
                loginWithRedirect: (o: RedirectLoginOptions) =>
                    auth0Client!.loginWithRedirect(o),
                getTokenSilently: (o: GetTokenSilentlyOptions | undefined) =>
                    auth0Client!.getTokenSilently(o),
                getTokenWithPopup: (o: GetTokenWithPopupOptions | undefined) =>
                    auth0Client!.getTokenWithPopup(o),
                logout: (o: LogoutOptions | undefined) => auth0Client!.logout(o),
            }}
        >
            {children}
        </Auth0Context.Provider>
    );
};
