const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');

// 端口定义
const PORT = 3000;

// 1. 创建 HTTP 服务器
const httpServer = http.createServer((req, res) => {
    // 无论访问什么路径，全部返回 index.html 聊天页面
    fs.readFile('index.html', (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading index.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
    });
});

// 2. 建立 WebSocket 服务
const wss = new WebSocket.Server({ server: httpServer });

// 辅助函数：清洗和格式化原生 IP 地址
function formatIP(ip) {
    if (!ip) return '未知IP';
    // 移除 Node.js 默认对 IPv4 映射的 ::ffff: 前缀
    if (ip.startsWith('::ffff:')) {
        return `[IPv4] ${ip.substring(7)}`;
    }
    if (ip === '::1') {
        return '[IPv6] 本地回环(localhost)';
    }
    // 包含冒号则是标准的 IPv6 地址
    if (ip.includes(':')) {
        return `[IPv6] ${ip}`;
    }
    return `[IPv4] ${ip}`;
}

// 监听客户端连接
wss.on('connection', (ws, req) => {
    // 获取客户端的公网/局域网真实的远程 IP
    const clientIP = formatIP(req.socket.remoteAddress);
    console.log(`\n[系统连接] 新设备加入！来源: ${clientIP}`);

    // 当收到某台设备发来的消息时
    ws.on('message', (message) => {
        try {
            // 解析前端发来的 JSON 数据包
            const parsedData = JSON.parse(message);
            const nickname = parsedData.nickname || '匿名极客';
            const text = parsedData.text || '';

            if (!text.trim()) return;

            // 构造统一的广播消息数据包
            const broadcastPayload = JSON.stringify({
                nickname: nickname,
                text: text,
                ip: clientIP,
                time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            });

            console.log(`[消息] ${nickname}(${clientIP}): ${text}`);

            // 核心：把包装好的消息群发给当前【所有】在线的浏览器
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(broadcastPayload);
                }
            });
        } catch (err) {
            console.error('解析消息失败:', err);
        }
    });

    ws.on('close', () => {
        console.log(`[系统断开] 设备离开: ${clientIP}`);
    });
});

// 3. 核心精髓：监听 '::' 意味着同时接收局域网 IPv4 和外网公网 IPv6 的流量
httpServer.listen(PORT, '::', () => {
    console.log(`=================================================`);
    console.log(`🚀 家庭光明网全双工聊天室已成功发射！`);
    console.log(`PORT: ${PORT}`);
    console.log(`内部测试 (Mac本地): http://localhost:${PORT}`);
    console.log(`局域网/外网测试: 请直接通过你的 [IPv4] 或 [IPv6] 地址/域名访问`);
    console.log(`=================================================`);
});
