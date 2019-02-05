/*
 * Copyright © 2018 Atomist, Inc.
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
    ApolloGraphClientFactory,
    AxiosHttpClient,
    Configuration, configurationValue,
    HttpClient,
    HttpClientFactory,
    WSWebSocketFactory,
} from "@atomist/automation-client";
import { SoftwareDeliveryMachineOptions } from "@atomist/sdm";
import {
    ConfigureOptions,
    configureSdm,
} from "@atomist/sdm-core";
import axios, { AxiosRequestConfig } from "axios";
// @ts-ignore
import { buildAxiosFetch } from "axios-fetch";
import * as tunneling from "tunnel";
import * as WebSocket from "ws";
import { machine } from "./lib/machine/machine";

function getProxyConfig(): tunneling.HttpsOverHttpOptions["proxy"] {
    return configurationValue<tunneling.HttpsOverHttpOptions["proxy"]>("sdm.proxy");
};

const machineOptions: ConfigureOptions = {
    requiredConfigurationValues: [],
};

class ProxyAxiosHttpClientFactory implements HttpClientFactory {

    public create(url?: string): HttpClient {
        return new ProxyAxiosHttpClient();
    }
}

function createAxiosRequestConfig(config: AxiosRequestConfig): AxiosRequestConfig {
    const tunnel = tunneling.httpsOverHttp({
        proxy: getProxyConfig(),
    });

    return {
        ...config,
        httpsAgent: tunnel,
        proxy: false,
    };
}

class ProxyAxiosHttpClient extends AxiosHttpClient {

    protected configureOptions(config: AxiosRequestConfig): AxiosRequestConfig {
        return createAxiosRequestConfig(config);
    }
}

class ProxyWSWebSocketFactory extends WSWebSocketFactory {

    protected configureOptions(options: WebSocket.ClientOptions): WebSocket.ClientOptions {
        const tunnel = tunneling.httpsOverHttp({
            proxy: getProxyConfig(),
        });

        return {
            ...options,
            agent: tunnel,
        };
    }
}

class ProxyApolloGraphClientFactory extends ApolloGraphClientFactory {

    protected configure(config: Configuration): GlobalFetch["fetch"] {
        return buildAxiosFetch(axios.create(createAxiosRequestConfig({})));
    }
}

export const configuration: Configuration & Partial<SoftwareDeliveryMachineOptions> = {
    postProcessors: [
        configureSdm(machine, machineOptions),
        async (config: Configuration) => {
            config.http.client.factory = new ProxyAxiosHttpClientFactory();
            config.ws.client.factory = new ProxyWSWebSocketFactory();
            config.graphql.client.factory = new ProxyApolloGraphClientFactory();
            return config;
        },
    ],
};
