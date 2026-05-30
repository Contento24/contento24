const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const PORT = 3000;

const httpServer = http.createServer((req, res) => {
    let filePath = req.url === '/' ? 'index.html' : req.url.substring(1);
    filePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');

    const extname = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Not Found');
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

const wss = new WebSocket.Server({ 
    server: httpServer,
    verifyClient: (info, callback) => {
        const req = info.req;
        const rawIP = req.headers['x-forwarded-for'] 
                      || req.headers['x-real-ip'] 
                      || req.connection.remoteAddress;
        
        req.realClientIP = (rawIP && rawIP.includes(',')) ? rawIP.split(',')[0].trim() : rawIP;
        callback(true);
    }
});

function formatIP(ip) {
    if (!ip) return '未知IP';
    if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
        return '[IPv6] 本地回环(localhost)';
    }
    if (ip.startsWith('::ffff:')) {
        return `[IPv4] ${ip.substring(7)}`;
    }
    if (ip.includes(':')) {
        return `[IPv6] ${ip}`;
    }
    return `[IPv4] ${ip}`;
}

wss.on('connection', (ws, req) => {
    const finalIP = req.realClientIP || req.socket.remoteAddress;
    const clientIP = formatIP(finalIP);

    ws.on('message', (message) => {
        try {
            const parsedData = JSON.parse(message);
            const clientId = parsedData.clientId || '';
            const nickname = parsedData.nickname || '匿名迪克';
            const text = parsedData.text || '';

            if (!text.trim()) return;

            const broadcastPayload = JSON.stringify({
                clientId: clientId,
                nickname: nickname,
                text: text,
                ip: clientIP,
                time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            });

            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(broadcastPayload);
                }
            });
        } catch (err) {
            console.error(err);
        }
    });
});

httpServer.listen(PORT, '::', () => {
    console.log(`=================================================`);
    console.log(`🚀 世界光明网全双工聊天室已成功发射！`);
    console.log(`端口: ${PORT}`);
    console.log(`内网测试: http://localhost:${PORT}`);
    console.log(`外网测试: 请直接通过你的IP地址/域名:端口访问`);
    console.log(`=================================================`);
});