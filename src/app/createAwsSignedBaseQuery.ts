import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { fetchAuthSession } from '@aws-amplify/auth';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-browser';

type AwsSignedBaseQueryArgs = {
    baseUrl: string;
};

type BaseQueryArgs = {
    url: string;
    method?: string;
    body?: unknown;
};

export function createAwsSignedBaseQuery({
    baseUrl,
}: AwsSignedBaseQueryArgs): BaseQueryFn<BaseQueryArgs> {
    const region = import.meta.env.VITE_AWS_REGION as string;

    return async ({ url, method = 'GET', body }) => {
        try {
            // Get AWS creds
            const session = await fetchAuthSession();
            const creds = session.credentials;

            if (!creds) {
                throw new Error('No AWS credentials available');
            }

            // Build request
            const target = new URL(url, baseUrl);

            const request = new HttpRequest({
                method,
                protocol: target.protocol,
                hostname: target.hostname,
                path: target.pathname + target.search,
                headers: {
                    'content-type': 'application/json',
                    host: target.host,
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            // Sign
            const signer = new SignatureV4({
                credentials: creds,
                region,
                service: 'execute-api',
                sha256: Sha256,
            });

            const signed = await signer.sign(request);

            // Send
            const response = await fetch(target.toString(), {
                method,
                headers: signed.headers as HeadersInit,
                body: signed.body as BodyInit,
            });

            // Parse
            const text = await response.text();
            const data =
                text && response.headers.get('content-type')?.includes('json')
                    ? JSON.parse(text)
                    : undefined;

            return response.ok
                ? { data }
                : { error: { status: response.status, data } };
        } catch (err) {
            return {
                error: {
                    status: 'FETCH_ERROR',
                    data: String(err),
                },
            };
        }
    };
}
