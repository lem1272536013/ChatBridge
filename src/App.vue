<template>
  <div id="RouterBox">
    <router-view />
  </div>
</template>
<script setup>
import { getChatConfigByOrigin } from './config.js'

const urlParams = new URLSearchParams(window.location.search);
const chatConfig = getChatConfigByOrigin(urlParams.get('origin'));

if (urlParams.get('userID')) {
  localStorage.setItem('userID', urlParams.get('userID'));
}

sessionStorage.setItem('api_key', chatConfig.MAIN_AGENT_API_KEY);
sessionStorage.removeItem('token');
</script>
<style scoped lang="less">
#RouterBox {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
