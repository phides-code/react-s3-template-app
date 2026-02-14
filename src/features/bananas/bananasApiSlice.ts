import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Banana } from '../../types';

interface BananasApiResponse {
    data: Banana[] | null;
    errorMessage: string | null;
}

interface BananaApiResponse {
    data: Banana | null;
    errorMessage: string | null;
}

const PATH = 'bananas';

export const bananasApiSlice = createApi({
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_BANANAS_SERVICE_URL as string,
    }),
    reducerPath: `${PATH}Api`,
    endpoints: (build) => ({
        getBananas: build.query<BananasApiResponse, void>({
            query: () => ({
                url: PATH,
                method: 'GET',
            }),
        }),
        getBananaById: build.query<BananaApiResponse, string>({
            query: (id) => ({
                url: `${PATH}/${id}`,
                method: 'GET',
            }),
        }),
        postBanana: build.mutation<BananaApiResponse, Partial<Banana>>({
            query: (newBanana) => ({
                url: PATH,
                method: 'POST',
                body: newBanana,
            }),
        }),
        deleteBanana: build.mutation<BananaApiResponse, string>({
            query: (id) => ({
                url: `${PATH}/${id}`,
                method: 'DELETE',
            }),
        }),
        putBanana: build.mutation<BananaApiResponse, Partial<Banana>>({
            query: (updatedBanana) => ({
                url: `${PATH}/${updatedBanana.id}`,
                method: 'PUT',
                body: updatedBanana,
            }),
        }),
    }),
});

export const {
    useGetBananasQuery,
    useGetBananaByIdQuery,
    usePostBananaMutation,
    useDeleteBananaMutation,
    usePutBananaMutation,
} = bananasApiSlice;
