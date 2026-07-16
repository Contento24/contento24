![未知迪克](https://raw.githubusercontent.com/Contento24/contento24/refs/heads/main/resources/Contento24_full.jpg)

# Contento24

一个开源的实时公共 WebSocket 聊天室。消息只在在线用户之间广播，服务器不保存聊天记录，刷新页面后本地内容会消失。
[测试聊天室](https://l.867678.xyz/contento24/)

消歧义：项目本名`Contento24` 但为了方便管理 所有出现在URL Shell中的名称统一为`contento24`

## 🛠 如何自建服务器

> 警告：默认使用 3000 端口，也可以通过 `PORT` 环境变量修改。项目同时使用 HTTP 和 WebSocket。
>
> 安装依赖（以debian sid版本为例 需要root权限）

```
apt update
apt install -y nodejs git
curl -fsSL https://get.pnpm.io/install.sh | sh -
pnpm -v # 有输出证明一切安好
```

> 克隆源码并安装依赖

```
git clone https://github.com/contento24/contento24.git
cd contento24/
pnpm install
rm ./README.md ./LICENSE ./resources/Contento24_full.jpg ./resources/Contento24_old.svg
```

> 将server.js配置为systemd服务
>
> 需注意要替换path_contento24字段为contento24源码所在目录
>
> nodejs目录 这个默认的应该没问题 如果你的有出入请自行修改

```
cat <<'EOF'> /usr/lib/systemd/system/contento24.service
[Unit]
Description=Contento24 Server.js Service
Documentation=https://867678.xyz/project/contento24/
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
systemctl daemon-reload
systemctl start contento24.service
systemctl enable contento24.service # 可选 设置为开机自启
systemctl status contento24.service # 可选 查看服务状态
```

# 📚 以下是进阶教程

## 🛜 使用Nginx反向代理（可以添加TLS）

> 需注意透传IP 否则显示的发送者IP可能不正确
>
> 如果你使用别的IP或端口请替换下面`127.0.0.1:3000`指向正确的服务器和端口

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
git clone git@github.com:Contento24/contento24.git
cd contento24
pnpm install
pnpm dev # 启动ws服务器
```

可选环境变量：

- `PORT`：服务监听端口，默认为 `3000`。
- `ALLOWED_ORIGINS`：允许建立 WebSocket 连接的来源，多个来源使用英文逗号分隔；未设置时允许所有来源。

## 🙏 特别鸣谢

[MidQwerty](https://github.com/midqwerty-alt)
提供的想法

## ⚖️ 项目许可

> 此项目以GNU Affero General Public License v3.0或更高版本授权
>
> 详细请参阅LICENSE
