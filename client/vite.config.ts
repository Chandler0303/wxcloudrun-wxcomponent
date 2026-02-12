import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// 详细配置信息 https://vitejs.dev/config/
export default defineConfig({
    build: {
        // wxcomponent 为微管家使用路径前缀
        assetsDir: 'wxcomponent/assets'
    },
    plugins: [react()],
    css: {
        preprocessorOptions: {
            less: {
                modifyVars: {
                },
            },
        },
    },
    server: {
        host: true, // 允许通过 IP 访问，如 http://192.168.x.x:3000
        proxy: {
            '/api': {
                target: 'http://localhost:80',
                rewrite: path => path.replace(/^\/api/, ''),
                changeOrigin: true,
            }
        }
    }
})
