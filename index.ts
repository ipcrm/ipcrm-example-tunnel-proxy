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

import {filesChangedSince, goal, GoalInvocation, PushListenerInvocation, pushTest, whenPushSatisfies} from "@atomist/sdm";
import {configure, configureSdm} from "@atomist/sdm-core";
import {configureClientFactories, ProxyAxiosHttpClientFactory} from "./lib/support/proxy/proxy";

/**
 * The main entry point into the SDM
 */
export const configuration = configure<{}>(async sdm => {
    const messageGoal = goal(
        {
            displayName: "Print a message",
        },
        async (goalInvocation: GoalInvocation) => {
            await goalInvocation.addressChannels("Way to update the README! 😍");
        });

    const modifiesReadme = pushTest(
        "modifiesReadme",
        async (pushListenerInvocation: PushListenerInvocation) => {
            const changedFiles = await filesChangedSince(pushListenerInvocation.project, pushListenerInvocation.push);
            if (changedFiles) {
                return changedFiles.includes("README.md");
            }
            return false;
        });

    sdm.withPushRules(
        whenPushSatisfies(modifiesReadme)
            .setGoals(messageGoal),
    );
}, {
    preProcessors: [
        async cfg => {
            cfg.http.client.factory = new ProxyAxiosHttpClientFactory();
            return cfg;
        },
    ],
    postProcessors: [
        /**
         * This is important setup! This defines the function that will be called
         * to configure your SDM with everything that you want it to do.
         *
         * Click into the first argument (the "machine" function) to personalize
         * your SDM.
         */
        configureClientFactories,
    ],
});
