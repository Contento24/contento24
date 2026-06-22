# Contento24
> 一个开源且隐私的24小时在线WebP2P聊天室

![未知迪克](./Contento24_full.jpg)

[测试聊天室](https://l.867678.xyz/contento24/)
## 🛠 如何自建服务器
> 警告：需要较新开发环境和3000端口（TCP 因为需要WS）以及老演员root用户
>
> 安装依赖（以debian sid版本为例）
```
apt update
apt install -y nodejs npm git sudo
# 为了避免版本不统一或者其他慢性病 这里以npm安装pnpm
npm install -g pnpm
pnpm -v # 有输出证明一切安好
```
> 克隆源码并安装依赖
```
git clone https://github.com/mokanove/contento24.git
cd contento24/
git pull
pnpm install
```
> 这个时候如果你有洁癖可以删掉npm和pnpm 他们的作用只是安装项目依赖 跑起来只依赖nodejs
```
npm uninstall -g pnpm
apt purge -y npm
```
> 将server.js配置为systemd服务
>
> 需注意要替换path_contento24字段为contento24源码所在目录 以及nodejs目录 这个默认的应该没问题 如果你的有出入请自行修改
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
> 更新源代码
```
# 确保您已经位于项目根目录
git pull
pnpm update
pnpm install
systemctl restart Contento24
```
## 🛜 使用Nginx反向代理（可以添加TLS）
> 需注意透传IP 否则显示的发送者IP可能不正确
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
## 🔧 如何开发
> 以ArchLinux为例
```
sudo pacman -Syyuu --needed git nodejs
# 直接安装Archlinux源中自带的pnpm将无法self-upgrade 需注意pnpm偶尔可能对npm有依赖关系
sudo corepack enable # 是的需要root权限
corepack prepare pnpm@latest
git clone git@github.com:mokanove/contento24.git
cd contento24
pnpm install
pnpm dev # 启动ws服务器
```
## 🙏 特别鸣谢
[MidQwerty](https://github.com/midqwerty-alt)
## ⚖️ 项目许可
> 此项目以GNU Affero General Public License v3.0或更新版本授权