import { ItemView, WorkspaceLeaf } from 'obsidian';
import React from 'react';
import ReactDOM from 'react-dom/client';  // 修改导入，使用 react-dom/client

// 定义视图类型常量
export const VIEW_TYPE_PLAYING = "playing-view";

export class PlayingView extends ItemView {
	static VIEW_TYPE = VIEW_TYPE_PLAYING;
	// 保存创建的 React 根对象
	private root: ReactDOM.Root;

	getViewType(): string {
		return PlayingView.VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Playing View";
	}

	async onOpen() {
		// 获取容器元素挂载 React 组件
		const container = this.containerEl.children[1];
		this.root = ReactDOM.createRoot(container);
		this.root.render(React.createElement(PlayingViewReact));
	}

	async onClose() {
		if (this.root) {
			this.root.unmount();
		}
	}
}

// 简单的 React 组件
const PlayingViewReact: React.FC = () => {
	return React.createElement("div", null,
		React.createElement("h1", null, "Playing View"),
		React.createElement("p", null, "这是一个简单的 React 组件。")
	);
};
