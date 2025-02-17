<template>
  <div class="font-sans flex min-h-screen bg-white dark:bg-gray-900 flex-col">
    <div class="m-auto">
      <div class="p-6">
        <h1 class="font-extrabold text-bluey-500 text-9xl text-center">dashhack</h1>
        <h2 class="font-bold text-black text-6xl text-center">Hackathon Monitoring</h2>
      </div>
      <div class="pt-10 flex items-center flex-col">
        <div class="flex gap-10">
          <input type="username" placeholder="Event Name" class="text-xl rounded-lg bg-zinc-300 w-72 h-16 text-zinc-800 placeholder-zinc-800 text-center font-bold py-2 px-4" />
          <input type="password" placeholder="Password" class="text-xl rounded-lg bg-zinc-300 w-72 h-16 text-zinc-800 placeholder-zinc-800 text-center font-bold py-2 px-4" />
        </div>
        <button class="text-xl font-bold mt-10 rounded-full bg-bluey-500 text-white rounded w-72 h-16">Open Dashboard</button>
      </div>
    </div>

    <div class="pb-16 text-black text-center font-mono">
      <div class="flex gap-5 justify-center underline">
        <a href="">Privacy Policy</a>
        <a href="">Terms of Use</a>
      </div>
      <div>
        &copy; 2025 ArimDev
      </div>
    </div>
  </div>
</template>