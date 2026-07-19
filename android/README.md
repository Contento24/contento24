# Contento24 Android

这是 Contento24 的独立 Android 客户端。应用使用专属的移动端频道界面，包含
刷新重连、在线状态、输入状态、昵称底部面板和自适应消息编辑器。界面文件随
APK 一起打包，WebSocket 连接固定指向 `wss://l.867678.xyz/contento24/`。

输入法适配使用 Android `adjustResize` 与网页 `VisualViewport` 双层同步。键盘
弹出时品牌区自动收起，外层界面不会滚动，只有消息列表保持独立滚动。

当前应用 ID：`xyz.contento24.app`。
