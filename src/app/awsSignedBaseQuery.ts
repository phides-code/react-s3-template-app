// awsSignedBaseQuery.ts
/**
 * Custom baseQuery for RTK Query that signs requests with AWS Signature V4
 * using Cognito Identity credentials. This implementation includes:
 * - Automatic credential refresh
 * - Request retries with exponential backoff
 * - Timeout handling
 * - Error handling with specific error messages
 */

import type {
    BaseQueryFn,
    FetchArgs,
    FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-browser';
import { FetchHttpHandler } from '@aws-sdk/fetch-http-handler';
import {
    CognitoIdentityClient,
    GetIdCommand,
    GetCredentialsForIdentityCommand,
} from '@aws-sdk/client-cognito-identity';

/**
 * Interface for caching AWS credentials to minimize Cognito API calls
 * Stores temporary credentials and their expiration time
 */
interface CachedCredentials {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    expiration: number; // Timestamp in milliseconds
}

/**
 * Configuration options for the AWS signed base query
 * @property baseUrl - Base URL for API requests
 * @property region - AWS region for the API and Cognito Identity Pool
 * @property identityPoolId - Cognito Identity Pool ID for authentication
 * @property service - AWS service name (default: 'execute-api')
 * @property timeout - Request timeout in milliseconds (default: 30000)
 * @property maxRetries - Maximum number of retry attempts (default: 3)
 */
interface AwsSignedBaseQueryOptions {
    baseUrl: string;
    region: string;
    identityPoolId: string;
    service?: string;
    timeout?: number;
    maxRetries?: number;
}

/**
 * Factory function to create a baseQuery that signs requests with AWS credentials
 * This function returns an RTK Query baseQuery that automatically:
 * 1. Obtains AWS credentials from Cognito Identity Pool
 * 2. Signs requests using AWS Signature V4
 * 3. Handles retries, timeouts, and error cases
 *
 * @param options - Configuration options for the signed base query
 * @returns A configured baseQuery function for RTK Query
 */
export const createAwsSignedBaseQuery = ({
    baseUrl,
    region,
    identityPoolId,
    service = 'execute-api',
    timeout = 30000,
    maxRetries = 3,
}: AwsSignedBaseQueryOptions): BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> => {
    // Cache credentials to avoid unnecessary Cognito calls
    let cachedCredentials: CachedCredentials | null = null;

    /**
     * Helper to get (and cache) AWS credentials from Cognito Identity Pool
     * @param forceRefresh - Force refresh credentials even if they're not expired
     * @returns Promise resolving to valid AWS credentials
     */
    async function getCredentials(
        forceRefresh = false
    ): Promise<CachedCredentials> {
        // If force refresh or no credentials or credentials are expiring soon, fetch new ones
        if (
            forceRefresh ||
            !cachedCredentials ||
            Date.now() > cachedCredentials.expiration - 60 * 1000 // refresh 1 min before expiration
        ) {
            try {
                const identityClient = new CognitoIdentityClient({ region });
                // Get the Cognito Identity ID
                const { IdentityId } = await identityClient.send(
                    new GetIdCommand({ IdentityPoolId: identityPoolId })
                );

                if (!IdentityId) {
                    throw new Error('Failed to retrieve Identity ID');
                }

                // Get temporary AWS credentials for the identity
                const { Credentials } = await identityClient.send(
                    new GetCredentialsForIdentityCommand({ IdentityId })
                );

                if (
                    !Credentials?.AccessKeyId ||
                    !Credentials?.SecretKey ||
                    !Credentials?.SessionToken
                ) {
                    throw new Error('Failed to retrieve AWS credentials');
                }

                // Cache the credentials and their expiration
                // Default to 1 hour from now if no expiration is provided
                cachedCredentials = {
                    accessKeyId: Credentials.AccessKeyId,
                    secretAccessKey: Credentials.SecretKey,
                    sessionToken: Credentials.SessionToken,
                    expiration: new Date(
                        Credentials.Expiration ?? Date.now() + 3600 * 1000
                    ).getTime(),
                };
            } catch (error) {
                console.error('Error fetching AWS credentials:', error);
                throw new Error(
                    `AWS credential error: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        return cachedCredentials;
    }

    /**
     * The actual baseQuery function used by RTK Query
     * Handles request signing, sending, and processing responses
     * Implements retry logic for transient failures
     */
    return async (args) => {
        let retries = 0;
        let lastError: unknown = null;

        // Retry logic for handling transient failures
        // Will attempt up to maxRetries times with exponential backoff
        while (retries <= maxRetries) {
            try {
                // Parse args into url, method, body and headers
                // RTK Query can pass args as a string (just the URL) or as an object with options
                const {
                    url,
                    method = 'GET',
                    body = undefined,
                    headers = {},
                } = typeof args === 'string' ? { url: args } : args;

                // Build the full request URL
                const target = new URL(url, baseUrl);

                // Parse query string into an object for AWS SigV4
                const queryParams: Record<string, string> = {};
                target.searchParams.forEach((value, key) => {
                    queryParams[key] = value;
                });

                // Get valid AWS credentials
                // Force refresh credentials on retry attempts to handle expired credentials
                const creds = await getCredentials(retries > 0);

                // Create a SignatureV4 signer for the specified AWS service
                // This handles the AWS SigV4 signing process required for authenticated API calls
                const signer = new SignatureV4({
                    service,
                    region,
                    credentials: {
                        accessKeyId: creds.accessKeyId,
                        secretAccessKey: creds.secretAccessKey,
                        sessionToken: creds.sessionToken,
                    },
                    sha256: Sha256, // Required crypto implementation
                });

                // Prepare the body if it exists
                const jsonBody = body ? JSON.stringify(body) : undefined;

                // Prepare headers with content-type and content-length for requests with body
                // Convert Headers instance to plain object if necessary
                // AWS SigV4 requires headers to be in a specific format
                const normalizedHeaders: Record<string, string> =
                    headers instanceof Headers
                        ? Object.fromEntries(
                              // Convert Headers object to plain object
                              Array.from(headers.entries()).map(([k, v]) => [
                                  k,
                                  String(v),
                              ])
                          )
                        : Object.fromEntries(
                              // Ensure all header values are strings
                              Object.entries(headers).map(([k, v]) => [
                                  k,
                                  String(v),
                              ])
                          );

                // Combine default headers with user-provided headers
                const requestHeaders: Record<string, string> = {
                    host: target.hostname, // Required for AWS SigV4
                    'content-type': 'application/json',
                    ...normalizedHeaders,
                };

                // Add content-length header for requests with body
                // This is important for proper request signing
                if (jsonBody) {
                    requestHeaders['content-length'] =
                        jsonBody.length.toString();
                }

                // Sign the request using AWS Signature V4
                const signedRequest = await signer.sign({
                    method,
                    protocol: target.protocol,
                    hostname: target.hostname,
                    path: target.pathname,
                    query: queryParams,
                    body: jsonBody,
                    headers: requestHeaders,
                });

                // Dynamically import ProtocolHttpRequest for compatibility
                const { HttpRequest: ProtocolHttpRequest } = await import(
                    '@aws-sdk/protocol-http'
                );

                // Create a ProtocolHttpRequest from the signed request
                const protocolHttpRequest = new ProtocolHttpRequest({
                    ...signedRequest,
                    headers: signedRequest.headers,
                    body: signedRequest.body,
                });

                // Create an AbortController for timeout handling
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    controller.abort();
                }, timeout);

                try {
                    // Send the request using FetchHttpHandler with timeout
                    const handler = new FetchHttpHandler({
                        requestTimeout: timeout,
                    });

                    // Override the hostname to ensure port is preserved
                    protocolHttpRequest.hostname = target.hostname;
                    protocolHttpRequest.port = parseInt(target.port, 10);
                    protocolHttpRequest.protocol = target.protocol;

                    const { response } =
                        await handler.handle(protocolHttpRequest);

                    // Clear the timeout
                    clearTimeout(timeoutId);

                    // Read the response body as text and parse as JSON
                    const text = response.body
                        ? await new Response(response.body).text()
                        : '';
                    const data = text ? JSON.parse(text) : null;

                    // If the response is not 2xx, return an error
                    if (
                        response.statusCode < 200 ||
                        response.statusCode >= 300
                    ) {
                        // Check for credential errors that might require a retry
                        if (
                            response.statusCode === 403 &&
                            retries < maxRetries
                        ) {
                            retries++;
                            lastError = { status: response.statusCode, data };
                            continue; // Retry with fresh credentials
                        }

                        return {
                            error: {
                                status: response.statusCode,
                                data,
                            } as FetchBaseQueryError,
                        };
                    }

                    // Return the data and meta info for successful responses
                    return {
                        data,
                        meta: response,
                    };
                } catch (fetchError) {
                    // Clear the timeout if there was an error
                    clearTimeout(timeoutId);
                    throw fetchError;
                }
            } catch (error) {
                lastError = error;

                // Check if we should retry based on the error type
                // We retry on timeouts, network errors, credential errors, and token expiration
                if (
                    retries < maxRetries &&
                    ((typeof error === 'object' &&
                        error !== null &&
                        'name' in error &&
                        (error as { name: string }).name === 'AbortError') || // Timeout errors
                        (typeof error === 'object' &&
                            error !== null &&
                            'message' in error &&
                            typeof (error as { message: string }).message ===
                                'string' &&
                            ((error as { message: string }).message.includes(
                                'network'
                            ) || // Network connectivity issues
                                (error as { message: string }).message.includes(
                                    'credential'
                                ) || // AWS credential problems
                                (error as { message: string }).message.includes(
                                    'expired'
                                )))) // Token expiration issues
                ) {
                    retries++;
                    // Implement exponential backoff with jitter to prevent thundering herd
                    // Each retry waits longer (2^retries * 100ms) with some randomness added
                    // Capped at 2 seconds maximum delay
                    const delay = Math.min(
                        Math.pow(2, retries) * 100 + Math.random() * 100,
                        2000
                    );
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue; // Try again with the retry logic
                }

                // Return the error after all retries are exhausted or if it's not a retryable error
                return {
                    error: {
                        status: 'FETCH_ERROR' as const,
                        error:
                            typeof error === 'object' &&
                            error !== null &&
                            'message' in error
                                ? (error as { message: string }).message
                                : error?.toString(),
                    } as FetchBaseQueryError,
                };
            }
        }

        // This should only be reached if all retries failed
        // Return a standardized error format compatible with RTK Query
        return {
            error: {
                status: 'FETCH_ERROR' as const,
                error:
                    (typeof lastError === 'object' &&
                    lastError !== null &&
                    'message' in lastError
                        ? (lastError as { message?: string }).message
                        : undefined) ?? 'Request failed after multiple retries',
            } as FetchBaseQueryError,
        };
    };
};
