/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    ApolloGraphClientFactory, AutomationClient,
    AxiosHttpClient,
    Configuration,
    configurationValue,
    HttpClient,
    HttpClientFactory,
    logger,
    WSWebSocketFactory,
} from "@atomist/automation-client";
import {SoftwareDeliveryMachineConfiguration} from "@atomist/sdm";
import {Config} from "@atomist/sdm-local/lib/cli/invocation/command/generator/PackageJson";
/* tslint:disable:import-blacklist */
import axios, {AxiosRequestConfig} from "axios";
// @ts-ignore
import { buildAxiosFetch } from "axios-fetch";
import * as tunneling from "tunnel";
import * as WebSocket from "ws";

export const configureClientFactories = async (config: any) => {
    const proxy = isProxySet(config as unknown as Configuration & SoftwareDeliveryMachineConfiguration);
    if (proxy && isProxyTunneling(proxy)) {
        if (process.env.AXIOS_VERBOSE === "true") {
            config.http.client.factory = new LoggingAxiosHttpClientFactory();
        } else {
            config.http.client.factory = new ProxyAxiosHttpClientFactory();
        }
        config.ws.client.factory = new ProxyWSWebSocketFactory();
        config.graphql.client.factory = new ProxyApolloGraphClientFactory();
    }
    return config;
};

export function isProxySet(config: Configuration & SoftwareDeliveryMachineConfiguration): string {
    let proxyString: string;
    if (process.env.hasOwnProperty("https_proxy") || config.sdm.proxy.host) {
        proxyString = process.env.https_proxy || `${config.sdm.proxy.protocol}://${config.sdm.proxy.host}:${config.sdm.proxy.port}`;
    } else if (process.env.hasOwnProperty("HTTPS_PROXY")) {
        proxyString = process.env.HTTPS_PROXY || `${config.sdm.proxy.protocol}://${config.sdm.proxy.host}:${config.sdm.proxy.port}`;
    }

    if (!!proxyString && !proxyString.toLowerCase().startsWith("http")) {
        throw new Error("Supplied proxy string must include protocol!  Include http:// or https://");
    }
    return proxyString;
}

export function isProxyTunneling(proxy: string): boolean {
    return parseProxyDetails(proxy)[2].toLowerCase() === "http";
}

export function parseProxyDetails(proxy: string): RegExpExecArray {
    /**
     * Match groups
     * 1 - protocol (http/https)
     * 2 - user/pass (plus @)
     * 3 - user
     * 4 - pass
     * 5 - proxy host
     * 6 - :port
     * 7 - port
     */
    const parseProxy = /^((https?):\/\/)?(([^:]{1,128}):([^@]{1,256})@)?([^:\/]{1,255})(:([0-9]{1,5}))?\/?/;
    return parseProxy.exec(proxy);
}

export function buildProxyConfig(config: Configuration & SoftwareDeliveryMachineConfiguration): tunneling.ProxyOptions {
    logger.debug(`Tunneling Proxy detected, configuring`);
    const proxy = parseProxyDetails(isProxySet(config));

    let proxyDetails: tunneling.ProxyOptions = {
        host: proxy[6],
        headers: undefined,
    };

    if (proxy[7]) {
        proxyDetails = {
            ...proxyDetails,
            port: parseInt(proxy[8], undefined),
        };
    }

    if (proxy[3] && proxy[4]) {
        proxyDetails = {
            ...proxyDetails,
            proxyAuth: `${proxy[4]}:${proxy[5]}`,
        };
    }

    return proxyDetails;
}

export class ProxyAxiosHttpClientFactory implements HttpClientFactory {
    public create(url?: string): HttpClient {
        // Build a list of entries in no_proxy or NO_PROXY
        const noProxyRawList: string[] = [];
        if (process.env.hasOwnProperty("no_proxy")) {
            noProxyRawList.push(...process.env.no_proxy.split(","));
        }

        if (process.env.hasOwnProperty("NO_PROXY")) {
            noProxyRawList.push(...process.env.no_proxy.split(","));
        }

        // Unique and lower case list of no_proxy'd hosts
        const noProxyList = [...new Set(noProxyRawList.map(p => p.toLowerCase()))];
        logger.debug(`ProxyAxiosHttpClientFactory: NoProxyList => ${JSON.stringify(noProxyList)}`);

        // For each member of the no_proxy list, determine if our url includes the member and set found to true if it does
        let found: boolean;
        noProxyList.forEach(npl => {
            if (url.toLowerCase().includes(npl)) {
                found = true;
            }
        });

        // For found urls, return a standard AxiosHttpClient which will bypass the proxy
        if (found) {
            logger.debug(`ProxyAxiosHttpClientFactory: Found no-proxy url, bypassing proxy`);
            return new AxiosHttpClientNoProxy();
        } else {
            return new ProxyAxiosHttpClient();
        }
    }
}

export function createAxiosRequestConfig(config: AxiosRequestConfig): AxiosRequestConfig {
    const proxy = buildProxyConfig(configurationValue());
    const tunnel = tunneling.httpsOverHttp({
        proxy,
    });

    return {
        ...config,
        httpsAgent: tunnel,
        proxy: false,
    };
}

export class AxiosHttpClientNoProxy extends AxiosHttpClient {
    protected configureOptions(config: AxiosRequestConfig): AxiosRequestConfig {
        return {
            ...config,
            proxy: false,
        };
    }
}

export class ProxyAxiosHttpClient extends AxiosHttpClient {
    protected configureOptions(config: AxiosRequestConfig): AxiosRequestConfig {
        return createAxiosRequestConfig(config);
    }
}

export class ProxyWSWebSocketFactory extends WSWebSocketFactory {

    protected configureOptions(options: WebSocket.ClientOptions): WebSocket.ClientOptions {
        const proxy = buildProxyConfig(configurationValue());
        const tunnel = tunneling.httpsOverHttp({
            proxy,
        });

        return {
            ...options,
            agent: tunnel,
        };
    }
}

export class ProxyApolloGraphClientFactory extends ApolloGraphClientFactory {
    protected configure(config: Configuration): WindowOrWorkerGlobalScope["fetch"] {
        return buildAxiosFetch(axios.create(createAxiosRequestConfig({})));
    }
}

/**
 * This Logging factory prints verbose output of all calls made by Axios
 * Use for debugging only.
 */
export class LoggingAxiosHttpClientFactory extends ProxyAxiosHttpClientFactory {
    constructor() {
        super();
        axios.interceptors.request.use(request => {
            logger.debug(`Axios http request: ${request.method} ${request.url}`);
            return request;
        });
        axios.interceptors.response.use(response => {
            logger.debug(`Axios http response: ${response.config.method} ${response.config.url} ${response.status} ${response.statusText}`);
            return response;
        }, error => {
            if (!!error.response) {
                const response = error.response;
                logger.error(
                    `Axios http response: ${response.config.method} ${response.config.url} ${response.status} ${response.statusText}
                    < ${JSON.stringify(response.data)}`);
            } else {
                logger.error(`Axios http response: ${JSON.stringify(error)}`);
            }
            return error;
        });
    }
}
