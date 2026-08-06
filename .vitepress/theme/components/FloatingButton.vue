<template>
  <!-- 注意：这里的 /Notes/ 是你的仓库名，确保路径对齐 -->
  <a href="/Notes/write" class="floating-btn">
    ✍️ 写笔记
  </a>
</template>

<style scoped>
.floating-btn {
  position: fixed;
  top: 12px;
  right: 15px;
  background-color: #10b981;
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  text-decoration: none;
  font-weight: bold;
  font-size: 14px;
  z-index: 999999; /* 无限拔高层级，绝不会被导航栏遮挡 */
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: transform 0.1s;
}

.floating-btn:active {
  transform: scale(0.95);
}
</style>
