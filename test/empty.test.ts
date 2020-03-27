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

import * as assert from "power-assert";
import {buildProxyConfig, parseProxyDetails} from "../lib/support/proxy/proxy";
describe("proxyTests", () => {
    describe("parseProxyDetails", () => {
        afterEach(() => {
            delete(process.env.https_proxy);
        });

        it("should extract detail for full url", () => {
            const result = parseProxyDetails("https://user:pass@fakeproxy.com:8081");
            assert.strictEqual(result[2], "https");
            assert.strictEqual(result[4], "user");
            assert.strictEqual(result[5], "pass");
            assert.strictEqual(result[6], "fakeproxy.com");
            assert.strictEqual(result[8], "8081");
        });
        it("should extract detail for partial url", () => {
            const result = parseProxyDetails("https://user:pass@fakeproxy.com:8081");
            assert.strictEqual(result[2], "https");
            assert.strictEqual(result[6], "fakeproxy.com");
            assert.strictEqual(result[8], "8081");
        });
        it("should extract detail for url missing protocol definition", () => {
            const result = parseProxyDetails("fakeproxy.com:8081");
            assert.strictEqual(result[6], "fakeproxy.com");
            assert.strictEqual(result[8], "8081");
        });
        it("should extract detail for full url less protocol", () => {
            const result = parseProxyDetails("user:pass@fakeproxy.com:8081");
            assert.strictEqual(result[4], "user");
            assert.strictEqual(result[5], "pass");
            assert.strictEqual(result[6], "fakeproxy.com");
            assert.strictEqual(result[8], "8081");
        });
    });
    describe("buildProxyConfig", () => {
        const config = {
            sdm: {
                proxy: {
                    host: "fakeproxy.com",
                    port: "8081",
                    protocol: "https",
                },
            },
        };
        afterEach(() => {
            delete(process.env.https_proxy);
        });

        it("should return all details when supplied a full URL", () => {
            const result = buildProxyConfig(config as any);
            assert.strictEqual(result.host, "fakeproxy.com");
            assert.strictEqual(result.port, 8081);
            assert.strictEqual(result.proxyAuth, "user:pass");
        });
        it("should not return auth details when supplied a partial URL", () => {
            const result = buildProxyConfig(config as any);
            assert.strictEqual(result.host, "fakeproxy.com");
            assert.strictEqual(result.port, 8081);
            assert.strictEqual(result.proxyAuth, undefined);
        });
        it("should return all details when supplied a full URL less protocol", () => {
            const result = buildProxyConfig(config as any);
            assert.strictEqual(result.host, "fakeproxy.com");
            assert.strictEqual(result.port, 8081);
            assert.strictEqual(result.proxyAuth, "user:pass");
        });
    });
});
