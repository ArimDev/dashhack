<template>
    <details open class="rounded-xl border border-gray-200 p-4 dark:border-gray-600">
        <summary class="cursor-pointer font-semibold">Set up the GitHub App</summary>
        <ol class="mt-4 list-decimal space-y-4 pl-5 text-sm">
            <li>
                <a :href="setup.registrationUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center font-semibold text-bluey-600 underline dark:text-bluey-400">Register App for {{ organization }}</a>
                <p>Use an organization owner account. The form selects Contents, Metadata and Members read-only; leave webhooks and user authorization during installation off.</p>
                <label class="mt-3 block">User authorization callback URL
                    <input :value="setup.callbackUrl" readonly @focus="$event.target.select()" class="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-transparent px-3 dark:border-gray-600" />
                </label>
            </li>
            <li>
                <p>Copy the App ID, Client ID and App slug (the name after github.com/apps/). Generate a client secret and a private key on GitHub, then enter them in the DashHack service's Railway Variables.</p>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Use the private key's full PEM contents, including BEGIN/END lines. Keep the secret and key in Railway; they are not entered in DashHack.</p>
                <ul class="mt-2 space-y-1" aria-label="GitHub App server configuration">
                    <li v-for="variable in variables" :key="variable" class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <code class="min-w-0 break-all text-xs">{{ variable }}</code>
                        <span class="text-xs" :class="missingVariables.includes(variable) ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-400'">{{ missingVariables.includes(variable) ? 'Missing' : 'Set' }}</span>
                    </li>
                </ul>
                <label class="mt-3 block">Base URL for Railway
                    <input :value="setup.baseUrl" readonly @focus="$event.target.select()" class="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-transparent px-3 dark:border-gray-600" />
                </label>
                <p class="mt-2">Apply the variables and redeploy in Railway, then refresh this page.</p>
            </li>
            <li>Choose Install / configure App, install on the event organization and grant all 15 team repositories. Then choose Connect GitHub, authorize as an organization owner and select the organization. Add/Edit Team → Choose GitHub repository links each team to its repository.</li>
        </ol>
    </details>
</template>
<script setup>
import { GITHUB_EVENT_ORGANIZATION, GITHUB_APP_VARIABLES, githubAppRegistration } from '../../../shared/githubAppSetup.js';
defineProps({ missingVariables: { type: Array, default: () => [] } });
const organization = GITHUB_EVENT_ORGANIZATION;
const variables = Object.values(GITHUB_APP_VARIABLES);
const setup = ref(githubAppRegistration('https://dashhack-production.up.railway.app'));
onMounted(() => { setup.value = githubAppRegistration(window.location.origin); });
</script>
