# 课设工坊 CourseForge

工科课程设计计算与报告助手，浏览器静态工具版。支持任务书文字提取、参数核对、简支线弹性梁计算、结果图、本地知识检索、关键数值检查与可编辑 Word 导出。

## 使用

打开 GitHub Pages 网站或下载本仓库后打开 index.html。所有运行资源均包含在仓库中，没有第三方 CDN 依赖。

推荐流程：运行课设流程 → 计算与图表 → 报告检查 → 载入含错误测试稿 → 检查 → 报告导出。

## 资料处理

课程任务、参数和报告在当前浏览器页面中处理。页面不包含上传接口、外部模型、用户账户或遥测 SDK。刷新会清空会话，需要保留时主动保存项目。静态网站托管服务仍可能记录网页资源请求信息；这与课程资料上传不同。

支持 TXT、Markdown 和无宏 DOCX，单文件最大 2MB。DOCX 只提取文字，不复刻原始模板，也不处理扫描件或图片公式。

## 计算范围

简支、等截面、小变形线弹性梁，全跨向下均布荷载与一个向下集中力。输入 L、q、P、a、E、b、h 的单位为 m、kN/m、kN、m、GPa、mm、mm。

输出支座反力、剪力、弯矩、弹性挠度与矩形截面边缘弹性弯曲应力。未进行配筋、稳定、裂缝、构造或规范合规验算。任务、参数和报告中的教学示例应以实际课程要求替换。

## 独立知识库

knowledge/base.json 保存20条带来源的教学整理；base.js 为相同内容的浏览器加载快照。用户导入的知识固定标记待核验，不能覆盖计算内核。本版使用本地关键词检索，未接入开放式大模型或 TeleAgent。

## 安全与第三方许可

上传文字以纯文本呈现，不执行文档指令或宏。DOCX 包含体积、路径、压缩比、展开限额、XML 节点和深度检查。CSP 限制站外连接，脚本与字体均从本站加载。

本仓库不包含本机 MCP 配置、凭据、扫描会话记录或真实课程资料。第三方许可在 licenses/ 中。安全限制不能等同于绝对安全。

## 专业参考

- SymPy Beam：https://docs.sympy.org/latest/modules/physics/continuum_mechanics/beam.html
- SymPy 梁示例：https://docs.sympy.org/latest/tutorials/physics/continuum_mechanics/beam_problems.html
- PyNite（后续扩展候选，尚未集成）：https://github.com/JWock82/Pynite
