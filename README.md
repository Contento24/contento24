# Contento24
> 一个开源且隐私的24小时在线WebP2P聊天室

[测试聊天室](https://l.867678.xyz/contento24/)
## 🛠 如何自建服务器
> 警告：需要较新开发环境和3000端口（TCP 因为需要WS）
>
> 安装依赖（以debian sid版本为例）
```
apt update
apt install -y nodejs pnpm git
```
> 克隆源码并初始化
```
git clone https://github.com/mokanove/contento24.git
cd contento24/
git checkout server
git pull
pnpm install
```
> 将server.js配置为systemd服务
```
cat <<'EOF'> /usr/lib/systemd/system/Contento24.service
[Unit]
Description=Contento24 Server.js Service
Documentation=https://867678.xyz/doc/Contento24
After=network.target

[Service]
Type=simple
WorkingDirectory=path_contento24
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
```
> 重载systemd并启动服务
```
sudo systemctl daemon-reload
sudo systemctl start Contento24.service
# 可选 设置为开机自启动
sudo systemctl enable Contento24.service
# 可选 查看服务状态
sudo systemctl status Contento24.service
```
## 🔧 如何开发
> 以ArchLinux为例
```
sudo pacman -Syyuu git pnpm nodejs
git clone git@github.com:mokanove/contento24.git
cd contento24
pnpm install
pnpm server # 或下方命令 这条命令最终会执行下面那条
node ./server.js # 启动ws服务器 他和上面那条命令是一样的
```
## 使用Nginx反向代理（可以添加TLS）
```
location /contento24/ {
    proxy_pass http://127.0.0.1:3000/; # 或者其他端口和服务器
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
## 特别鸣谢
[MidQwerty](https://github.com/midqwerty-alt)
## 项目许可
> 此项目以GNU Affero General Public License v3.0或更新版本授权