# contento24
一个开源且隐私的24小时在线WebP2P聊天室

> 服务器版本 运行方法
>
> 需要先把npm nodejs git pm2都搬上来
```
git clone https://github.com/mokanove/contento24.git
cd contento24/
git checkout server
git pull
npm install
pm2 start server.js --name "contento24"
```
> 然后去nginx添加如下几行配置反向代理
```
        location /contento24/ {
            proxy_pass http://127.0.0.1:3000/;

            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
```